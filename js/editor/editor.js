"use strict";
import configuration from "../configuration.js";

const DEFAULT_EDITOR_LANGUAGE_MODE = "plaintext";

const LANGUAGE_NAME_TO_EDITOR_LANGUAGE_MODE = {
    "Bash": "shell",
    "C": "c",
    "C#": "csharp",
    "C++": "cpp",
    "C3": "c",
    "Clojure": "clojure",
    "F#": "fsharp",
    "Go": "go",
    "Java": "java",
    "JavaScript": "javascript",
    "Kotlin": "kotlin",
    "Objective-C": "objective-c",
    "PHP": "php",
    "Pascal": "pascal",
    "Perl": "perl",
    "Python": "python",
    "R": "r",
    "Ruby": "ruby",
    "SQL": "sql",
    "Swift": "swift",
    "TypeScript": "typescript",
    "Visual Basic": "vb"
};

const LAYOUT_CONFIG = {
    settings: {
        showPopoutIcon: false,
        reorderEnabled: true
    },
    content: [{
        type: configuration.getConfig().appOptions.mainLayout,
        content: [{
            type: "component",
            componentName: "source",
            id: "source",
            title: "Source Code",
            isClosable: false,
            componentState: {
                readOnly: false
            }
        }, configuration.getConfig().appOptions.showAIAssistant || configuration.getConfig().appOptions.showInput || configuration.getConfig().appOptions.showOutput ? {
            type: configuration.getConfig().appOptions.assistantLayout,
            title: "AI Assistant and I/O",
            width: 33,
            height: 33,
            content: [configuration.getConfig().appOptions.showAIAssistant ? {
                type: "component",
                componentName: "ai",
                id: "ai",
                title: "AI Assistant",
                isClosable: false,
                componentState: {
                    readOnly: false
                }
            } : null, configuration.getConfig().appOptions.showInput || configuration.getConfig().appOptions.showOutput ? {
                type: configuration.getConfig().appOptions.ioLayout,
                title: "I/O",
                width: 33,
                height: 33,
                content: [
                    configuration.getConfig().appOptions.showInput ? {
                        type: "component",
                        componentName: "stdin",
                        id: "stdin",
                        title: "Input",
                        isClosable: false,
                        componentState: {
                            readOnly: false
                        }
                    } : null, configuration.getConfig().appOptions.showOutput ? {
                        type: "component",
                        componentName: "stdout",
                        id: "stdout",
                        title: "Output",
                        isClosable: false,
                        componentState: {
                            readOnly: true
                        }
                    } : null].filter(Boolean)
            } : null].filter(Boolean)
        } : null].filter(Boolean)
    }]
};

const INITIALIZE_CALLBACK_QUEUE = [];

var gSelectLanguageElement;
var gSelectLanguageValueElement;

const editor = {
    layout: null,
    sourceEditor: null,
    stdinEditor: null,
    stdoutEditor: null,
    compilerOptions: null,
    commandLineArguments: null,
    onInitialized: callback => {
        if (editor.layout && editor.layout.isInitialised) {
            callback();
        } else {
            INITIALIZE_CALLBACK_QUEUE.push(callback);
        }
    },
    getSelectedFlavor: () => {
        return gSelectLanguageValueElement.getAttribute("data-judge0-flavor");
    },
    getSelectedLanguageId: () => {
        return gSelectLanguageValueElement.getAttribute("data-judge0-language-id");
    },
    getSelectedLangaugeName: () => {
        return gSelectLanguageValueElement.textContent;
    },
    selectLanguage: (flavor, languageId) => {
        const option = gSelectLanguageElement.querySelector(`.judge0-dropdown-option[data-judge0-flavor="${flavor}"][data-judge0-language-id="${languageId}"]`);
        if (option) {
            option.click();
        }
    },
    resolveEditorLanguageMode: languageName => {
        for (let key in LANGUAGE_NAME_TO_EDITOR_LANGUAGE_MODE) {
            if (languageName.toLowerCase().startsWith(key.toLowerCase())) {
                return LANGUAGE_NAME_TO_EDITOR_LANGUAGE_MODE[key];
            }
        }
        return DEFAULT_EDITOR_LANGUAGE_MODE;
    },
    setEditorLanguageMode: languageName => {
        monaco.editor.setModelLanguage(editor.sourceEditor.getModel(), editor.resolveEditorLanguageMode(languageName));
    }
};

