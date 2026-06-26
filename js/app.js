// js/app.js - SỬA LỖI

window.currentUserId = null;
window.currentUserName = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 World Cup Predictor đã sẵn sàng!');
    
    try {
        // Kiểm tra các class đã được định nghĩa
        if (typeof MatchManager === 'undefined') {
            console.error('❌ MatchManager chưa được định nghĩa!');
            return;
        }
        
        if (typeof PredictionManager === 'undefined') {
            console.error('❌ PredictionManager chưa được định nghĩa!');
            return;
        }
        
        if (typeof StatisticsManager === 'undefined') {
            console.error('❌ StatisticsManager chưa được định nghĩa!');
            return;
        }
        
        const matchManager = new MatchManager();
        matchManager.listenMatches();
        
        const predictionManager = new PredictionManager();
        predictionManager.loadPredictions();
        
        const statsManager = new StatisticsManager();
        statsManager.loadRanking();
        
        window.matchManager = matchManager;
        window.predictionManager = predictionManager;
        window.statisticsManager = statsManager;
        
        console.log('✅ All managers initialized');
    } catch (error) {
        console.error('❌ Lỗi khởi tạo:', error);
    }
});