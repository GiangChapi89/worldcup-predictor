// js/app.js
// Global variables
window.currentUserId = null;
window.currentUserName = null;

// Khởi tạo các managers khi trang load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 World Cup Predictor đã sẵn sàng!');
    
    try {
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
        
        // Lưu instance để sử dụng sau
        window.matchManager = matchManager;
        window.predictionManager = predictionManager;
        window.statisticsManager = statsManager;
        
        console.log('✅ All managers initialized');
    } catch (error) {
        console.error('❌ Lỗi khởi tạo:', error);
    }
});