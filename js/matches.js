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
    async calculatePoints(matchId) {
        const matchDoc = await db.collection('matches').doc(matchId).get();
        const match = matchDoc.data();
        
        const predictionsSnap = await db.collection('predictions')
            .where('matchId', '==', matchId)
            .get();
        
        const batch = db.batch();
        
        predictionsSnap.forEach(doc => {
            const pred = doc.data();
            const isCorrectScore = pred.homeScore === match.homeScore && 
                                  pred.awayScore === match.awayScore;
            
            // Xử lý chấp trái
            let isCorrectHandicap = true;
            if (match.handicap > 0 && pred.handicapChoice) {
                const diff = match.homeScore - match.awayScore;
                switch(pred.handicapChoice) {
                    case 'home':
                        isCorrectHandicap = diff > match.handicap;
                        break;
                    case 'away':
                        isCorrectHandicap = diff < -match.handicap;
                        break;
                    case 'draw':
                        isCorrectHandicap = Math.abs(diff) < match.handicap;
                        break;
                }
            }
            
            const isCorrect = isCorrectScore && isCorrectHandicap;
            
            if (isCorrect) {
                const userRef = db.collection('users').doc(pred.userId);
                batch.update(userRef, {
                    totalPoints: firebase.firestore.FieldValue.increment(1),
                    correctPredictions: firebase.firestore.FieldValue.increment(1)
                });
                
                batch.update(doc.ref, {
                    points: 1,
                    isCorrect: true
                });
            }
        });
        
        await batch.commit();
    }
}