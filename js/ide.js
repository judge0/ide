import configuration from "./configuration.js";
import { requireAuthentication, getAuthToken, initAuth } from "./auth.js";
import { sendChatMessage, getInlineCompletion } from "./ai.js";

const API_KEY = "";

const AUTH_HEADERS = API_KEY
    ? {
          Authorization: `Bearer ${API_KEY}`,
      }
    : {};

const CE = "CE";
const EXTRA_CE = "EXTRA_CE";

const AUTHENTICATED_CE_BASE_URL = "https://ce.judge0.com";
const AUTHENTICATED_EXTRA_CE_BASE_URL = "https://extra-ce.judge0.com";

var AUTHENTICATED_BASE_URL = {};
AUTHENTICATED_BASE_URL[CE] = AUTHENTICATED_CE_BASE_URL;
AUTHENTICATED_BASE_URL[EXTRA_CE] = AUTHENTICATED_EXTRA_CE_BASE_URL;

const UNAUTHENTICATED_CE_BASE_URL = "https://ce.judge0.com";
const UNAUTHENTICATED_EXTRA_CE_BASE_URL = "https://extra-ce.judge0.com";

var UNAUTHENTICATED_BASE_URL = {};
UNAUTHENTICATED_BASE_URL[CE] = UNAUTHENTICATED_CE_BASE_URL;
UNAUTHENTICATED_BASE_URL[EXTRA_CE] = UNAUTHENTICATED_EXTRA_CE_BASE_URL;

const INITIAL_WAIT_TIME_MS = 0;
const WAIT_TIME_FUNCTION = (i) => 100;
const MAX_PROBE_REQUESTS = 600;

var fontSize = 13;

var layout;

export var sourceEditor;
var stdinEditor;
var stdoutEditor;

var $selectLanguage;
var $compilerOptions;
var $commandLineArguments;
var $runBtn;
var $statusLine;

var timeStart;

var sqliteAdditionalFiles;
var languages = {};

var layoutConfig = {
    settings: {
        showPopoutIcon: false,
        reorderEnabled: true,
    },
    content: [
        {
            type: configuration.get("appOptions.mainLayout"),
            content: [
                {
                    type: "component",
                    width: 66,
                    componentName: "source",
                    id: "source",
                    title: "Source Code",
                    isClosable: false,
                    componentState: {
                        readOnly: false,
                    },
                },
                {
                    type: configuration.get("appOptions.assistantLayout"),
                    title: "AI Assistant and I/O",
                    content: [
                        configuration.get("appOptions.showAIAssistant")
                            ? {
                                  type: "component",
                                  height: 66,
                                  componentName: "ai",
                                  id: "ai",
                                  title: "AI Assistant",
                                  isClosable: false,
                                  componentState: {
                                      readOnly: false,
                                  },
                              }
                            : null,
                        {
                            type: configuration.get("appOptions.ioLayout"),
                            title: "I/O",
                            content: [
                                configuration.get("appOptions.showInput")
                                    ? {
                                          type: "component",
                                          componentName: "stdin",
                                          id: "stdin",
                                          title: "Input",
                                          isClosable: false,
                                          componentState: {
                                              readOnly: false,
                                          },
                                      }
                                    : null,
                                configuration.get("appOptions.showOutput")
                                    ? {
                                          type: "component",
                                          componentName: "stdout",
                                          id: "stdout",
                                          title: "Output",
                                          isClosable: false,
                                          componentState: {
                                              readOnly: true,
                                          },
                                      }
                                    : null,
                            ].filter(Boolean),
                        },
                    ].filter(Boolean),
                },
            ],
        },
    ],
};

function encode(str) {
    return btoa(unescape(encodeURIComponent(str || "")));
}

function decode(bytes) {
    var escaped = escape(atob(bytes || ""));
    try {
        return decodeURIComponent(escaped);
    } catch {
        return unescape(escaped);
    }
}

function showError(title, content) {
    $("#judge0-site-modal #title").html(title);
    $("#judge0-site-modal .content").html(content);

    let reportTitle = encodeURIComponent(`Error on ${window.location.href}`);
    let reportBody = encodeURIComponent(
        `**Error Title**: ${title}\n` +
            `**Error Timestamp**: \`${new Date()}\`\n` +
            `**Origin**: ${window.location.href}\n` +
            `**Description**:\n${content}`,
    );

    $("#report-problem-btn").attr(
        "href",
        `https://github.com/judge0/ide/issues/new?title=${reportTitle}&body=${reportBody}`,
    );
    $("#judge0-site-modal").modal("show");
}

