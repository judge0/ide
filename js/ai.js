import { getAuthToken } from './auth.js';

const API_BASE_URL = 'https://api.apps.skwtr.com/ide/v1';

export async function sendChatMessage(messages, model, stream = false) {
    const token = getAuthToken();

    if (!token) {
        console.error("Unauthorized: Please log in first.");
        $('#skwtr-login-modal').modal('show');
        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                messages: messages,
                model: model,
                stream: stream
            })
        });

        if (response.status === 401) {
            localStorage.removeItem('skwtr_jwt');
            localStorage.removeItem('skwtr_role');
            localStorage.removeItem('skwtr_username');
            $('#skwtr-login-modal').modal('show');
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Chat error:', error);
        return null;
    }
}

export async function getInlineCompletion(textBeforeCursor, textAfterCursor, model) {
    const token = getAuthToken();
    if (!token) return null;

    try {
        const response = await fetch(`${API_BASE_URL}/ai/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                model: model,
                prompt: textBeforeCursor,
                suffix: textAfterCursor,
                stream: false,
                options: { temperature: 0.1, num_predict: 64 }
            })
        });

        if (response.status === 401) {
            localStorage.clear();
            $('#skwtr-login-modal').modal('show');
            return null;
        }

        if (!response.ok) return null;

        const data = await response.json();
        return data?.response || null;
    } catch (error) {
        console.error('Inline completion error:', error);
        return null;
    }
}
