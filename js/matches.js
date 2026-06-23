class MatchManager {
    constructor() {
        this.matches = [];
        this.unsubscribe = null;
    }

    listenMatches() {
        console.log('📡 Bắt đầu lắng nghe matches...');
        if (!db) {
            console.error('❌ Firestore chưa được khởi tạo!');
            return;
        }
        this.unsubscribe = db.collection('matches')
            .orderBy('date')
            .onSnapshot((snapshot) => {
                console.log('📦 Nhận snapshot, số lượng:', snapshot.size);
                if (snapshot.empty) {
                    document.getElementById('matchList').innerHTML = '<p>⚠️ Chưa có trận đấu nào. Hãy thêm dữ liệu mẫu!</p>';
                    return;
                }
                this.matches = [];
                snapshot.forEach(doc => {
                    this.matches.push({ id: doc.id, ...doc.data() });
                });
                this.renderMatches();
            }, (error) => {
                console.error('❌ Lỗi lắng nghe matches:', error);
                document.getElementById('matchList').innerHTML = `<p style="color:red;">❌ Lỗi tải dữ liệu: ${error.message}</p>`;
            });
    }

    renderMatches() {
        const container = document.getElementById('matchList');
        if (!container) return;
        if (!this.matches.length) {
            container.innerHTML = '<p>⚠️ Không có trận đấu nào.</p>';
            return;
        }
        container.innerHTML = this.matches.map(match => {
            const isFinished = match.status === 'finished';
            const isLoggedIn = !!window.currentUserId;
            return `
                <div class="match-card">
                    <div class="match-info">
                        <span class="team">${match.homeTeam || '?'}</span>
                        <span class="vs">vs</span>
                        <span class="team">${match.awayTeam || '?'}</span>
                    </div>
                    <div class="match-details">
                        <span>📅 ${match.date || 'N/A'}</span>
                        <span>⏰ ${match.time || 'N/A'}</span>
                    </div>
                    <div class="match-score">
                        ${isFinished ? `${match.homeScore} - ${match.awayScore} 🏆` : '⏳ Chưa diễn ra'}
                    </div>
                    <button class="predict-btn" onclick="predictMatch('${match.id}')" ${isFinished || !isLoggedIn ? 'disabled' : ''}>
                        ${isFinished ? 'Đã kết thúc' : '📝 Dự Đoán'}
                    </button>
                </div>
            `;
        }).join('');
    }

    // Trong matches.js - calculatePoints
    // TÍNH ĐIỂM DỰA TRÊN KÈO CHẤP
    // ============================================
    async function calculatePoints(matchId) {
        console.log('🧮 Bắt đầu tính điểm cho trận:', matchId);
        
        try {
            const db = firebase.firestore();
            
            // Lấy thông tin trận đấu
            const matchDoc = await db.collection('matches').doc(matchId).get();
            if (!matchDoc.exists) {
                console.error('❌ Không tìm thấy trận đấu');
                return;
            }
            
            const match = matchDoc.data();
            if (match.status !== 'finished') {
                console.log('⚠️ Trận đấu chưa kết thúc, bỏ qua tính điểm');
                return;
            }

            // Lấy tất cả dự đoán cho trận này
            const predictionsSnap = await db.collection('predictions')
                .where('matchId', '==', matchId)
                .get();

            if (predictionsSnap.empty) {
                console.log('📭 Không có dự đoán nào cho trận này');
                return;
            }

            const batch = db.batch();
            let totalCorrect = 0;

            // Duyệt từng dự đoán
            for (const doc of predictionsSnap.docs) {
                const prediction = doc.data();
                const userId = prediction.userId;
                
                // Tính điểm dựa trên kèo chấp
                const result = calculateMatchResult(match, prediction);
                
                // Cập nhật điểm cho dự đoán
                const predRef = db.collection('predictions').doc(doc.id);
                batch.update(predRef, {
                    points: result.points,
                    isCorrect: result.isCorrect,
                    calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Cập nhật điểm cho user
                const userRef = db.collection('users').doc(userId);
                if (result.points > 0) {
                    batch.update(userRef, {
                        totalPoints: firebase.firestore.FieldValue.increment(result.points),
                        correctPredictions: firebase.firestore.FieldValue.increment(1)
                    });
                    totalCorrect++;
                }

                // Lưu lịch sử dự đoán
                const historyData = {
                    userId: userId,
                    matchId: matchId,
                    matchDate: match.date,
                    homeTeam: match.homeTeam,
                    awayTeam: match.awayTeam,
                    predictedHomeScore: prediction.homeScore,
                    predictedAwayScore: prediction.awayScore,
                    actualHomeScore: match.homeScore,
                    actualAwayScore: match.awayScore,
                    handicap: match.handicap || 0,
                    userHandicap: prediction.userHandicap || match.handicap || 0,
                    handicapChoice: prediction.handicapChoice || 'draw',
                    points: result.points,
                    isCorrect: result.isCorrect,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                const historyRef = db.collection('user_predictions_history').doc();
                batch.set(historyRef, historyData);
            }

            // Commit tất cả cập nhật
            await batch.commit();
            
            console.log(`✅ Đã tính điểm cho ${predictionsSnap.size} dự đoán`);
            console.log(`📊 Số dự đoán đúng: ${totalCorrect}`);

        } catch (error) {
            console.error('❌ Lỗi tính điểm:', error);
            throw error;
        }
    }

    // ============================================
    // TÍNH KẾT QUẢ DỰA TRÊN KÈO CHẤP
    // ============================================
    function calculateMatchResult(match, prediction) {
        const actualHome = match.homeScore;
        const actualAway = match.awayScore;
        const predHome = prediction.homeScore;
        const predAway = prediction.awayScore;
        const handicap = match.handicap || 0;
        const userHandicap = prediction.userHandicap || handicap;
        const handicapChoice = prediction.handicapChoice || 'draw';

        // 1. Kiểm tra dự đoán đúng tỷ số
        const isCorrectScore = (predHome === actualHome && predAway === actualAway);
        
        // 2. Kiểm tra kèo chấp
        const actualDiff = actualHome - actualAway;
        let isCorrectHandicap = false;

        switch(handicapChoice) {
            case 'home':
                isCorrectHandicap = actualDiff > userHandicap;
                break;
            case 'away':
                isCorrectHandicap = actualDiff < -userHandicap;
                break;
            case 'draw':
                isCorrectHandicap = Math.abs(actualDiff) < userHandicap;
                break;
            default:
                isCorrectHandicap = true;
        }

        // 3. Tổng hợp kết quả
        const isCorrect = isCorrectScore && isCorrectHandicap;
        const points = isCorrect ? 1 : 0;

        return {
            points: points,
            isCorrect: isCorrect,
            isCorrectScore: isCorrectScore,
            isCorrectHandicap: isCorrectHandicap
        };
    }
}