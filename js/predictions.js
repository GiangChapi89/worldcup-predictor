// js/predictions.js
class PredictionManager {
    constructor() {
        this.predictions = [];
    }

    // CẬP NHẬT savePrediction
    async savePrediction(matchId, homeScore, awayScore, userHandicap, handicapChoice) {
        if (!window.currentUserId) {
            alert('Vui lòng đăng nhập để dự đoán!');
            return;
        }

        try {
            // Kiểm tra đã dự đoán chưa
            const existing = await db.collection('predictions')
                .where('matchId', '==', matchId)
                .where('userId', '==', window.currentUserId)
                .get();

            if (!existing.empty) {
                if (!confirm('Bạn đã dự đoán trận này. Bạn có muốn cập nhật dự đoán mới?')) {
                    return;
                }
                const batch = db.batch();
                existing.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }

            // Lấy thông tin trận đấu
            const matchDoc = await db.collection('matches').doc(matchId).get();
            const match = matchDoc.data();
            
            const predictionData = {
                matchId: matchId,
                userId: window.currentUserId,
                userName: window.currentUserName || 'Anonymous',
                homeScore: parseInt(homeScore),
                awayScore: parseInt(awayScore),
                userHandicap: userHandicap !== undefined ? parseFloat(userHandicap) : (match.handicap || 0),
                handicapChoice: handicapChoice || 'draw',
                points: 0,
                isCorrect: false,
                isProcessed: false, // Đánh dấu chưa xử lý
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await db.collection('predictions').add(predictionData);
            console.log('✅ Đã lưu dự đoán:', docRef.id);
            
            // Cập nhật totalPredictions cho user
            const userRef = db.collection('users').doc(window.currentUserId);
            await userRef.update({
                totalPredictions: firebase.firestore.FieldValue.increment(1)
            });

            alert('✅ Dự đoán thành công!');
            
            // Reload matches để cập nhật giao diện
            if (window.matchManager) {
                window.matchManager.renderMatches();
            }
            
            this.loadPredictions();

        } catch (error) {
            console.error('❌ Lỗi lưu dự đoán:', error);
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
            console.error('❌ Lỗi tải dự đoán:', error);
            return [];
        }
    }

    async getUserPredictions(userId) {
        try {
            const snapshot = await db.collection('predictions')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .get();
            
            const userPredictions = [];
            snapshot.forEach(doc => {
                userPredictions.push({ id: doc.id, ...doc.data() });
            });
            
            return userPredictions;
        } catch (error) {
            console.error('❌ Lỗi tải dự đoán user:', error);
            return [];
        }
    }
}

async function predictMatch(matchId) {
    if (!window.currentUserId) {
        document.getElementById('loginModal').style.display = 'block';
        return;
    }

    try {
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

        const modalHtml = `
            <div id="predictionModal" class="modal" style="display:block;">
                <div class="modal-content" style="max-width: 450px; max-height: 90vh; overflow-y: auto;">
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
                                <label style="display:block;text-align:center;cursor:pointer;padding:8px;background:white;border-radius:5px;border:2px solid #ddd;transition:all 0.3s;" 
                                       id="handicapHomeLabel" onclick="selectHandicapChoice('home')">
                                    <input type="radio" name="handicapChoice" value="home" id="handicapHome"> 
                                    ${match.homeTeam}
                                </label>
                            </div>
                            <div>
                                <label style="display:block;text-align:center;cursor:pointer;padding:8px;background:white;border-radius:5px;border:2px solid #ddd;transition:all 0.3s;" 
                                       id="handicapDrawLabel" onclick="selectHandicapChoice('draw')">
                                    <input type="radio" name="handicapChoice" value="draw" id="handicapDraw" checked> 
                                    Hòa
                                </label>
                            </div>
                            <div>
                                <label style="display:block;text-align:center;cursor:pointer;padding:8px;background:white;border-radius:5px;border:2px solid #ddd;transition:all 0.3s;" 
                                       id="handicapAwayLabel" onclick="selectHandicapChoice('away')">
                                    <input type="radio" name="handicapChoice" value="away" id="handicapAway"> 
                                    ${match.awayTeam}
                                </label>
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom:20px;">
                        <label style="font-weight:500;display:block;margin-bottom:5px;">⚡ Chọn kèo chấp</label>
                        <select id="predHandicap" style="width:100%;padding:10px;border:2px solid #ddd;border-radius:8px;font-size:16px;">
                            <!-- Sẽ được cập nhật bằng JavaScript -->
                        </select>
                        <div style="font-size:12px;margin-top:5px;" id="handicapNote">
                            ℹ️ Lưu ý: Khi chọn "Hòa", chỉ có kèo đồng banh (0)
                        </div>
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

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer.firstElementChild);

        setTimeout(() => {
            updateHandicapOptions('draw', match.handicap || 0);
            
            document.querySelectorAll('input[name="handicapChoice"]').forEach(radio => {
                radio.addEventListener('change', function() {
                    const choice = this.value;
                    updateHandicapOptions(choice, match.handicap || 0);
                    updateLabelStyles(choice);
                });
            });
        }, 100);

    } catch (error) {
        console.error('❌ Lỗi mở form dự đoán:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}

function updateHandicapOptions(choice, defaultHandicap) {
    const select = document.getElementById('predHandicap');
    const note = document.getElementById('handicapNote');
    
    if (!select) return;
    
    select.innerHTML = '';
    
    let options = [];
    
    if (choice === 'draw') {
        options = [
            { value: 0, label: '0 - Đồng banh' }
        ];
        if (note) {
            note.innerHTML = `
                <span style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:16px;">ℹ️</span>
                    <span style="font-weight:600;">Lưu ý:</span>
                    <span>Khi chọn <strong>"Hòa"</strong>, chỉ được chọn kèo <strong>Đồng banh (0)</strong></span>
                </span>
            `;
            note.style.color = '#0c5460';
            note.style.background = '#d1ecf1';
            note.style.border = '2px solid #17a2b8';
            note.style.borderRadius = '8px';
            note.style.padding = '10px 14px';
            note.style.fontSize = '13px';
            note.style.boxShadow = '0 2px 8px rgba(23, 162, 184, 0.2)';
            note.style.fontWeight = '500';
        }
    } else {
        options = [
            { value: 0, label: '0 - Đồng banh' },
            { value: 0.25, label: '0.25 - Chấp 1/4' },
            { value: 0.5, label: '0.5 - Chấp 1/2' },
            { value: 0.75, label: '0.75 - Chấp 3/4' },
            { value: 1, label: '1 - Chấp 1 trái' },
            { value: 1.25, label: '1.25 - Chấp 1 1/4' },
            { value: 1.5, label: '1.5 - Chấp 1 1/2' },
            { value: 1.75, label: '1.75 - Chấp 1 3/4' },
            { value: 2, label: '2 - Chấp 2 trái' }
        ];
        if (note) {
            note.innerHTML = `
                <span style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:16px;">✅</span>
                    <span>Chọn kèo chấp phù hợp với dự đoán của bạn</span>
                </span>
            `;
            note.style.color = '#155724';
            note.style.background = '#d4edda';
            note.style.border = '2px solid #28a745';
            note.style.borderRadius = '8px';
            note.style.padding = '10px 14px';
            note.style.fontSize = '13px';
            note.style.boxShadow = '0 2px 8px rgba(40, 167, 69, 0.2)';
        }
    }
    
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        select.appendChild(option);
    });
    
    if (choice === 'draw') {
        select.value = 0;
    } else {
        const exists = options.some(opt => opt.value === defaultHandicap);
        select.value = exists ? defaultHandicap : 0;
    }
}

function selectHandicapChoice(choice) {
    const homeRadio = document.getElementById('handicapHome');
    const drawRadio = document.getElementById('handicapDraw');
    const awayRadio = document.getElementById('handicapAway');
    
    if (choice === 'home') {
        homeRadio.checked = true;
        drawRadio.checked = false;
        awayRadio.checked = false;
    } else if (choice === 'draw') {
        homeRadio.checked = false;
        drawRadio.checked = true;
        awayRadio.checked = false;
    } else if (choice === 'away') {
        homeRadio.checked = false;
        drawRadio.checked = false;
        awayRadio.checked = true;
    }
    
    const event = new Event('change');
    document.querySelector(`input[name="handicapChoice"][value="${choice}"]`)?.dispatchEvent(event);
    
    updateLabelStyles(choice);
}

function updateLabelStyles(choice) {
    const labels = {
        home: document.getElementById('handicapHomeLabel'),
        draw: document.getElementById('handicapDrawLabel'),
        away: document.getElementById('handicapAwayLabel')
    };
    
    Object.values(labels).forEach(label => {
        if (label) {
            label.style.borderColor = '#ddd';
            label.style.background = 'white';
        }
    });
    
    if (labels[choice]) {
        labels[choice].style.borderColor = '#667eea';
        labels[choice].style.background = '#f0f2ff';
    }
}

async function submitPrediction(matchId) {
    const homeScore = document.getElementById('predHomeScore').value;
    const awayScore = document.getElementById('predAwayScore').value;
    const handicapChoice = document.querySelector('input[name="handicapChoice"]:checked')?.value || 'draw';
    const userHandicap = parseFloat(document.getElementById('predHandicap').value) || 0;

    if (!homeScore || !awayScore) {
        alert('⚠️ Vui lòng nhập tỷ số!');
        return;
    }

    if (parseInt(homeScore) < 0 || parseInt(awayScore) < 0) {
        alert('⚠️ Tỷ số không được nhỏ hơn 0!');
        return;
    }

    if (handicapChoice === 'draw' && userHandicap !== 0) {
        alert('⚠️ Khi chọn "Hòa", kèo chấp phải là đồng banh (0)!');
        return;
    }

    const predManager = new PredictionManager();
    await predManager.savePrediction(matchId, homeScore, awayScore, userHandicap, handicapChoice);
    
    const modal = document.getElementById('predictionModal');
    if (modal) modal.remove();
}