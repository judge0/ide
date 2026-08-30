// js/auth.js
const API_BASE_URL = 'https://api.apps.skwtr.com/ide/v1';

export function initAuth() {
    const token = localStorage.getItem('skwtr_jwt');

    if (!token) {
        $('#skwtr-login-modal').modal({
            closable: false,
            transition: 'fade up'
        }).modal('show');
    }

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = $('#login-username').val();
        const password = $('#login-password').val();
        const errorDiv = document.getElementById('login-error');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok && data.token) {
                localStorage.setItem('skwtr_jwt', data.token);
                localStorage.setItem('skwtr_role', data.role);
                localStorage.setItem('skwtr_username', username);

                $('#skwtr-login-modal').modal('hide');
                errorDiv.style.display = 'none';

                // Refresh the page to load authenticated content
                window.location.reload();
            } else {
                errorDiv.textContent = data.error || 'Invalid credentials';
                errorDiv.style.display = 'block';
            }
        } catch (err) {
            errorDiv.textContent = 'Network error occurred. Please try again.';
            errorDiv.style.display = 'block';
        }
    });
}

export function getAuthToken() {
    return localStorage.getItem('skwtr_jwt');
}

export function logout() {
    localStorage.removeItem('skwtr_jwt');
    localStorage.removeItem('skwtr_role');
    localStorage.removeItem('skwtr_username');
    window.location.reload();
}

export function requireAuthentication() {
    const token = getAuthToken();
    if (!token) {
        setTimeout(() => {
            $('#skwtr-login-modal').modal({
                closable: false,
                transition: 'fade up'
            }).modal('show');
        }, 500);
        return false;
    }
    return true;
}
