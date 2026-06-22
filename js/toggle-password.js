// js/toggle-password.js

/**
 * Toggle password visibility
 * @param {string} inputId - ID của input field
 * @param {HTMLElement} button - Button element được click
 */
function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const icon = button.querySelector('i');
    if (!icon) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
        button.setAttribute('aria-label', 'Ẩn mật khẩu');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
        button.setAttribute('aria-label', 'Hiện mật khẩu');
    }
    
    // Focus vào input sau khi toggle
    input.focus();
}

// Tự động gán toggle password cho tất cả các nút
document.addEventListener('DOMContentLoaded', function() {
    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(button => {
        const inputId = button.getAttribute('data-input-id');
        if (inputId) {
            button.addEventListener('click', function() {
                togglePassword(inputId, this);
            });
        }
    });
});

// Thêm vào toggle-password.js
function autoTogglePassword() {
    const passwordInputs = document.querySelectorAll('.password-wrapper input[type="password"]');
    passwordInputs.forEach(input => {
        const wrapper = input.closest('.password-wrapper');
        if (!wrapper) return;
        
        const toggleBtn = wrapper.querySelector('.toggle-password');
        if (!toggleBtn) return;
        
        // Tự động hiện mật khẩu khi focus
        input.addEventListener('focus', function() {
            // Không tự động mở, chỉ thêm class
            wrapper.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            wrapper.classList.remove('focused');
            // Tự động ẩn khi blur
            if (input.type === 'text') {
                input.type = 'password';
                const icon = toggleBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }
        });
    });
}

// Gọi khi DOM load
document.addEventListener('DOMContentLoaded', autoTogglePassword);

console.log('✅ Toggle password loaded');