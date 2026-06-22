// js/firebase-config.js

// ⚠️ THAY THẾ CÁC GIÁ TRỊ NÀY BẰNG CONFIG CỦA BẠN ⚠️
const firebaseConfig = {
    apiKey: "AIzaSyAtWSCCq42XdPrQiSeAEA9cHeLQDea0lcQ",          // Thay bằng API Key của bạn
    authDomain: "worldcup-predictor-2026-d5e0d.firebaseapp.com", // Thay bằng Auth Domain
    projectId: "worldcup-predictor-2026-d5e0d",                  // Thay bằng Project ID
    storageBucket: "worldcup-predictor-2026-d5e0d.firebasestorage.app",  // Thay bằng Storage Bucket
    messagingSenderId: "903168591775",                     // Thay bằng Sender ID
    appId: "1:903168591775:web:6d3ae0a9926a8153e9dfaa"           // Thay bằng App ID
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);

// Khởi tạo các services
const auth = firebase.auth();
const db = firebase.firestore();

// Cấu hình Firestore settings (quan trọng)
db.settings({
    timestampsInSnapshots: true,
    merge: true
});

// Export để sử dụng ở các file khác
// (Nếu dùng module, bỏ comment dòng dưới)
// export { auth, db };

console.log('✅ Firebase initialized successfully!');