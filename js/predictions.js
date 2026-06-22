// js/predictions.js
class PredictionManager {
    constructor() {
        this.predictions = [];
    }

    async savePrediction(matchId, homeScore, awayScore) {
        // Kiểm tra đăng nhập
        if (!window.currentUserId) {
            alert('Vui lòng đăng nhập để dự đoán!');
            return;
        }

        try {
            const predictionData = {
                matchId: matchId,
                userId: window.currentUserId,
                userName: window.currentUserName || 'Anonymous',
                homeScore: parseInt(homeScore),
                awayScore: parseInt(awayScore),
                points: 0,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Lưu vào Firestore
            await db.collection('predictions').add(predictionData);
            
            alert('✅ Dự đoán thành công!');
            this.loadPredictions();
        } catch (error) {
            console.error('Lỗi lưu dự đoán:', error);
            alert('❌ Lỗi lưu dự đoán: ' + error.message);
        }
    }

    async loadPredictions() {
        try {
            const snapshot = await db.collection('predictions')
                .orderBy('timestamp', 'desc')
                .get();
            
            this.predictions = [];
            snapshot.forEach(doc => {
                this.predictions.push({ id: doc.id, ...doc.data() });
            });
            
            return this.predictions;
        } catch (error) {
            console.error('Lỗi tải dự đoán:', error);
            return [];
        }
    }

    async getUserPredictions(userId) {
        try {
            const snapshot = await db.collection('predictions')
                .where('userId', '==', userId)
                .get();
            
            const userPredictions = [];
            snapshot.forEach(doc => {
                userPredictions.push({ id: doc.id, ...doc.data() });
            });
            
            return userPredictions;
        } catch (error) {
            console.error('Lỗi tải dự đoán user:', error);
            return [];
        }
    }
}

// Hàm global để gọi từ HTML
async function predictMatch(matchId) {
    if (!window.currentUserId) {
        document.getElementById('loginModal').style.display = 'block';
        return;
    }
    
    // Lấy thông tin trận đấu
    const matchDoc = await db.collection('matches').doc(matchId).get();
    const match = matchDoc.data();
    
    // Hiển thị form dự đoán với chấp trái
    const homeScore = prompt(`Dự đoán tỷ số cho ${match.homeTeam}:`);
    if (homeScore === null) return;
    
    const awayScore = prompt(`Dự đoán tỷ số cho ${match.awayTeam}:`);
    if (awayScore === null) return;
    
    // Xử lý chấp trái
    let handicapChoice = 'draw';
    if (match.handicap > 0) {
        const choice = prompt(`Chấp trái: ${match.handicap}\nChọn: (home/away/draw)`);
        if (choice) handicapChoice = choice.toLowerCase();
    }
    
    const predManager = new PredictionManager();
    await predManager.savePrediction(matchId, homeScore, awayScore, handicapChoice);
}