// Chat interface component
class AIChat {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById("judge0-chat-form").addEventListener("submit", async (event) => {
            event.preventDefault();

            const userInput = document.getElementById("judge0-chat-user-input");
            const userInputValue = userInput.value.trim();
            if (userInputValue === "") {
                return;
            }

            const sendButton = document.getElementById("judge0-chat-send-button");
            const messages = document.getElementById("judge0-chat-messages");
            
            // Disable input and show loading state
            sendButton.classList.add("loading");
            userInput.disabled = true;

            // Display user message
            const userMessage = document.createElement("div");
            userMessage.innerText = userInputValue;
            userMessage.classList.add("ui", "message", "judge0-message", "judge0-user-message");
            if (!theme.isLight()) {
                userMessage.classList.add("inverted");
            }
            messages.appendChild(userMessage);

            // Clear input and scroll
            userInput.value = "";
            messages.scrollTop = messages.scrollHeight;

            // Create AI message placeholder
            const aiMessage = document.createElement("div");
            aiMessage.classList.add("ui", "basic", "segment", "judge0-message", "loading");
            if (!theme.isLight()) {
                aiMessage.classList.add("inverted");
            }
            messages.appendChild(aiMessage);
            messages.scrollTop = messages.scrollHeight;

            try {
                // Get current code context
                const currentCode = sourceEditor.getValue();
                
                // Create context-aware prompt
                const prompt = `Current code:\n${currentCode}\n\nUser message: ${userInputValue}`;
                
                // Use Puter AI API
                const aiResponse = await puter.ai.chat([{
                    role: "user",
                    content: prompt
                }], {
                    model: document.getElementById("judge0-chat-model-select").value,
                });

                // Process response
                let aiResponseValue = typeof aiResponse === "string" ? aiResponse : aiResponse.map(v => v.text).join("\n");
                
                // Display response with markdown formatting
                aiMessage.innerHTML = DOMPurify.sanitize(marked.parse(aiResponseValue));
                
                // Render any math expressions
                renderMathInElement(aiMessage, {
                    delimiters: [
                        { left: "\\(", right: "\\)", display: false },
                        { left: "\\[", right: "\\]", display: true }
                    ]
                });
            } catch (error) {
                console.error('Chat error:', error);
                aiMessage.innerText = "I encountered an error processing your request. Please try again.";
            } finally {
                // Reset UI state
                aiMessage.classList.remove("loading");
                messages.scrollTop = messages.scrollHeight;
                userInput.disabled = false;
                sendButton.classList.remove("loading");
                userInput.focus();
            }
        });
    }

    // Add keyboard shortcut for chat focus
    setupKeyboardShortcuts() {
        document.addEventListener("keydown", function(e) {
            if ((e.metaKey || e.ctrlKey) && e.key === "p") {
                if (configuration.get("appOptions.showAIAssistant")) {
                    e.preventDefault();
                    document.getElementById("judge0-chat-user-input").focus();
                }
            }
        });
    }
}

// Initialize chat when document is ready
document.addEventListener("DOMContentLoaded", () => {
    const chat = new AIChat();
    chat.setupKeyboardShortcuts();
});


// Configure Monaco Editor with inline suggestions
require(["vs/editor/editor.main"], function() {
    // Register inline suggestions provider for all languages
    monaco.languages.registerInlineCompletionsProvider('*', {
        provideInlineCompletions: async (model, position, context) => {
            if (!puter.auth.isSignedIn() || 
                !document.getElementById("judge0-inline-suggestions").checked || 
                !configuration.get("appOptions.showAIAssistant")) {
                return;
            }

            // Get text before and after cursor for context
            const textBeforeCursor = model.getValueInRange({
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column
            });

            const textAfterCursor = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: model.getLineCount(),
                endColumn: model.getLineMaxColumn(model.getLineCount())
            });

            try {
                // Get AI suggestion using Puter API
                const aiResponse = await puter.ai.chat([{
                    role: "user",
                    content: `You are a code completion assistant. Given the following context, generate the most likely code completion.

                    ### Code Before Cursor:
                    ${textBeforeCursor}

                    ### Code After Cursor:
                    ${textAfterCursor}

                    ### Instructions:
                    - Predict the next logical code segment
                    - Ensure the suggestion is syntactically and contextually correct
                    - Keep the completion concise and relevant
                    - Do not repeat existing code
                    - Provide only the missing code
                    - **Respond with only the code, without markdown formatting**
                    - **Do not include triple backticks (\`\`\`) or additional explanations**

                    ### Completion:`.trim()
                }], {
                    model: document.getElementById("judge0-chat-model-select").value,
                });

                // Process the response
                let aiResponseValue = aiResponse?.toString().trim() || "";
                if (Array.isArray(aiResponseValue)) {
                    aiResponseValue = aiResponseValue.map(v => v.text).join("\n").trim();
                }

                if (!aiResponseValue || aiResponseValue.length === 0) {
                    return;
                }

                // Return the suggestion
                return {
                    items: [{
                        insertText: aiResponseValue,
                        range: {
                            startLineNumber: position.lineNumber,
                            startColumn: position.column,
                            endLineNumber: position.lineNumber,
                            endColumn: position.column
                        }
                    }]
                };
            } catch (error) {
                console.error('Inline suggestion error:', error);
                return null;
            }
        },
        
        // Required but can be empty for basic implementation
        handleItemDidShow: () => {},
        handleItemDidHide: () => {},
        freeInlineCompletions: () => {}
    });

    // Add UI toggle for inline suggestions
    const settingsContainer = document.querySelector('.settings-container');
    if (settingsContainer) {
        const toggleDiv = document.createElement('div');
        toggleDiv.className = 'ui toggle checkbox';
        toggleDiv.innerHTML = `
            <input type="checkbox" id="judge0-inline-suggestions" checked>
            <label>Enable AI inline suggestions</label>
        `;
        settingsContainer.appendChild(toggleDiv);
    }
});

// Update the editor configuration with inline suggestions enabled
const editorConfig = {
    value: '// Start coding here...',
    language: 'javascript',
    theme: 'vs-dark',
    automaticLayout: true,
    inlineSuggest: {
        enabled: true,
        mode: 'subword'
    },
    // Other existing editor options...
    minimap: {
        enabled: true
    }
};

// Create editor with updated configuration
sourceEditor = monaco.editor.create(container.getElement()[0], editorConfig);

// Add keyboard shortcut for accepting suggestions
sourceEditor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Tab, () => {
    // Accept the current inline suggestion if present
    const controller = sourceEditor.getContribution('editor.contrib.inlineSuggestionController');
    if (controller) {
        controller.accept();
    }
});