function showHttpError(jqXHR) {
    showError(
        `${jqXHR.statusText} (${jqXHR.status})`,
        `<pre>${JSON.stringify(jqXHR, null, 4)}</pre>`,
    );
}

function handleRunError(jqXHR) {
    showHttpError(jqXHR);
    $runBtn.removeClass("loading");

    window.top.postMessage(
        JSON.parse(
            JSON.stringify({
                event: "runError",
                data: jqXHR,
            }),
        ),
        "*",
    );
}

function handleResult(data) {
    const tat = Math.round(performance.now() - timeStart);
    console.log(`It took ${tat}ms to get submission result.`);

    const status = data.status;
    const stdout = decode(data.stdout);
    const compileOutput = decode(data.compile_output);
    const time = data.time === null ? "-" : data.time + "s";
    const memory = data.memory === null ? "-" : data.memory + "KB";

    $statusLine.html(
        `${status.description}, ${time}, ${memory} (TAT: ${tat}ms)`,
    );

    const output = [compileOutput, stdout]
        .filter((x) => x)
        .join("\n")
        .trimEnd();

    stdoutEditor.setValue(output);

    $runBtn.removeClass("loading");

    window.top.postMessage(
        JSON.parse(
            JSON.stringify({
                event: "postExecution",
                status: data.status,
                time: data.time,
                memory: data.memory,
                output: output,
            }),
        ),
        "*",
    );
}

async function getSelectedLanguage() {
    return getLanguage(getSelectedLanguageFlavor(), getSelectedLanguageId());
}

function getSelectedLanguageId() {
    return parseInt($selectLanguage.val());
}

function getSelectedLanguageFlavor() {
    return $selectLanguage.find(":selected").attr("flavor");
}

function run() {
    if (sourceEditor.getValue().trim() === "") {
        showError("Error", "Source code can't be empty!");
        return;
    } else {
        $runBtn.addClass("loading");
    }

    stdoutEditor.setValue("");
    $statusLine.html("");

    let x = layout.root.getItemsById("stdout")[0];
    x.parent.header.parent.setActiveContentItem(x);

    let sourceValue = encode(sourceEditor.getValue());
    let stdinValue = encode(stdinEditor.getValue());
    let languageId = getSelectedLanguageId();
    let compilerOptions = $compilerOptions.val();
    let commandLineArguments = $commandLineArguments.val();

    let flavor = getSelectedLanguageFlavor();

    if (languageId === 44) {
        sourceValue = sourceEditor.getValue();
    }

    let data = {
        source_code: sourceValue,
        language_id: languageId,
        stdin: stdinValue,
        compiler_options: compilerOptions,
        command_line_arguments: commandLineArguments,
        redirect_stderr_to_stdout: true,
    };

    let sendRequest = function (data) {
        window.top.postMessage(
            JSON.parse(
                JSON.stringify({
                    event: "preExecution",
                    source_code: sourceEditor.getValue(),
                    language_id: languageId,
                    flavor: flavor,
                    stdin: stdinEditor.getValue(),
                    compiler_options: compilerOptions,
                    command_line_arguments: commandLineArguments,
                }),
            ),
            "*",
        );

        timeStart = performance.now();
        $.ajax({
            url: `${AUTHENTICATED_BASE_URL[flavor]}/submissions?base64_encoded=true&wait=false`,
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(data),
            headers: AUTH_HEADERS,
            success: function (data, textStatus, request) {
                console.log(`Your submission token is: ${data.token}`);
                let region = request.getResponseHeader("X-Judge0-Region");
                setTimeout(
                    fetchSubmission.bind(null, flavor, region, data.token, 1),
                    INITIAL_WAIT_TIME_MS,
                );
            },
            error: handleRunError,
        });
    };

    if (languageId === 82) {
        if (!sqliteAdditionalFiles) {
            $.ajax({
                url: `./data/additional_files_zip_base64.txt`,
                contentType: "text/plain",
                success: function (responseData) {
                    sqliteAdditionalFiles = responseData;
                    data["additional_files"] = sqliteAdditionalFiles;
                    sendRequest(data);
                },
                error: handleRunError,
            });
        } else {
            data["additional_files"] = sqliteAdditionalFiles;
            sendRequest(data);
        }
    } else {
        sendRequest(data);
    }
}

