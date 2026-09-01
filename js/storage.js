const STORAGE_KEY = "judge0-ide:state:v1";

const DEFAULT_STATE = {
    sourceCode: null,
    fileName: null,
    languageId: null,
    stdin: null,
    compilerOptions: null,
    commandLineArguments: null,
};

function isStorageAvailable() {
    try {
        const testKey = "__judge0_storage_test__";
        window.localStorage.setItem(testKey, "1");
        window.localStorage.removeItem(testKey);
        return true;
    } catch {
        return false;
    }
}

const STORAGE_AVAILABLE = isStorageAvailable();

export function loadState() {
    if (!STORAGE_AVAILABLE) {
        return { ...DEFAULT_STATE };
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return { ...DEFAULT_STATE };
        }
        return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    } catch (err) {
        console.warn("Judge0 IDE: failed to read saved state, ignoring.", err);
        return { ...DEFAULT_STATE };
    }
}

export function saveState(partial) {
    if (!STORAGE_AVAILABLE) {
        return;
    }

    try {
        const current = loadState();
        const next = { ...current, ...partial };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
        console.warn("Judge0 IDE: failed to save state.", err);
    }
}

export function clearState() {
    if (!STORAGE_AVAILABLE) {
        return;
    }

    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
        console.warn("Judge0 IDE: failed to clear saved state.", err);
    }
}

export function debounce(fn, waitMs) {
    let timeoutId = null;
    return (...args) => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            timeoutId = null;
            fn(...args);
        }, waitMs);
    };
}
