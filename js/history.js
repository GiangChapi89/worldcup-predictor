// js/history.js
async function loadHistory() {
    const container = document.getElementById('historyContent');
    
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            container.innerHTML = `
                <div style="text-align:center;padding:50px;">
                    <h2>🔐 Vui lòng đăng nhập</h2>
                    <p style="margin:20px 0;">Đăng nhập để xem lịch sử dự đoán của bạn</p>
                    <a href="index.html" style="display:inline-block;padding:12px 30px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:8px;text-decoration:none;">← Về trang chủ</a>
                </div>
            `;
            return;
        }

        const db = firebase.firestore();
        const snapshot = await db.collection('user_predictions_history')
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            container.innerHTML = `
                <div style="text-align:center;padding:50px;">
                    <h2>📭 Chưa có lịch sử dự đoán</h2>
                    <p style="margin:20px 0;">Hãy bắt đầu dự đoán các trận đấu World Cup 2026!</p>
                    <a href="index.html" style="display:inline-block;padding:12px 30px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:8px;text-decoration:none;">← Về trang chính</a>
                </div>
            `;
            return;
        }

        let html = `
            <h2 style="margin-bottom:20px;">📊 Lịch Sử Dự Đoán</h2>
            <div style="display:grid;gap:15px;">
        `;

        let totalPoints = 0;
        let correctCount = 0;

        snapshot.forEach(doc => {
            const history = doc.data();
            totalPoints += history.points || 0;
            if (history.isCorrect) correctCount++;

            html += `
                <div style="background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.08);border-left:4px solid ${history.isCorrect ? '#28a745' : '#dc3545'};">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                        <div>
                            <div style="font-weight:bold;font-size:1.1rem;">
                                ${history.homeTeam} vs ${history.awayTeam}
                            </div>
                            <div style="color:#888;font-size:0.9rem;">
                                📅 ${history.matchDate || 'N/A'}
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:1.2rem;font-weight:bold;color:${history.isCorrect ? '#28a745' : '#dc3545'};">
                                ${history.isCorrect ? '✅ +1 điểm' : '❌ 0 điểm'}
                            </div>
                            <div style="color:#888;font-size:0.85rem;">
                                ⚡ Kèo: ${history.userHandicap || 0} | Chọn: ${history.handicapChoice || 'draw'}
                            </div>
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;padding-top:10px;border-top:1px solid #eee;">
                        <div>
                            <strong>Dự đoán:</strong> ${history.predictedHomeScore} - ${history.predictedAwayScore}
                        </div>
                        <div>
                            <strong>Kết quả:</strong> ${history.actualHomeScore} - ${history.actualAwayScore}
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
            </div>
            <div style="margin-top:20px;padding:20px;background:white;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.08);text-align:center;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:400px;margin:0 auto;">
                    <div>
                        <div style="color:#888;font-size:0.9rem;">Tổng điểm</div>
                        <div style="font-size:2rem;font-weight:bold;color:#667eea;">${totalPoints}</div>
                    </div>
                    <div>
                        <div style="color:#888;font-size:0.9rem;">Dự đoán đúng</div>
                        <div style="font-size:2rem;font-weight:bold;color:#28a745;">${correctCount}</div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

    } catch (error) {
        console.error('❌ Lỗi tải lịch sử:', error);
        container.innerHTML = `<p style="color:red;">❌ Lỗi: ${error.message}</p>`;
    }
}

function logout() {
    firebase.auth().signOut().then(() => {
        window.location.href = 'index.html';
    });
}

document.addEventListener('DOMContentLoaded', loadHistory);