function fetchSubmission(flavor, region, submission_token, iteration) {
    if (iteration >= MAX_PROBE_REQUESTS) {
        handleRunError(
            {
                statusText: "Maximum number of probe requests reached.",
                status: 504,
            },
            null,
            null,
        );
        return;
    }

    $.ajax({
        url: `${UNAUTHENTICATED_BASE_URL[flavor]}/submissions/${submission_token}?base64_encoded=true`,
        headers: {
            "X-Judge0-Region": region,
        },
        success: function (data) {
            if (data.status.id <= 2) {
                // In Queue or Processing
                $statusLine.html(data.status.description);
                setTimeout(
                    fetchSubmission.bind(
                        null,
                        flavor,
                        region,
                        submission_token,
                        iteration + 1,
                    ),
                    WAIT_TIME_FUNCTION(iteration),
                );
            } else {
                handleResult(data);
            }
        },
        error: handleRunError,
    });
}

function setSourceCodeName(name) {
    $(".lm_title")[0].innerText = name;
}

function getSourceCodeName() {
    return $(".lm_title")[0].innerText;
}

function openFile(content, filename) {
    clear();
    sourceEditor.setValue(content);
    selectLanguageForExtension(filename.split(".").pop());
    setSourceCodeName(filename);
}

function saveFile(content, filename) {
    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

async function openAction() {
    document.getElementById("open-file-input").click();
}

async function saveAction() {
    saveFile(sourceEditor.getValue(), getSourceCodeName());
}

function setFontSizeForAllEditors(fontSize) {
    sourceEditor.updateOptions({ fontSize: fontSize });
    stdinEditor.updateOptions({ fontSize: fontSize });
    stdoutEditor.updateOptions({ fontSize: fontSize });
}

async function loadLangauges() {
    return new Promise((resolve, reject) => {
        let options = [];

        $.ajax({
            url: UNAUTHENTICATED_CE_BASE_URL + "/languages",
            success: function (data) {
                for (let i = 0; i < data.length; i++) {
                    let language = data[i];
                    let option = new Option(language.name, language.id);
                    option.setAttribute("flavor", CE);
                    option.setAttribute(
                        "langauge_mode",
                        getEditorLanguageMode(language.name),
                    );

                    if (language.id !== 89) {
                        options.push(option);
                    }

                    if (language.id === DEFAULT_LANGUAGE_ID) {
                        option.selected = true;
                    }
                }
            },
            error: reject,
        }).always(function () {
            $.ajax({
                url: UNAUTHENTICATED_EXTRA_CE_BASE_URL + "/languages",
                success: function (data) {
                    for (let i = 0; i < data.length; i++) {
                        let language = data[i];
                        let option = new Option(language.name, language.id);
                        option.setAttribute("flavor", EXTRA_CE);
                        option.setAttribute(
                            "langauge_mode",
                            getEditorLanguageMode(language.name),
                        );

                        if (
                            options.findIndex((t) => t.text === option.text) ===
                                -1 &&
                            language.id !== 89
                        ) {
                            options.push(option);
                        }
                    }
                },
                error: reject,
            }).always(function () {
                options.sort((a, b) => a.text.localeCompare(b.text));
                $selectLanguage.append(options);
                resolve();
            });
        });
    });
}

async function loadSelectedLanguage(skipSetDefaultSourceCodeName = false) {
    monaco.editor.setModelLanguage(
        sourceEditor.getModel(),
        $selectLanguage.find(":selected").attr("langauge_mode"),
    );

    if (!skipSetDefaultSourceCodeName) {
        setSourceCodeName((await getSelectedLanguage()).source_file);
    }
}

function selectLanguageByFlavorAndId(languageId, flavor) {
    let option = $selectLanguage.find(
        `[value=${languageId}][flavor=${flavor}]`,
    );
    if (option.length) {
        option.prop("selected", true);
        $selectLanguage.trigger("change", {
            skipSetDefaultSourceCodeName: true,
        });
    }
}

function selectLanguageForExtension(extension) {
    let language = getLanguageForExtension(extension);
    selectLanguageByFlavorAndId(language.language_id, language.flavor);
}

async function getLanguage(flavor, languageId) {
    return new Promise((resolve, reject) => {
        if (languages[flavor] && languages[flavor][languageId]) {
            resolve(languages[flavor][languageId]);
            return;
        }

        $.ajax({
            url: `${UNAUTHENTICATED_BASE_URL[flavor]}/languages/${languageId}`,
            success: function (data) {
                if (!languages[flavor]) {
                    languages[flavor] = {};
                }

                languages[flavor][languageId] = data;
                resolve(data);
            },
            error: reject,
        });
    });
}

function setDefaults() {
    setFontSizeForAllEditors(fontSize);
    sourceEditor.setValue(DEFAULT_SOURCE);
    stdinEditor.setValue(DEFAULT_STDIN);
    $compilerOptions.val(DEFAULT_COMPILER_OPTIONS);
    $commandLineArguments.val(DEFAULT_CMD_ARGUMENTS);

    $statusLine.html("");

    loadSelectedLanguage();
}

function clear() {
    sourceEditor.setValue("");
    stdinEditor.setValue("");
    $compilerOptions.val("");
    $commandLineArguments.val("");

    $statusLine.html("");
}

function refreshSiteContentHeight() {
    const navigationHeight = document.getElementById(
        "judge0-site-navigation",
    ).offsetHeight;

    const siteContent = document.getElementById("judge0-site-content");
    siteContent.style.height = `${window.innerHeight}px`;
    siteContent.style.paddingTop = `${navigationHeight}px`;
}

function refreshLayoutSize() {
    refreshSiteContentHeight();
    layout.updateSize();
}

window.addEventListener("resize", refreshLayoutSize);
document.addEventListener("DOMContentLoaded", async function () {
    initAuth();
    requireAuthentication();

    $(".ui.selection.dropdown").dropdown();
    $("[data-content]").popup({
        lastResort: "left center",
    });

    refreshSiteContentHeight();

    console.log(
        "Hey, Judge0 IDE is open-sourced: https://github.com/judge0/ide. Have fun!",
    );

    $selectLanguage = $("#select-language");
    $selectLanguage.change(function (event, data) {
        let skipSetDefaultSourceCodeName =
            data && data.skipSetDefaultSourceCodeName;
        loadSelectedLanguage(skipSetDefaultSourceCodeName);
    });

    await loadLangauges();

    $compilerOptions = $("#compiler-options");
    $commandLineArguments = $("#command-line-arguments");

    $runBtn = $("#run-btn");
    $runBtn.click(run);

    $("#open-file-input").change(function (e) {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            const reader = new FileReader();
            reader.onload = function (e) {
                openFile(e.target.result, selectedFile.name);
            };

            reader.onerror = function (e) {
                showError("Error", "Error reading file: " + e.target.error);
            };

            reader.readAsText(selectedFile);
        }
    });

    $statusLine = $("#judge0-status-line");

    $(document).on("keydown", "body", function (e) {
        if (e.metaKey || e.ctrlKey) {
            switch (e.key) {
                case "Enter":
                    e.preventDefault();
                    run();
                    break;
                case "s":
                    e.preventDefault();
                    saveAction();
                    break;
                case "o":
                    e.preventDefault();
                    openAction();
                    break;
                case "+":
                case "=":
                    e.preventDefault();
                    fontSize += 1;
                    setFontSizeForAllEditors(fontSize);
                    break;
                case "-":
                    e.preventDefault();
                    fontSize -= 1;
                    setFontSizeForAllEditors(fontSize);
                    break;
                case "0":
                    e.preventDefault();
                    fontSize = 13;
                    setFontSizeForAllEditors(fontSize);
                    break;
                case "`":
                    e.preventDefault();
                    sourceEditor.focus();
                    break;
            }
        }
    });

    require(["vs/editor/editor.main"], function (ignorable) {
        layout = new GoldenLayout(layoutConfig, $("#judge0-site-content"));

        layout.registerComponent("source", function (container, state) {
            sourceEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                scrollBeyondLastLine: true,
                readOnly: state.readOnly,
                language: "cpp",
                minimap: {
                    enabled: true,
                },
            });

            sourceEditor.addCommand(
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                run,
            );

            monaco.languages.registerInlineCompletionsProvider("*", {
                provideInlineCompletions: async (model, position) => {
                    if (
                        !getAuthToken() ||
                        !document.getElementById("judge0-inline-suggestions")
                            .checked ||
                        !configuration.get("appOptions.showAIAssistant")
                    ) {
                        return;
                    }

                    const textBeforeCursor = model.getValueInRange({
                        startLineNumber: 1,
                        startColumn: 1,
                        endLineNumber: position.lineNumber,
                        endColumn: position.column,
                    });

                    const textAfterCursor = model.getValueInRange({
                        startLineNumber: position.lineNumber,
                        startColumn: position.column,
                        endLineNumber: model.getLineCount(),
                        endColumn: model.getLineMaxColumn(model.getLineCount()),
                    });

                    const aiResponse = await getInlineCompletion(
                        [
                            {
                                role: "user",
                                content:
                                    `You are a code completion assistant. Given the following context, generate the most likely code completion.

                    ### Code Before Cursor:
                    ${textBeforeCursor}

                    ### Code After Cursor:
                    ${textAfterCursor}

                    ### Instructions:
                    - Predict the next logical code segment.
                    - Ensure the suggestion is syntactically and contextually correct.
                    - Keep the completion concise and relevant.
                    - Do not repeat existing code.
                    - Provide only the missing code.
                    - **Respond with only the code, without markdown formatting.**
                    - **Do not include triple backticks (\`\`\`) or additional explanations.**

                    ### Completion:`.trim(),
                            },
                        ],
                        document.getElementById("judge0-chat-model-select")
                            .value,
                    );

                    let aiResponseValue = aiResponse?.toString().trim() || "";

                    if (Array.isArray(aiResponseValue)) {
                        aiResponseValue = aiResponseValue
                            .map((v) => v.text)
                            .join("\n")
                            .trim();
                    }

                    if (!aiResponseValue || aiResponseValue.length === 0) {
                        return;
                    }

                    return {
                        items: [
                            {
                                insertText: aiResponseValue,
                                range: new monaco.Range(
                                    position.lineNumber,
                                    position.column,
                                    position.lineNumber,
                                    position.column,
                                ),
                            },
                        ],
                    };
                },
                handleItemDidShow: () => {},
                freeInlineCompletions: () => {},
            });
        });

        layout.registerComponent("stdin", function (container, state) {
            stdinEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "plaintext",
                minimap: {
                    enabled: false,
                },
            });
        });

        layout.registerComponent("stdout", function (container, state) {
            stdoutEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "plaintext",
                minimap: {
                    enabled: false,
                },
            });
        });

        layout.registerComponent("ai", function (container, state) {
            container
                .getElement()[0]
                .appendChild(document.getElementById("judge0-chat-container"));
        });

        layout.on("initialised", function () {
            setDefaults();
            refreshLayoutSize();
            window.top.postMessage({ event: "initialised" }, "*");
        });

        layout.init();
    });

    let superKey = "⌘";
    if (!/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)) {
        superKey = "Ctrl";
    }

    [$runBtn].forEach((btn) => {
        btn.attr("data-content", `${superKey}${btn.attr("data-content")}`);
    });

    document.querySelectorAll(".description").forEach((e) => {
        e.innerText = `${superKey}${e.innerText}`;
    });

    document
        .getElementById("judge0-open-file-btn")
        .addEventListener("click", openAction);
    document
        .getElementById("judge0-save-btn")
        .addEventListener("click", saveAction);

    document
        .getElementById("judge0-chat-form")
        .addEventListener("submit", async function (e) {
            e.preventDefault();

            const input = document.getElementById("judge0-chat-user-input");
            const userMessage = input.value.trim();
            if (!userMessage) return;

            const model = document.getElementById(
                "judge0-chat-model-select",
            ).value;
            const messagesContainer = document.getElementById(
                "judge0-chat-messages",
            );

            const userEl = document.createElement("div");
            userEl.className = "judge0-chat-message judge0-chat-user";
            userEl.textContent = userMessage;
            messagesContainer.appendChild(userEl);

            input.value = "";
            input.disabled = true;

            const messages = [
                {
                    role: "user",
                    content: `Current code:\n\`\`\`\n${sourceEditor.getValue()}\n\`\`\`\n\n${userMessage}`,
                },
            ];

            const response = await sendChatMessage(messages, model);

            const assistantEl = document.createElement("div");
            assistantEl.className = "judge0-chat-message judge0-chat-assistant";

            if (response) {
                const text =
                    response.response ||
                    response.content ||
                    response.message ||
                    JSON.stringify(response);
                assistantEl.innerHTML = DOMPurify.sanitize(marked.parse(text));
            } else {
                assistantEl.textContent = "Error: no response.";
            }

            messagesContainer.appendChild(assistantEl);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;

            input.disabled = false;
            input.focus();
        });

    window.onmessage = function (e) {
        if (!e.data) {
            return;
        }

        if (e.data.action === "get") {
            window.top.postMessage(
                JSON.parse(
                    JSON.stringify({
                        event: "getResponse",
                        source_code: sourceEditor.getValue(),
                        language_id: getSelectedLanguageId(),
                        flavor: getSelectedLanguageFlavor(),
                        stdin: stdinEditor.getValue(),
                        stdout: stdoutEditor.getValue(),
                        compiler_options: $compilerOptions.val(),
                        command_line_arguments: $commandLineArguments.val(),
                    }),
                ),
                "*",
            );
        } else if (e.data.action === "set") {
            if (e.data.source_code) {
                sourceEditor.setValue(e.data.source_code);
            }
            if (e.data.language_id && e.data.flavor) {
                selectLanguageByFlavorAndId(e.data.language_id, e.data.flavor);
            }
            if (e.data.stdin) {
                stdinEditor.setValue(e.data.stdin);
            }
            if (e.data.stdout) {
                stdoutEditor.setValue(e.data.stdout);
            }
            if (e.data.compiler_options) {
                $compilerOptions.val(e.data.compiler_options);
            }
            if (e.data.command_line_arguments) {
                $commandLineArguments.val(e.data.command_line_arguments);
            }
            if (e.data.api_key) {
                AUTH_HEADERS["Authorization"] = `Bearer ${e.data.api_key}`;
            }
        } else if (e.data.action === "run") {
            run();
        }
    };
});

