// js/admin-config.js
const ADMIN_EMAILS = [
    'admin@gmail.com',
    'your-email@gmail.com'
];

// Danh sách admin UID (có thể lấy từ Firebase sau khi đăng nhập)
const ADMIN_UIDS = [
    'admin_uid_1',
    'admin_uid_2'
];

function isAdmin(user) {
    if (!user) return false;
    return ADMIN_EMAILS.includes(user.email) || 
           ADMIN_UIDS.includes(user.uid);
}