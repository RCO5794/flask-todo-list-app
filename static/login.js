document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const API_BASE_URL = '/api'; // 因為和網頁同源，可以直接用相對路徑

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        errorMessage.textContent = '';

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ username, password }),
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => { throw new Error(err.error || '登入失敗') });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                window.location.href = '/app'; // 跳轉到主應用頁面
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            errorMessage.textContent = error.message;
        });
    });
});