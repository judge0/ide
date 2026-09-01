import configuration from "./configuration.js";
import { requireAuthentication, getAuthToken, initAuth } from "./auth.js";
import { sendChatMessage, getInlineCompletion } from "./ai.js";
import {
    DEFAULT_SOURCE,
    DEFAULT_STDIN,
    DEFAULT_COMPILER_OPTIONS,
    DEFAULT_CMD_ARGUMENTS,
    getEditorLanguageMode,
    getLanguageForExtension,
} from "./constants.js";
import {
    decode,
    fetchLanguages,
    buildSubmissionPayload,
    createSubmission,
    pollSubmission,
    Judge0Error,
} from "./api.js";
import {
    createEditor,
    setFontSizeForEditors,
    registerInlineCompletionProvider,
} from "./editors.js";
import { loadState, saveState, debounce } from "./storage.js";
import DOMPurify from 'dompurify';
import marked from 'marked';

function getAuthHeaders() {
    const token = getAuthToken();
    return token ? { Authorization: "Bearer " + token } : {};
}

let fontSize = 13;
let layout;
let currentFileName = "Untitled";

export let sourceEditor;
let stdinEditor;
let stdoutEditor;

let $selectLanguage;
let $compilerOptions;
let $commandLineArguments;
let $runBtn;
let $statusLine;

let timeStart;
let isRunning = false;

