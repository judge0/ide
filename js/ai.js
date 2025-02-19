"use strict";
import theme from "./theme.js";
import configuration from "./configuration.js";
import { sourceEditor } from "./ide.js";

const THREAD = [
    {
        role: "system",
        content: `
You are an AI assistant integrated into an online code editor.
Your main job is to help users with their code, but you should also be able to engage in casual conversation.

The following are your guidelines:
1. **If the user asks for coding help**:
   - Always consider the user's provided code.
   - Analyze the code and provide relevant help (debugging, optimization, explanation, etc.).
   - Make sure to be specific and clear when explaining things about their code.

2. **If the user asks a casual question or makes a casual statement**:
   - Engage in friendly, natural conversation.
   - Do not reference the user's code unless they bring it up or ask for help.
   - Be conversational and polite.

3. **If the user's message is ambiguous or unclear**:
   - Politely ask for clarification or more details to better understand the user's needs.
   - If the user seems confused about something, help guide them toward what they need.

4. **General Behavior**:
   - Always respond in a helpful, friendly, and professional tone.
   - Never assume the user's intent. If unsure, ask clarifying questions.
   - Keep the conversation flowing naturally, even if the user hasn't directly asked about their code.

You will always have access to the user's latest code.
Use this context only when relevant to the user's message.
If their message is unrelated to the code, focus solely on their conversational intent.
        `.trim()
    }
];

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("judge0-chat-form").addEventListener("submit", async function (event) {
        event.preventDefault();

        const userInput = document.getElementById("judge0-chat-user-input");
        const userInputValue = userInput.value.trim();
        if (userInputValue === "") {
            return;
        }

        const sendButton = document.getElementById("judge0-chat-send-button");

        sendButton.classList.add("loading");
        userInput.disabled = true;

        const userMessage = document.createElement("div");
        userMessage.textContent = userInputValue;
        userMessage.classList.add("ui", "message", "judge0-message", "judge0-user-message");
        if (!theme.isLight()) {
            userMessage.classList.add("inverted");
        }

        const messages = document.getElementById("judge0-chat-messages");
        messages.appendChild(userMessage);

        userInput.value = "";
        messages.scrollTop = messages.scrollHeight;

        THREAD.push({
            role: "user",
            content: `
User's code:
${sourceEditor.getValue()}

User's message:
${userInputValue}
`.trim()
        });


        const aiMessage = document.createElement("div");
        aiMessage.classList.add("ui", "basic", "segment", "judge0-message", "loading");
        if (!theme.isLight()) {
            aiMessage.classList.add("inverted");
        }
        messages.appendChild(aiMessage);
        messages.scrollTop = messages.scrollHeight;

        const aiResponse = await puter.ai.chat(THREAD, {
            model: document.getElementById("judge0-chat-model-select").value,
        });
        let aiResponseValue = aiResponse.toString();
        if (typeof aiResponseValue !== "string") {
            aiResponseValue = aiResponseValue.map(v => v.text).join("\n");
        }

        THREAD.push({
            role: "assistant",
            content: aiResponseValue
        });

        aiMessage.innerHTML = DOMPurify.sanitize(aiResponseValue);
        renderMathInElement(aiMessage, {
            delimiters: [
                { left: "\\(", right: "\\)", display: false },
                { left: "\\[", right: "\\]", display: true }
            ]
        });
        aiMessage.innerHTML = marked.parse(aiMessage.innerHTML);

        aiMessage.classList.remove("loading");
        messages.scrollTop = messages.scrollHeight;

        userInput.disabled = false;
        sendButton.classList.remove("loading");
        userInput.focus();
    });

    document.getElementById("judge0-chat-model-select").addEventListener("change", function () {
        const userInput = document.getElementById("judge0-chat-user-input");
        userInput.placeholder = `Message ${this.value}`;
    });
});

document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
            case "p":
                if (!configuration.get("appOptions.showAIAssistant")) {
                    break;
                }
                e.preventDefault();
                document.getElementById("judge0-chat-user-input").focus();
                break;
        }
    }
});
