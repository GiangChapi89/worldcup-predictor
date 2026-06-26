// js/app.js
window.currentUserId = null;
window.currentUserName = null;

// THÊM LẮNG NGHE DỰ ĐOÁN

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 World Cup Predictor đã sẵn sàng!');
    
    try {
        const matchManager = new MatchManager();
        matchManager.listenMatches();
        
        const predictionManager = new PredictionManager();
        predictionManager.loadPredictions();
        
        const statsManager = new StatisticsManager();
        statsManager.loadRanking();
        
        window.matchManager = matchManager;
        window.predictionManager = predictionManager;
        window.statisticsManager = statsManager;
        
        // Lắng nghe thay đổi auth để refresh matches
        firebase.auth().onAuthStateChanged(() => {
            if (window.matchManager) {
                window.matchManager.renderMatches();
            }
        });
        
        console.log('✅ All managers initialized');
    } catch (error) {
        console.error('❌ Lỗi khởi tạo:', error);
    }
});