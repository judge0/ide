import { getAuthToken } from './auth.js';

const API_BASE_URL = 'https://api.apps.skwtr.com/ide/v1';

export async function sendChatMessage(messages, model, stream = false) {
    const token = getAuthToken();

    if (!token) {
        console.error("Unauthorized: Please log in first.");
        return;
    }

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
        window.location.reload();
        return;
    }

    return await response.json();
}

export async function getInlineCompletion(context, model) {
    const token = getAuthToken();

    const response = await fetch(`${API_BASE_URL}/ai/complete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            messages: context,
            model: model,
            stream: false
        })
    });

    return await response.json();
}
