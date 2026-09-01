import * as monaco from 'monaco-editor';

export function createEditor(container, { language, readOnly, minimap }) {
    return monaco.editor.create(container, {
        automaticLayout: true,
        scrollBeyondLastLine: !!minimap,
        readOnly: !!readOnly,
        language,
        minimap: { enabled: !!minimap },
    });
}

export function setFontSizeForEditors(editors, fontSize) {
    editors.forEach((editor) => editor?.updateOptions({ fontSize }));
}

function extractCompletionText(aiResponse) {
    let value = "";

    if (Array.isArray(aiResponse)) {
        value = aiResponse
            .map((v) => (typeof v === "string" ? v : v?.text || v?.content || ""))
            .join("\n")
            .trim();
    } else if (typeof aiResponse === "string") {
        value = aiResponse.trim();
    } else if (aiResponse && typeof aiResponse === "object") {
        value = (
            aiResponse.content ||
            aiResponse.text ||
            aiResponse.message?.content ||
            ""
        ).trim();
    }

    return value
        .replace(/^```[a-zA-Z0-9_-]*\s*/, "")
        .replace(/\s*```$/, "")
        .replace(/^Completion:\s*/i, "")
        .trim();
}

// Registers the inline (ghost-text) completion provider on the source
// editor. `deps` is injected so this module doesn't need to import
// auth.js/ai.js/configuration.js directly, which makes it easy to test or
// swap out in isolation.
export function registerInlineCompletionProvider(deps) {
    const {
        getAuthToken,
        getInlineCompletion,
        isInlineSuggestionsEnabled,
        isAIAssistantEnabled,
        getSelectedChatModel,
    } = deps;

    return monaco.languages.registerInlineCompletionsProvider("*", {
        provideInlineCompletions: async (model, position) => {
            if (
                !getAuthToken() ||
                !isInlineSuggestionsEnabled() ||
                !isAIAssistantEnabled()
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

            let aiResponse;
            try {
                aiResponse = await getInlineCompletion(
                    textBeforeCursor,
                    textAfterCursor,
                    getSelectedChatModel(),
                );
            } catch (err) {
                console.warn("Judge0 IDE: inline completion request failed.", err);
                return;
            }

            const text = extractCompletionText(aiResponse);
            if (!text) {
                return;
            }

            return {
                items: [
                    {
                        insertText: text,
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
}
