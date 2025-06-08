document.addEventListener('DOMContentLoaded', () => {
    const passwordChangeForm = document.getElementById('password-change-form');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const API_BASE_URL = '/api';

    passwordChangeForm.addEventListener('submit', (event) => {
        event.preventDefault();
        
        // 清除舊訊息
        errorMessage.textContent = '';
        successMessage.textContent = '';

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // 前端驗證
        if (!currentPassword || !newPassword || !confirmPassword) {
            errorMessage.textContent = '所有欄位皆為必填。';
            return;
        }

        if (newPassword !== confirmPassword) {
            errorMessage.textContent = '兩次輸入的新密碼不一致。';
            return;
        }

        if (newPassword.length < 4) {
            errorMessage.textContent = '新密碼長度至少需要 4 個字元。';
            return;
        }

        // 發送 API 請求
        fetch(`${API_BASE_URL}/user/password`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword,
            }),
        })
        .then(async (response) => {
            const responseData = await response.json();
            if (!response.ok) {
                throw new Error(responseData.error || '發生未知錯誤');
            }
            return responseData;
        })
        .then(data => {
            successMessage.textContent = data.message + ' 您現在可以使用新密碼登入。';
            passwordChangeForm.reset(); // 清空表單
        })
        .catch(error => {
            console.error('Password change error:', error);
            errorMessage.textContent = error.message;
        });
    });
});