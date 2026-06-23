// js/matches.js
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
                    document.getElementById('matchList').innerHTML = 
                        '<p>⚠️ Chưa có trận đấu nào. Hãy thêm dữ liệu mẫu!</p>';
                    return;
                }
                this.matches = [];
                snapshot.forEach(doc => {
                    this.matches.push({ id: doc.id, ...doc.data() });
                });
                this.renderMatches();
            }, (error) => {
                console.error('❌ Lỗi lắng nghe matches:', error);
                document.getElementById('matchList').innerHTML = 
                    `<p style="color:red;">❌ Lỗi tải dữ liệu: ${error.message}</p>`;
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
            const handicapDisplay = match.handicap > 0 ? `⚡ Chấp ${match.handicap}` : '⚡ Đồng banh';
            
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
                        <span>${handicapDisplay}</span>
                    </div>
                    <div class="match-score ${isFinished ? 'finished' : 'upcoming'}">
                        ${isFinished ? 
                            `${match.homeScore} - ${match.awayScore} 🏆` : 
                            '⏳ Chưa diễn ra'}
                    </div>
                    ${!isFinished ? `
                        <button class="predict-btn" onclick="predictMatch('${match.id}')" 
                                ${!isLoggedIn ? 'disabled' : ''}>
                            ${isLoggedIn ? '📝 Dự Đoán' : '🔒 Đăng nhập để dự đoán'}
                        </button>
                    ` : `
                        <button class="predict-btn" onclick="viewMatchHistory('${match.id}')" 
                                style="background: linear-gradient(135deg, #00b894, #00a86b);">
                            📊 Xem chi tiết
                        </button>
                    `}
                </div>
            `;
        }).join('');
    }

    // ============================================
    // TÍNH ĐIỂM DỰA TRÊN KÈO CHẤP
    // ============================================
    async calculatePoints(matchId) {
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

            for (const doc of predictionsSnap.docs) {
                const prediction = doc.data();
                const userId = prediction.userId;
                
                // Tính điểm dựa trên kèo chấp
                const result = this.calculateMatchResult(match, prediction);
                
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
    calculateMatchResult(match, prediction) {
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

    // ============================================
    // XEM CHI TIẾT TRẬN ĐẤU
    // ============================================
    async viewMatchHistory(matchId) {
        try {
            const db = firebase.firestore();
            
            const matchDoc = await db.collection('matches').doc(matchId).get();
            if (!matchDoc.exists) {
                alert('❌ Không tìm thấy trận đấu');
                return;
            }
            const match = matchDoc.data();

            const userId = firebase.auth().currentUser?.uid;
            if (!userId) {
                alert('Vui lòng đăng nhập để xem chi tiết');
                return;
            }

            const predSnap = await db.collection('predictions')
                .where('matchId', '==', matchId)
                .where('userId', '==', userId)
                .get();

            let prediction = null;
            if (!predSnap.empty) {
                prediction = predSnap.docs[0].data();
            }

            this.showMatchDetailModal(match, prediction);

        } catch (error) {
            console.error('❌ Lỗi xem chi tiết:', error);
            alert('❌ Lỗi: ' + error.message);
        }
    }

    showMatchDetailModal(match, prediction) {
        const modalHtml = `
            <div id="matchDetailModal" class="modal" style="display:block;">
                <div class="modal-content" style="max-width: 600px;">
                    <span class="close" onclick="document.getElementById('matchDetailModal').remove()">&times;</span>
                    <h2 style="text-align:center;margin-bottom:20px;">📊 Chi Tiết Trận Đấu</h2>
                    
                    <div style="text-align:center;font-size:1.5rem;font-weight:bold;padding:15px;background:#f8f9fa;border-radius:10px;margin-bottom:20px;">
                        ${match.homeTeam} vs ${match.awayTeam}
                    </div>
                    
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
                        <div style="background:#f0f2f5;padding:15px;border-radius:8px;">
                            <div style="font-weight:bold;color:#666;">📅 Ngày</div>
                            <div>${match.date || 'N/A'}</div>
                        </div>
                        <div style="background:#f0f2f5;padding:15px;border-radius:8px;">
                            <div style="font-weight:bold;color:#666;">⏰ Giờ</div>
                            <div>${match.time || 'N/A'}</div>
                        </div>
                        <div style="background:#f0f2f5;padding:15px;border-radius:8px;">
                            <div style="font-weight:bold;color:#666;">⚡ Kèo chấp</div>
                            <div>${match.handicap > 0 ? match.handicap : 'Đồng banh'}</div>
                        </div>
                        <div style="background:#f0f2f5;padding:15px;border-radius:8px;">
                            <div style="font-weight:bold;color:#666;">🏆 Kết quả</div>
                            <div style="font-size:1.2rem;font-weight:bold;color:#2d3436;">
                                ${match.homeScore} - ${match.awayScore}
                            </div>
                        </div>
                    </div>

                    ${prediction ? `
                        <div style="margin-top:20px;padding:15px;border-radius:8px;background:${prediction.isCorrect ? '#d4edda' : '#f8d7da'};">
                            <h3 style="margin-bottom:10px;">📝 Dự đoán của bạn</h3>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                                <div><strong>Dự đoán:</strong> ${prediction.homeScore} - ${prediction.awayScore}</div>
                                <div><strong>Kèo chấp:</strong> ${prediction.userHandicap || match.handicap || 0}</div>
                                <div><strong>Chọn:</strong> ${prediction.handicapChoice || 'draw'}</div>
                                <div><strong>Điểm:</strong> ${prediction.points || 0}</div>
                            </div>
                            <div style="margin-top:10px;font-weight:bold;color:${prediction.isCorrect ? '#28a745' : '#dc3545'};">
                                ${prediction.isCorrect ? '✅ Dự đoán đúng!' : '❌ Dự đoán sai'}
                            </div>
                        </div>
                    ` : `
                        <div style="margin-top:20px;padding:15px;border-radius:8px;background:#fff3cd;">
                            <p>⚠️ Bạn chưa dự đoán trận đấu này</p>
                        </div>
                    `}

                    <button onclick="document.getElementById('matchDetailModal').remove()" 
                            style="width:100%;padding:12px;margin-top:20px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;border-radius:8px;font-size:16px;cursor:pointer;">
                        Đóng
                    </button>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer.firstElementChild);

        setTimeout(() => {
            const modal = document.getElementById('matchDetailModal');
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.remove();
                }
            });
        }, 100);
    }

    stopListening() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }
}

// ============================================
// HÀM GLOBAL
// ============================================
async function viewMatchHistory(matchId) {
    const matchManager = new MatchManager();
    await matchManager.viewMatchHistory(matchId);
}