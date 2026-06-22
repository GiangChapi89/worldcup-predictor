// js/app.js
// Global variables
window.currentUserId = null;
window.currentUserName = null;

// Khởi tạo các managers khi trang load
document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo Match Manager
    const matchManager = new MatchManager();
    matchManager.listenMatches();
    
    // Khởi tạo Prediction Manager
    const predictionManager = new PredictionManager();
    predictionManager.loadPredictions();
    
    // Khởi tạo Statistics Manager
    const statsManager = new StatisticsManager();
    statsManager.loadRanking();
    
    // Auth Manager đã được khởi tạo trong auth.js
    console.log('🚀 World Cup Predictor đã sẵn sàng!');
});