const DEFAULT_SOURCE =
    '\
public class Main {\n\
    public static void main(String[] args) {\n\
        System.out.println("Hello, World!");\n\
    }\n\
}\n\
';

const DEFAULT_STDIN = "";
const DEFAULT_COMPILER_OPTIONS = "";
const DEFAULT_CMD_ARGUMENTS = "";
const DEFAULT_LANGUAGE_ID = 91;

function getEditorLanguageMode(languageName) {
    const DEFAULT_EDITOR_LANGUAGE_MODE = "plaintext";
    const LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE = {
        Bash: "shell",
        C: "c",
        C3: "c",
        "C#": "csharp",
        "C++": "cpp",
        Clojure: "clojure",
        "F#": "fsharp",
        Go: "go",
        Java: "java",
        JavaScript: "javascript",
        Kotlin: "kotlin",
        "Objective-C": "objective-c",
        Pascal: "pascal",
        Perl: "perl",
        PHP: "php",
        Python: "python",
        R: "r",
        Ruby: "ruby",
        SQL: "sql",
        Swift: "swift",
        TypeScript: "typescript",
        "Visual Basic": "vb",
    };

    for (let key in LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE) {
        if (languageName.toLowerCase().startsWith(key.toLowerCase())) {
            return LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE[key];
        }
    }
    return DEFAULT_EDITOR_LANGUAGE_MODE;
}

