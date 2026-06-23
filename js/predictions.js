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

// js/predictions.js - THÊM/CẬP NHẬT HÀM predictMatch

async function predictMatch(matchId) {
    if (!window.currentUserId) {
        document.getElementById('loginModal').style.display = 'block';
        return;
    }

    try {
        // Lấy thông tin trận đấu
        const matchDoc = await db.collection('matches').doc(matchId).get();
        if (!matchDoc.exists) {
            alert('❌ Không tìm thấy trận đấu');
            return;
        }
        const match = matchDoc.data();

        if (match.status === 'finished') {
            alert('⏳ Trận đấu đã kết thúc!');
            return;
        }

        // Tạo form dự đoán với kèo chấp
        const modalHtml = `
            <div id="predictionModal" class="modal" style="display:block;">
                <div class="modal-content" style="max-width: 450px;">
                    <span class="close" onclick="document.getElementById('predictionModal').remove()">&times;</span>
                    <h2 style="text-align:center;margin-bottom:10px;">📝 Dự Đoán Tỷ Số</h2>
                    
                    <div style="text-align:center;font-size:1.2rem;font-weight:bold;padding:10px;background:#f8f9fa;border-radius:8px;margin-bottom:20px;">
                        ${match.homeTeam} vs ${match.awayTeam}
                        <div style="font-size:0.9rem;font-weight:normal;color:#666;margin-top:5px;">
                            ⚡ Kèo chấp mặc định: ${match.handicap || 0}
                        </div>
                    </div>

                    <div style="margin-bottom:15px;">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
                            <div>
                                <label style="font-weight:500;display:block;margin-bottom:5px;">${match.homeTeam}</label>
                                <input type="number" id="predHomeScore" min="0" placeholder="0" 
                                       style="width:100%;padding:10px;border:2px solid #ddd;border-radius:8px;font-size:16px;">
                            </div>
                            <div>
                                <label style="font-weight:500;display:block;margin-bottom:5px;">${match.awayTeam}</label>
                                <input type="number" id="predAwayScore" min="0" placeholder="0" 
                                       style="width:100%;padding:10px;border:2px solid #ddd;border-radius:8px;font-size:16px;">
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom:15px;background:#f0f2f5;padding:15px;border-radius:8px;">
                        <label style="font-weight:500;display:block;margin-bottom:10px;">⚡ Chọn kèo chấp</label>
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
                            <div>
                                <label style="display:block;text-align:center;cursor:pointer;padding:8px;background:white;border-radius:5px;border:2px solid #ddd;">
                                    <input type="radio" name="handicapChoice" value="home" checked> 
                                    ${match.homeTeam}
                                </label>
                            </div>
                            <div>
                                <label style="display:block;text-align:center;cursor:pointer;padding:8px;background:white;border-radius:5px;border:2px solid #ddd;">
                                    <input type="radio" name="handicapChoice" value="draw"> 
                                    Hòa
                                </label>
                            </div>
                            <div>
                                <label style="display:block;text-align:center;cursor:pointer;padding:8px;background:white;border-radius:5px;border:2px solid #ddd;">
                                    <input type="radio" name="handicapChoice" value="away"> 
                                    ${match.awayTeam}
                                </label>
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom:20px;">
                        <label style="font-weight:500;display:block;margin-bottom:5px;">⚡ Chọn kèo chấp (mặc định: ${match.handicap || 0})</label>
                        <select id="predHandicap" style="width:100%;padding:10px;border:2px solid #ddd;border-radius:8px;font-size:16px;">
                            <option value="${match.handicap || 0}">Mặc định: ${match.handicap || 0}</option>
                            <option value="0">0 - Đồng banh</option>
                            <option value="0.25">0.25 - Chấp 1/4</option>
                            <option value="0.5">0.5 - Chấp 1/2</option>
                            <option value="0.75">0.75 - Chấp 3/4</option>
                            <option value="1">1 - Chấp 1 trái</option>
                            <option value="1.25">1.25 - Chấp 1 1/4</option>
                            <option value="1.5">1.5 - Chấp 1 1/2</option>
                            <option value="1.75">1.75 - Chấp 1 3/4</option>
                            <option value="2">2 - Chấp 2 trái</option>
                        </select>
                    </div>

                    <button onclick="submitPrediction('${matchId}')" 
                            style="width:100%;padding:14px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;">
                        ✅ Gửi Dự Đoán
                    </button>
                    <button onclick="document.getElementById('predictionModal').remove()" 
                            style="width:100%;padding:10px;margin-top:10px;background:#f0f0f0;color:#666;border:none;border-radius:8px;font-size:14px;cursor:pointer;">
                        ❌ Hủy
                    </button>
                </div>
            </div>
        `;

        // Thêm modal vào body
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer.firstElementChild);

    } catch (error) {
        console.error('❌ Lỗi mở form dự đoán:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}

// ============================================
// SUBMIT PREDICTION
// ============================================
async function submitPrediction(matchId) {
    const homeScore = document.getElementById('predHomeScore').value;
    const awayScore = document.getElementById('predAwayScore').value;
    const handicapChoice = document.querySelector('input[name="handicapChoice"]:checked')?.value || 'draw';
    const userHandicap = parseFloat(document.getElementById('predHandicap').value) || 0;

    if (!homeScore || !awayScore) {
        alert('⚠️ Vui lòng nhập tỷ số!');
        return;
    }

    if (homeScore < 0 || awayScore < 0) {
        alert('⚠️ Tỷ số không được nhỏ hơn 0!');
        return;
    }

    const predManager = new PredictionManager();
    await predManager.savePrediction(matchId, homeScore, awayScore, userHandicap, handicapChoice);
    
    // Đóng modal
    const modal = document.getElementById('predictionModal');
    if (modal) modal.remove();
}