export default editor;

document.addEventListener("DOMContentLoaded", () => {
    editor.compilerOptions = document.getElementById("judge0-compiler-options");
    editor.commandLineArguments = document.getElementById("judge0-command-line-arguments");

    gSelectLanguageElement = document.getElementById("judge0-select-language");
    gSelectLanguageValueElement = gSelectLanguageElement.querySelector(".judge0-dropdown-value");

    new MutationObserver(() => {
        editor.setEditorLanguageMode(editor.getSelectedLangaugeName());
    }).observe(gSelectLanguageValueElement, { childList: true, subtree: false });

    require(["vs/editor/editor.main"], () => {
        editor.layout = new GoldenLayout(LAYOUT_CONFIG, document.getElementsByTagName("main")[0]);

        editor.layout.registerComponent("source", function (container, state) {
            editor.sourceEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                scrollBeyondLastLine: true,
                readOnly: state.readOnly,
                language: "plaintext",
                minimap: {
                    enabled: configuration.getConfig().appOptions.showMinimap
                }
            });

            // editor.sourceEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, run);

            // monaco.languages.registerInlineCompletionsProvider('*', {
            //     provideInlineCompletions: async (model, position) => {
            //         if (!puter.auth.isSignedIn() || !document.getElementById("judge0-inline-suggestions").checked || !configuration.get("appOptions.showAIAssistant")) {
            //             return;
            //         }

            //         const textBeforeCursor = model.getValueInRange({
            //             startLineNumber: 1,
            //             startColumn: 1,
            //             endLineNumber: position.lineNumber,
            //             endColumn: position.column
            //         });

            //         const textAfterCursor = model.getValueInRange({
            //             startLineNumber: position.lineNumber,
            //             startColumn: position.column,
            //             endLineNumber: model.getLineCount(),
            //             endColumn: model.getLineMaxColumn(model.getLineCount())
            //         });

            //         const aiResponse = await puter.ai.chat([{
            //             role: "user",
            //             content: `You are a code completion assistant. Given the following context, generate the most likely code completion.

            //         ### Code Before Cursor:
            //         ${textBeforeCursor}

            //         ### Code After Cursor:
            //         ${textAfterCursor}

            //         ### Instructions:
            //         - Predict the next logical code segment.
            //         - Ensure the suggestion is syntactically and contextually correct.
            //         - Keep the completion concise and relevant.
            //         - Do not repeat existing code.
            //         - Provide only the missing code.
            //         - **Respond with only the code, without markdown formatting.**
            //         - **Do not include triple backticks (\`\`\`) or additional explanations.**

            //         ### Completion:`.trim()
            //         }], {
            //             model: document.getElementById("judge0-chat-model-select").value,
            //         });

            //         let aiResponseValue = aiResponse?.toString().trim() || "";

            //         if (Array.isArray(aiResponseValue)) {
            //             aiResponseValue = aiResponseValue.map(v => v.text).join("\n").trim();
            //         }

            //         if (!aiResponseValue || aiResponseValue.length === 0) {
            //             return;
            //         }

            //         return {
            //             items: [{
            //                 insertText: aiResponseValue,
            //                 range: new monaco.Range(
            //                     position.lineNumber,
            //                     position.column,
            //                     position.lineNumber,
            //                     position.column
            //                 )
            //             }]
            //         };
            //     },
            //     handleItemDidShow: () => { },
            //     freeInlineCompletions: () => { }
            // });
        });

        editor.layout.registerComponent("stdin", function (container, state) {
            editor.stdinEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "plaintext",
                minimap: {
                    enabled: false
                }
            });
        });

        editor.layout.registerComponent("stdout", function (container, state) {
            editor.stdoutEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "plaintext",
                minimap: {
                    enabled: false
                }
            });
        });

        editor.layout.registerComponent("ai", function (container, state) {
            // container.getElement()[0].appendChild(document.getElementById("judge0-chat-container"));
        });

        editor.layout.on("initialised", () => {
            while (INITIALIZE_CALLBACK_QUEUE.length) {
                INITIALIZE_CALLBACK_QUEUE.shift()();
            }
            window.top.postMessage({ event: "initialised" }, "*");
        });

        window.addEventListener("resize", () => {
            editor.layout.updateSize();
        });

        editor.layout.init();
    });
});