const layoutConfig = {
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
                    componentState: { readOnly: false },
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
                                  componentState: { readOnly: false },
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
                                          componentState: { readOnly: false },
                                      }
                                    : null,
                                configuration.get("appOptions.showOutput")
                                    ? {
                                          type: "component",
                                          componentName: "stdout",
                                          id: "stdout",
                                          title: "Output",
                                          isClosable: false,
                                          componentState: { readOnly: true },
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

// --- error display ---------------------------------------------------------

function showError(title, content) {
    $("#judge0-site-modal #title").html(title);
    $("#judge0-site-modal .content").html(content);

    const reportTitle = encodeURIComponent(`Error on ${window.location.href}`);
    const reportBody = encodeURIComponent(
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

function handleRunError(error) {
    const status = error instanceof Judge0Error ? error.status : 0;
    const statusText =
        error instanceof Judge0Error
            ? error.statusText
            : String(error?.message || error);
    const body = error instanceof Judge0Error ? error.body : null;

    showError(
        `${statusText} (${status})`,
        `<pre>${DOMPurify.sanitize(JSON.stringify(body, null, 4) || "")}</pre>`,
    );

    isRunning = false;
    $runBtn.removeClass("loading");

    window.top.postMessage(
        { event: "runError", data: { status, statusText, body } },
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

    isRunning = false;
    $runBtn.removeClass("loading");

    window.top.postMessage(
        {
            event: "postExecution",
            status: data.status,
            time: data.time,
            memory: data.memory,
            output,
        },
        "*",
    );
}

function getSelectedLanguageId() {
    return parseInt($selectLanguage.val(), 10);
}

async function selectLanguageById(languageId) {
    const option = $selectLanguage.find(`[value=${languageId}]`);
    if (option.length) {
        option.prop("selected", true);
        $selectLanguage.trigger("change", {
            skipSetDefaultSourceCodeName: true,
        });
    }
}

// --- FIX: Only one version of this function ---
async function selectLanguageForExtension(extension) {
    const language = getLanguageForExtension(extension);
    await selectLanguageById(language.language_id);
}

async function run() {
    if (isRunning) {
        return;
    }

    if (sourceEditor.getValue().trim() === "") {
        showError("Error", "Source code can't be empty!");
        return;
    }

    isRunning = true;
    $runBtn.addClass("loading");
    stdoutEditor.setValue("");
    $statusLine.html("");

    const stdoutItem = layout.root.getItemsById("stdout")[0];
    stdoutItem.parent.header.parent.setActiveContentItem(stdoutItem);

    const languageId = getSelectedLanguageId();
    const sourceCode = sourceEditor.getValue();
    const stdin = stdinEditor.getValue();
    const compilerOptions = $compilerOptions.val();
    const commandLineArguments = $commandLineArguments.val();

    window.top.postMessage(
        {
            event: "preExecution",
            source_code: sourceCode,
            language_id: languageId,
            stdin,
            compiler_options: compilerOptions,
            command_line_arguments: commandLineArguments,
        },
        "*",
    );

    timeStart = performance.now();

    try {
        const payload = await buildSubmissionPayload({
            languageId,
            sourceCode,
            stdin,
            compilerOptions,
            commandLineArguments,
        });
        const authHeaders = getAuthHeaders();
        const { token, region } = await createSubmission(payload, authHeaders);
        const result = await pollSubmission(
            token,
            (description) => {
                $statusLine.html(description);
            },
            authHeaders,
        );
        handleResult(result);
    } catch (err) {
        handleRunError(err);
    }
}

// --- file open/save ---------------------------------------------------

function setSourceCodeName(name) {
    currentFileName = name;
    $(".lm_title")[0].innerText = name;
}

function getSourceCodeName() {
    return currentFileName;
}

async function openFile(content, filename) {
    clear();
    sourceEditor.setValue(content);
    await selectLanguageForExtension(filename.split(".").pop());
    setSourceCodeName(filename);
    persistState();
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

function setFontSizeForAllEditors(size) {
    fontSize = size;
    setFontSizeForEditors([sourceEditor, stdinEditor, stdoutEditor], size);
}

// --- language loading ---------------------------------------------------

async function loadLanguagesIntoDropdown() {
    let languages;
    try {
        languages = await fetchLanguages();
    } catch (err) {
        handleRunError(err);
        return;
    }

    const options = languages.map((language) => {
        const option = new Option(language.name, language.id);
        option.setAttribute(
            "langauge_mode",
            getEditorLanguageMode(language.name),
        );
        return option;
    });

    $selectLanguage.append(options);
}

// --- FIX: Remove reference to getSelectedLanguage ---
async function loadSelectedLanguage(skipSetDefaultSourceCodeName = false) {
    monaco.editor.setModelLanguage(
        sourceEditor.getModel(),
        $selectLanguage.find(":selected").attr("langauge_mode"),
    );

    // Since we removed flavor, we just set a default name
    if (!skipSetDefaultSourceCodeName) {
        // Use the selected language name for the file
        const selectedText = $selectLanguage.find(":selected").text();
        setSourceCodeName(`Untitled.${selectedText.toLowerCase()}`);
    }
}

// --- persistence ---------------------------------------------------------

function persistState() {
    saveState({
        sourceCode: sourceEditor.getValue(),
        fileName: currentFileName,
        languageId: getSelectedLanguageId(),
        stdin: stdinEditor.getValue(),
        compilerOptions: $compilerOptions.val(),
        commandLineArguments: $commandLineArguments.val(),
    });
}

const persistStateDebounced = debounce(persistState, 500);

function setDefaults() {
    setFontSizeForAllEditors(fontSize);

    const saved = loadState();

    sourceEditor.setValue(saved.sourceCode ?? DEFAULT_SOURCE);
    stdinEditor.setValue(saved.stdin ?? DEFAULT_STDIN);
    $compilerOptions.val(saved.compilerOptions ?? DEFAULT_COMPILER_OPTIONS);
    $commandLineArguments.val(
        saved.commandLineArguments ?? DEFAULT_CMD_ARGUMENTS,
    );

    $statusLine.html("");

    if (saved.languageId) {
        selectLanguageById(saved.languageId).then(() => {
            if (saved.fileName) {
                setSourceCodeName(saved.fileName);
            }
        });
    } else {
        loadSelectedLanguage();
    }
}

function clear() {
    sourceEditor.setValue("");
    stdinEditor.setValue("");
    $compilerOptions.val("");
    $commandLineArguments.val("");
    $statusLine.html("");
}

// --- layout sizing ---------------------------------------------------------

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
    $("[data-content]").popup({ lastResort: "left center" });

    refreshSiteContentHeight();

    $selectLanguage = $("#select-language");
    $selectLanguage.change(function (event, data) {
        const skipSetDefaultSourceCodeName =
            data && data.skipSetDefaultSourceCodeName;
        loadSelectedLanguage(skipSetDefaultSourceCodeName);
        persistState();
    });

    await loadLanguagesIntoDropdown();

    $compilerOptions = $("#compiler-options");
    $commandLineArguments = $("#command-line-arguments");

    $runBtn = $("#run-btn");
    $runBtn.click(run);

    $("#open-file-input").change(function (e) {
        const selectedFile = e.target.files[0];
        if (!selectedFile) {
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            openFile(e.target.result, selectedFile.name);
        };
        reader.onerror = function (e) {
            showError("Error", "Error reading file: " + e.target.error);
        };
        reader.readAsText(selectedFile);
    });

    $statusLine = $("#judge0-status-line");

    $(document).on("keydown", "body", function (e) {
        if (!(e.metaKey || e.ctrlKey)) {
            return;
        }
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
                setFontSizeForAllEditors(fontSize + 1);
                break;
            case "-":
                e.preventDefault();
                setFontSizeForAllEditors(fontSize - 1);
                break;
            case "0":
                e.preventDefault();
                setFontSizeForAllEditors(13);
                break;
            case "`":
                e.preventDefault();
                sourceEditor.focus();
                break;
        }
    });

    require(["vs/editor/editor.main"], function () {
        layout = new GoldenLayout(layoutConfig, $("#judge0-site-content"));

        layout.registerComponent("source", function (container, state) {
            sourceEditor = createEditor(container.getElement()[0], {
                language: "cpp",
                readOnly: state.readOnly,
                minimap: true,
            });

            sourceEditor.addCommand(
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
                run,
            );
            sourceEditor.onDidChangeModelContent(persistStateDebounced);

            registerInlineCompletionProvider({
                getAuthToken,
                getInlineCompletion,
                isInlineSuggestionsEnabled: () =>
                    document.getElementById("judge0-inline-suggestions")
                        .checked,
                isAIAssistantEnabled: () =>
                    configuration.get("appOptions.showAIAssistant"),
                getSelectedChatModel: () =>
                    document.getElementById("judge0-chat-model-select").value,
            });
        });

        layout.registerComponent("stdin", function (container, state) {
            stdinEditor = createEditor(container.getElement()[0], {
                language: "plaintext",
                readOnly: state.readOnly,
                minimap: false,
            });
            stdinEditor.onDidChangeModelContent(persistStateDebounced);
        });

        layout.registerComponent("stdout", function (container, state) {
            stdoutEditor = createEditor(container.getElement()[0], {
                language: "plaintext",
                readOnly: state.readOnly,
                minimap: false,
            });
        });

        layout.registerComponent("ai", function (container) {
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

    $compilerOptions.on("change", persistStateDebounced);
    $commandLineArguments.on("change", persistStateDebounced);

    document
        .getElementById("judge0-chat-form")
        .addEventListener("submit", async function (e) {
            e.preventDefault();

            const input = document.getElementById("judge0-chat-user-input");
            const userMessage = input.value.trim();
            if (!userMessage) {
                return;
            }

            const model = document.getElementById(
                "judge0-chat-model-select",
            ).value;
            const messagesContainer = document.getElementById(
                "judge0-chat-messages",
            );

            const userEl = document.createElement("div");
            userEl.className = "judge0-chat-message judge0-user-message";
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

            const assistantEl = document.createElement("div");
            assistantEl.className = "judge0-chat-message judge0-chat-assistant";

            try {
                const response = await sendChatMessage(messages, model);
                const extractedContent =
                    response?.choices?.[0]?.message?.content ??
                    JSON.stringify(response);
                assistantEl.innerHTML = DOMPurify.sanitize(
                    marked.parse(extractedContent),
                );
            } catch (err) {
                console.warn("Judge0 IDE: chat request failed.", err);
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
                {
                    event: "getResponse",
                    source_code: sourceEditor.getValue(),
                    language_id: getSelectedLanguageId(),
                    stdin: stdinEditor.getValue(),
                    stdout: stdoutEditor.getValue(),
                    compiler_options: $compilerOptions.val(),
                    command_line_arguments: $commandLineArguments.val(),
                },
                "*",
            );
        } else if (e.data.action === "set") {
            if (e.data.source_code) {
                sourceEditor.setValue(e.data.source_code);
            }
            if (e.data.language_id) {
                selectLanguageById(e.data.language_id);
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
                persistState();
            }
        } else if (e.data.action === "run") {
            run();
        }
    };
});
