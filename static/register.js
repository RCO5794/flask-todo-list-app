document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const submitButton = registerForm.querySelector('button[type="submit"]');
    const errorMessage = document.getElementById('error-message');
    const API_BASE_URL = '/api';

    registerForm.addEventListener('submit', (event) => {
        event.preventDefault();
        
        // 每次提交前，都先清除舊的錯誤訊息
        errorMessage.textContent = '';

        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // --- 強化前端驗證 ---
        if (!username || !password || !confirmPassword) {
            errorMessage.textContent = '所有欄位皆為必填。';
            return;
        }

        if (password !== confirmPassword) {
            errorMessage.textContent = '兩次輸入的密碼不一致，請重新確認。';
            // 讓使用者可以立刻修正
            confirmPasswordInput.focus(); 
            return;
        }

        if (password.length < 4) {
            errorMessage.textContent = '密碼長度至少需要 4 個字元。';
            passwordInput.focus();
            return;
        }
        
        // --- 禁用按鈕，防止重複提交 ---
        submitButton.disabled = true;
        submitButton.textContent = '註冊中...';

        // --- 發送 API 請求 ---
        fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(async (response) => {
            const responseData = await response.json();
            if (!response.ok) {
                // 如果後端回應錯誤 (如 400, 409, 500)，拋出從後端收到的錯誤訊息
                throw new Error(responseData.error || '發生未知錯誤');
            }
            return responseData;
        })
        .then(data => {
            if (data.success) {
                // 使用 alert 彈出清楚的成功提示
                alert("註冊成功！將為您導向登入頁面。");
                // 導向登入頁面
                window.location.href = '/login';
            }
        })
        .catch(error => {
            // 捕獲所有錯誤 (包括網路錯誤和後端拋出的錯誤)，並顯示在頁面上
            console.error('Registration error:', error);
            errorMessage.textContent = error.message;
        })
        .finally(() => {
            // 無論成功或失敗，最後都恢復按鈕的狀態
            submitButton.disabled = false;
            submitButton.textContent = '註冊';
        });
    });
});