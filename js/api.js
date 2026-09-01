import {
    LANGUAGE_ID,
    POLL,
    CODE_API_BASE_URL,
} from "./constants.js";

export function encode(str) {
    return btoa(unescape(encodeURIComponent(str || "")));
}

export function decode(bytes) {
    const escaped = escape(atob(bytes || ""));
    try {
        return decodeURIComponent(escaped);
    } catch {
        return unescape(escaped);
    }
}

export class Judge0Error extends Error {
    constructor(status, statusText, body) {
        super(`${statusText} (${status})`);
        this.name = "Judge0Error";
        this.status = status;
        this.statusText = statusText;
        this.body = body;
    }
}

async function toJudge0Error(response) {
    let body = null;
    try {
        body = await response.json();
    } catch {
        try {
            body = await response.text();
        } catch {
            body = null;
        }
    }
    return new Judge0Error(response.status, response.statusText, body);
}

export function networkError(cause) {
    return new Judge0Error(0, "Network error", { message: String(cause) });
}

export async function fetchLanguages() {
    let response;
    try {
        response = await fetch(`${CODE_API_BASE_URL}/languages`);
    } catch (err) {
        throw networkError(err);
    }
    if (!response.ok) {
        throw await toJudge0Error(response);
    }

    const data = await response.json();
    return data
        .filter(language => language.id !== LANGUAGE_ID.EXCLUDED)
        .sort((a, b) => a.name.localeCompare(b.name));
}

let sqliteAdditionalFilesCache = null;

export async function getSqliteAdditionalFiles() {
    if (sqliteAdditionalFilesCache) {
        return sqliteAdditionalFilesCache;
    }
    let response;
    try {
        response = await fetch("./data/additional_files_zip_base64.txt");
    } catch (err) {
        throw networkError(err);
    }
    if (!response.ok) {
        throw await toJudge0Error(response);
    }
    sqliteAdditionalFilesCache = await response.text();
    return sqliteAdditionalFilesCache;
}

export async function buildSubmissionPayload({
    languageId,
    sourceCode,
    stdin,
    compilerOptions,
    commandLineArguments,
}) {
    const payload = {
        source_code:
            languageId === LANGUAGE_ID.MULTI_FILE
                ? sourceCode
                : encode(sourceCode),
        language_id: languageId,
        stdin: encode(stdin),
        compiler_options: compilerOptions,
        command_line_arguments: commandLineArguments,
        redirect_stderr_to_stdout: true,
    };

    if (languageId === LANGUAGE_ID.SQLITE) {
        payload.additional_files = await getSqliteAdditionalFiles();
    }

    return payload;
}

// ✅ Simplified - no flavor parameter needed
export async function createSubmission(payload, authHeaders = {}) {
    let response;
    try {
        response = await fetch(`${CODE_API_BASE_URL}/run`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...authHeaders,
            },
            body: JSON.stringify(payload),
        });
    } catch (err) {
        throw networkError(err);
    }
    if (!response.ok) {
        throw await toJudge0Error(response);
    }

    const data = await response.json();
    // Region might not be needed anymore since we use unified API
    const region = response.headers.get("X-Judge0-Region");
    return { token: data.token, region };
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextBackoffMs(currentMs) {
    return Math.min(currentMs * POLL.BACKOFF_FACTOR, POLL.BACKOFF_MAX_MS);
}

export async function pollSubmission(token, onStatusUpdate, authHeaders = {}) {
    let waitMs = POLL.BACKOFF_START_MS;

    for (let i = 0; i < POLL.MAX_REQUESTS; i++) {
        let response;
        try {
            response = await fetch(`${CODE_API_BASE_URL}/status/${encodeURIComponent(token)}`, {
                headers: authHeaders,
            });
        } catch (err) {
            throw networkError(err);
        }
        if (!response.ok) {
            throw await toJudge0Error(response);
        }

        const data = await response.json();

        if (data.status.id > 2) {
            return data;
        }

        if (onStatusUpdate) {
            onStatusUpdate(data.status.description);
        }

        await sleep(waitMs);
        waitMs = nextBackoffMs(waitMs);
    }

    throw new Judge0Error(
        504,
        "Maximum number of probe requests reached.",
        null,
    );
}