const EXTENSIONS_TABLE = {
    asm: { flavor: CE, language_id: 45 }, // Assembly (NASM 2.14.02)
    c: { flavor: CE, language_id: 103 }, // C (GCC 14.1.0)
    cpp: { flavor: CE, language_id: 105 }, // C++ (GCC 14.1.0)
    cs: { flavor: EXTRA_CE, language_id: 29 }, // C# (.NET Core SDK 7.0.400)
    go: { flavor: CE, language_id: 95 }, // Go (1.18.5)
    java: { flavor: CE, language_id: 91 }, // Java (JDK 17.0.6)
    js: { flavor: CE, language_id: 102 }, // JavaScript (Node.js 22.08.0)
    lua: { flavor: CE, language_id: 64 }, // Lua (5.3.5)
    pas: { flavor: CE, language_id: 67 }, // Pascal (FPC 3.0.4)
    php: { flavor: CE, language_id: 98 }, // PHP (8.3.11)
    py: { flavor: EXTRA_CE, language_id: 25 }, // Python for ML (3.11.2)
    r: { flavor: CE, language_id: 99 }, // R (4.4.1)
    rb: { flavor: CE, language_id: 72 }, // Ruby (2.7.0)
    rs: { flavor: CE, language_id: 73 }, // Rust (1.40.0)
    scala: { flavor: CE, language_id: 81 }, // Scala (2.13.2)
    sh: { flavor: CE, language_id: 46 }, // Bash (5.0.0)
    swift: { flavor: CE, language_id: 83 }, // Swift (5.2.3)
    ts: { flavor: CE, language_id: 101 }, // TypeScript (5.6.2)
    txt: { flavor: CE, language_id: 43 }, // Plain Text
};

function getLanguageForExtension(extension) {
    return EXTENSIONS_TABLE[extension] || { flavor: CE, language_id: 43 }; // Plain Text (https://ce.judge0.com/languages/43)
}
