// js/matches.js
class MatchManager {
    constructor() {
        this.matches = [];
        this.unsubscribe = null;
    }

    // Lắng nghe real-time updates từ Firestore
    listenMatches() {
        this.unsubscribe = db.collection('matches')
            .orderBy('date')
            .onSnapshot((snapshot) => {
                this.matches = [];
                snapshot.forEach(doc => {
                    this.matches.push({ id: doc.id, ...doc.data() });
                });
                this.renderMatches();
            }, (error) => {
                console.error('Lỗi lắng nghe matches:', error);
            });
    }

    renderMatches() {
        const matchList = document.getElementById('matchList');
        if (!this.matches.length) {
            matchList.innerHTML = '<p>Đang tải dữ liệu...</p>';
            return;
        }

        matchList.innerHTML = this.matches.map(match => {
            const isFinished = match.status === 'finished';
            const isLoggedIn = !!window.currentUserId;
            
            return `
                <div class="match-card">
                    <div class="match-info">
                        <span class="team">${match.homeTeam}</span>
                        <span class="vs">vs</span>
                        <span class="team">${match.awayTeam}</span>
                    </div>
                    <div class="match-details">
                        <span>📅 ${match.date}</span>
                        <span>⏰ ${match.time}</span>
                    </div>
                    <div class="match-score">
                        ${isFinished ? 
                            `${match.homeScore} - ${match.awayScore} 🏆` : 
                            '⏳ Chưa diễn ra'}
                    </div>
                    <button class="predict-btn" 
                            onclick="predictMatch('${match.id}')" 
                            ${isFinished || !isLoggedIn ? 'disabled' : ''}>
                        ${isFinished ? 'Đã kết thúc' : '📝 Dự Đoán'}
                    </button>
                </div>
            `;
        }).join('');
    }

    async updateMatchResult(matchId, homeScore, awayScore) {
        try {
            await db.collection('matches').doc(matchId).update({
                homeScore: parseInt(homeScore),
                awayScore: parseInt(awayScore),
                status: 'finished'
            });
            
            await this.calculatePoints(matchId);
        } catch (error) {
            console.error('Lỗi cập nhật kết quả:', error);
        }
    }

    async calculatePoints(matchId) {
        try {
            // Lấy kết quả trận đấu
            const matchDoc = await db.collection('matches').doc(matchId).get();
            const match = matchDoc.data();
            
            // Lấy tất cả dự đoán cho trận này
            const predictionsSnapshot = await db.collection('predictions')
                .where('matchId', '==', matchId)
                .get();

            const batch = db.batch();
            
            predictionsSnapshot.forEach(doc => {
                const prediction = doc.data();
                const isCorrect = prediction.homeScore === match.homeScore && 
                                prediction.awayScore === match.awayScore;
                
                if (isCorrect) {
                    // Cập nhật điểm cho user
                    const userRef = db.collection('users').doc(prediction.userId);
                    batch.update(userRef, {
                        totalPoints: firebase.firestore.FieldValue.increment(1),
                        correctPredictions: firebase.firestore.FieldValue.increment(1)
                    });
                }
            });

            await batch.commit();
            console.log('✅ Đã cập nhật điểm cho tất cả dự đoán đúng');
        } catch (error) {
            console.error('Lỗi tính điểm:', error);
        }
    }

    stopListening() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}