const API_BASE_URL = 'https://api.apps.skwtr.com/ide/v1';

export function initAuth() {
    const token = localStorage.getItem('skwtr_jwt');

    if (!token) {
        $('#skwtr-login-modal').modal({
            closable: false,
            transition: 'fade up'
        }).modal('show');
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.removeEventListener('submit', handleLogin);
        loginForm.addEventListener('submit', handleLogin);
    }
}

async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');

    errorDiv.style.display = 'none';
    errorDiv.textContent = '';

    if (!username || !password) {
        errorDiv.textContent = 'Please enter both username and password';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                username: username.trim(),
                password: password
            })
        });

        const data = await response.json();

        if (response.ok && data.token) {
            localStorage.setItem('skwtr_jwt', data.token);
            localStorage.setItem('skwtr_role', data.role || 'user');
            localStorage.setItem('skwtr_username', data.username || username);

            $('#skwtr-login-modal').modal('hide');

            document.getElementById('login-password').value = '';

            console.log('Login successful');
        } else {
            errorDiv.textContent = data.error || 'Invalid username or password';
            errorDiv.style.display = 'block';
            document.getElementById('login-password').value = '';
        }
    } catch (err) {
        console.error('Login error:', err);
        errorDiv.textContent = 'Network error. Please check your connection and try again.';
        errorDiv.style.display = 'block';
    }
}

export function getAuthToken() {
    return localStorage.getItem('skwtr_jwt');
}

export function getAuthRole() {
    return localStorage.getItem('skwtr_role');
}

export function getUsername() {
    return localStorage.getItem('skwtr_username');
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
