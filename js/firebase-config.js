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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized');
}

// Khởi tạo các services
const auth = firebase.auth();
const db = firebase.firestore();

// Cấu hình Firestore settings (quan trọng)
db.settings({
    timestampsInSnapshots: true
});

// Set persistence
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => console.log('✅ Auth persistence set'))
    .catch(error => console.error('❌ Auth persistence error:', error));

// Export ra window
window.auth = auth;
window.db = db;
console.log('✅ Firebase initialized successfully!');