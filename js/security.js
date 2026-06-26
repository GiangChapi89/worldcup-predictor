// js/security.js
(function() {
    'use strict';
    
    // ============================================
    // 1. CHẶN PHÍM TẮT
    // ============================================
    function blockShortcuts() {
        const blockedKeys = {
            'F12': true,
            'Ctrl+Shift+I': true,
            'Ctrl+Shift+J': true,
            'Ctrl+U': true,
            'Ctrl+S': true,
            'Ctrl+P': true,
            'Ctrl+C': true // Có thể bỏ comment nếu muốn chặn copy
        };
        
        document.addEventListener('keydown', function(e) {
            const ctrl = e.ctrlKey || e.metaKey;
            const shift = e.shiftKey;
            const key = e.key;
            
            // F12
            if (key === 'F12') {
                e.preventDefault();
                showWarning('⚠️ Developer tools đã bị vô hiệu hóa!');
                return false;
            }
            
            // Ctrl+Shift+I (DevTools)
            if (ctrl && shift && (key === 'I' || key === 'i')) {
                e.preventDefault();
                showWarning('⚠️ Developer tools đã bị vô hiệu hóa!');
                return false;
            }
            
            // Ctrl+Shift+J (Console)
            if (ctrl && shift && (key === 'J' || key === 'j')) {
                e.preventDefault();
                showWarning('⚠️ Developer tools đã bị vô hiệu hóa!');
                return false;
            }
            
            // Ctrl+U (View Source)
            if (ctrl && (key === 'U' || key === 'u')) {
                e.preventDefault();
                showWarning('⚠️ Xem mã nguồn đã bị vô hiệu hóa!');
                return false;
            }
            
            // Ctrl+S (Save Page)
            if (ctrl && (key === 'S' || key === 's')) {
                e.preventDefault();
                showWarning('⚠️ Lưu trang đã bị vô hiệu hóa!');
                return false;
            }
            
            // Ctrl+P (Print)
            if (ctrl && (key === 'P' || key === 'p')) {
                e.preventDefault();
                showWarning('⚠️ In trang đã bị vô hiệu hóa!');
                return false;
            }
        });
    }
    
    // ============================================
    // 2. CHẶN RIGHT-CLICK
    // ============================================
    function blockRightClick() {
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            showWarning('⚠️ Click phải đã bị vô hiệu hóa!');
            return false;
        });
    }
    
    // ============================================
    // 3. CHẶN DRAG & SELECT
    // ============================================
    function blockDragAndSelect() {
        // Chặn drag
        document.addEventListener('dragstart', function(e) {
            e.preventDefault();
            return false;
        });
        
        // Chặn select text
        document.addEventListener('selectstart', function(e) {
            e.preventDefault();
            return false;
        });
        
        // Chặn copy
        document.addEventListener('copy', function(e) {
            e.preventDefault();
            showWarning('⚠️ Copy đã bị vô hiệu hóa!');
            return false;
        });
    }
    
    // ============================================
    // 4. PHÁT HIỆN DEVPANEL
    // ============================================
    function detectDevPanel() {
        let devtoolsOpen = false;
        
        // Phương pháp 1: Sử dụng debugger
        function checkDebugger() {
            const start = performance.now();
            debugger;
            const end = performance.now();
            if (end - start > 100) {
                if (!devtoolsOpen) {
                    devtoolsOpen = true;
                    showWarning('⚠️ Developer tools đã bị vô hiệu hóa!');
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                }
            } else {
                devtoolsOpen = false;
            }
        }
        
        // Kiểm tra mỗi 2 giây
        setInterval(checkDebugger, 2000);
        
        // Phương pháp 2: Kiểm tra kích thước (cho mobile)
        window.addEventListener('resize', function() {
            const widthThreshold = window.outerWidth - window.innerWidth > 160;
            const heightThreshold = window.outerHeight - window.innerHeight > 160;
            
            if (widthThreshold || heightThreshold) {
                if (!devtoolsOpen) {
                    devtoolsOpen = true;
                    showWarning('⚠️ Developer tools đã bị vô hiệu hóa!');
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
                }
            }
        });
    }
    
    // ============================================
    // 5. HIỂN THỊ CẢNH BÁO
    // ============================================
    function showWarning(message) {
        // Tạo overlay nếu chưa có
        let overlay = document.getElementById('securityOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'securityOverlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.85);
                color: white;
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 99999;
                font-size: 24px;
                font-family: Arial, sans-serif;
                animation: securityFadeIn 0.3s ease;
            `;
            overlay.innerHTML = `
                <div style="text-align:center;padding:30px;">
                    <div style="font-size:60px;margin-bottom:20px;">🔒</div>
                    <div style="font-size:28px;font-weight:bold;margin-bottom:15px;">${message}</div>
                    <div style="font-size:16px;color:#888;margin-top:10px;">
                        Vui lòng tắt Developer Tools để tiếp tục sử dụng ứng dụng.
                    </div>
                    <button onclick="document.getElementById('securityOverlay').remove()" 
                            style="margin-top:25px;padding:12px 40px;background:#667eea;color:white;border:none;border-radius:8px;font-size:18px;cursor:pointer;">
                        Tôi hiểu
                    </button>
                </div>
            `;
            document.body.appendChild(overlay);
            
            // Thêm animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes securityFadeIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
            
            // Tự động đóng sau 3 giây
            setTimeout(() => {
                if (overlay && overlay.parentNode) {
                    overlay.remove();
                }
            }, 3000);
        }
    }
    
    // ============================================
    // 6. CHẶN ĐỌC SOURCE QUA CONSOLE
    // ============================================
    function blockConsoleAccess() {
        // Xóa console.log (tùy chọn)
        // console.log = function() {};
        // console.warn = function() {};
        // console.error = function() {};
        
        // Chặn truy cập vào các biến quan trọng
        Object.defineProperty(window, 'firebase', {
            get: function() {
                showWarning('⚠️ Truy cập Firebase đã bị vô hiệu hóa!');
                return undefined;
            },
            set: function() {}
        });
    }
    
    // ============================================
    // 7. KHỞI TẠO
    // ============================================
    function init() {
        console.log('🔒 Security module loaded');
        
        try {
            blockShortcuts();
            blockRightClick();
            blockDragAndSelect();
            detectDevPanel();
            // blockConsoleAccess(); // Bỏ comment nếu muốn chặn console
        } catch (error) {
            console.error('Security error:', error);
        }
    }
    
    // Khởi tạo khi DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();