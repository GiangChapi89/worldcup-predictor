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

    // SỬA LẠI TOÀN BỘ renderMatches
    renderMatches() {
        const container = document.getElementById('matchList');
        if (!container) return;
        
        if (!this.matches.length) {
            container.innerHTML = '<p>⚠️ Không có trận đấu nào.</p>';
            return;
        }

        // Lấy user hiện tại
        const user = firebase.auth().currentUser;
        
        // Hàm render sau khi có dữ liệu dự đoán
        const renderWithPredictions = (predictions) => {
            const predictedMatchIds = predictions.map(p => p.matchId);
            console.log('📊 Dự đoán của user:', predictedMatchIds);
            
            const groupedMatches = this.matches.reduce((groups, match) => {
                const group = match.group || 'Chưa xếp bảng';
                if (!groups[group]) {
                    groups[group] = [];
                }
                groups[group].push(match);
                return groups;
            }, {});

            let html = '';
            const sortedGroups = Object.keys(groupedMatches).sort();

            for (const groupName of sortedGroups) {
                const matches = groupedMatches[groupName];
                
                html += `
                    <div class="group-section">
                        <div class="group-header">
                            <h3 class="group-title">🏆 ${groupName}</h3>
                            <span class="group-count">${matches.length} trận</span>
                        </div>
                        <div class="match-grid">
                `;

                matches.forEach(match => {
                    const isFinished = match.status === 'finished';
                    const isLoggedIn = !!window.currentUserId;
                    const handicapDisplay = match.handicap > 0 ? `⚡ Chấp ${match.handicap}` : '⚡ Đồng banh';
                    const isPredicted = predictedMatchIds.includes(match.id);
                    
                    // Xác định class và style cho card
                    let cardClass = 'match-card';
                    let cardStyle = '';
                    let badgeHtml = '';
                    let buttonHtml = '';
                    
                    if (isPredicted) {
                        cardClass += ' predicted';
                        cardStyle = 'border-left: 4px solid #17a2b8; background: #f0f8ff;';
                        badgeHtml = `
                            <div style="position: absolute; top: 10px; right: 10px; background: #17a2b8; color: white; padding: 2px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; z-index: 10;">
                                📝 Đã dự đoán
                            </div>
                        `;
                    }
                    
                    // Nút dự đoán
                    if (!isFinished) {
                        if (isPredicted) {
                            buttonHtml = `
                                <button class="predict-btn predicted" disabled style="background: #17a2b8; opacity: 0.8; cursor: not-allowed;">
                                    ✅ Đã dự đoán
                                </button>
                            `;
                        } else if (isLoggedIn) {
                            buttonHtml = `
                                <button class="predict-btn" onclick="predictMatch('${match.id}')">
                                    📝 Dự Đoán
                                </button>
                            `;
                        } else {
                            buttonHtml = `
                                <button class="predict-btn" disabled>
                                    🔒 Đăng nhập để dự đoán
                                </button>
                            `;
                        }
                    } else {
                        buttonHtml = `
                            <button class="predict-btn detail-btn" onclick="viewMatchHistory('${match.id}')">
                                📊 Xem chi tiết
                            </button>
                        `;
                    }
                    
                    html += `
                        <div class="${cardClass}" style="${cardStyle}">
                            ${badgeHtml}
                            <div class="match-header">
                                <div class="match-info">
                                    <span class="team">${match.homeTeam || '?'}</span>
                                    <span class="vs">vs</span>
                                    <span class="team">${match.awayTeam || '?'}</span>
                                </div>
                                <div class="match-badge">
                                    <span class="match-status-badge ${isFinished ? 'finished' : 'upcoming'}">
                                        ${isFinished ? '✅ Đã kết thúc' : '⏳ Sắp diễn ra'}
                                    </span>
                                    ${match.group ? `<span class="group-badge">${match.group}</span>` : ''}
                                </div>
                            </div>
                            <div class="match-details">
                                <span>📅 ${match.date || 'N/A'}</span>
                                <span>⏰ ${match.time || 'N/A'}</span>
                                <span>${handicapDisplay}</span>
                                ${match.stage ? `<span>🏷️ ${match.stage}</span>` : ''}
                            </div>
                            <div class="match-score ${isFinished ? 'finished' : 'upcoming'}">
                                ${isFinished ? 
                                    `${match.homeScore} - ${match.awayScore} 🏆` : 
                                    '⏳ Chưa diễn ra'}
                            </div>
                            ${buttonHtml}
                        </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            }

            container.innerHTML = html;
        };

        // Nếu có user, lấy dự đoán của họ
        if (user) {
            db.collection('predictions')
                .where('userId', '==', user.uid)
                .get()
                .then((snapshot) => {
                    const predictions = [];
                    snapshot.forEach(doc => predictions.push(doc.data()));
                    renderWithPredictions(predictions);
                })
                .catch((error) => {
                    console.error('❌ Lỗi lấy dự đoán:', error);
                    renderWithPredictions([]);
                });
        } else {
            renderWithPredictions([]);
        }
    }

    // ============================================
    // TÍNH ĐIỂM
    // ============================================
    async calculatePoints(matchId) {
        console.log('🧮 Bắt đầu tính điểm cho trận:', matchId);
        
        try {
            const db = firebase.firestore();
            
            const matchDoc = await db.collection('matches').doc(matchId).get();
            if (!matchDoc.exists) {
                console.error('❌ Không tìm thấy trận đấu');
                return null;
            }
            
            const match = matchDoc.data();
            console.log('📊 Match data:', match);
            
            if (match.status !== 'finished') {
                console.log('⚠️ Trận đấu chưa kết thúc, bỏ qua tính điểm');
                return null;
            }

            if (match.isResultEntered === true) {
                console.log('⚠️ Trận đấu đã được tính điểm rồi! Bỏ qua.');
                return {
                    alreadyCalculated: true,
                    message: 'Trận đấu đã được tính điểm trước đó'
                };
            }

            const predictionsSnap = await db.collection('predictions')
                .where('matchId', '==', matchId)
                .get();

            if (predictionsSnap.empty) {
                console.log('📭 Không có dự đoán nào cho trận này');
                await matchDoc.ref.update({
                    isResultEntered: true,
                    resultEnteredAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                return {
                    totalPredictions: 0,
                    totalCorrect: 0,
                    totalPoints: 0,
                    alreadyCalculated: false
                };
            }

            console.log(`📝 Tìm thấy ${predictionsSnap.size} dự đoán`);

            const batch = db.batch();
            let totalCorrect = 0;
            let totalPoints = 0;
            const results = [];
            let processedCount = 0;

            for (const doc of predictionsSnap.docs) {
                const prediction = doc.data();
                const userId = prediction.userId;
                
                if (prediction.isProcessed === true) {
                    console.log(`⏭️ Bỏ qua dự đoán đã xử lý của user: ${userId}`);
                    continue;
                }
                
                console.log(`👤 Xử lý dự đoán của user: ${userId}`);
                console.log(`📝 Dự đoán: ${prediction.homeScore} - ${prediction.awayScore}`);
                console.log(`📊 Kết quả thực tế: ${match.homeScore} - ${match.awayScore}`);
                
                const result = this.calculateMatchResult(match, prediction);
                console.log(`📊 Kết quả: điểm=${result.points}, đúng=${result.isCorrect}`);
                
                const predRef = db.collection('predictions').doc(doc.id);
                batch.update(predRef, {
                    points: result.points,
                    isCorrect: result.isCorrect,
                    isProcessed: true,
                    calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                const userRef = db.collection('users').doc(userId);
                
                if (result.points > 0) {
                    batch.update(userRef, {
                        balance: firebase.firestore.FieldValue.increment(result.points),
                        totalPoints: firebase.firestore.FieldValue.increment(result.points),
                        correctPredictions: firebase.firestore.FieldValue.increment(1),
                        totalPredictions: firebase.firestore.FieldValue.increment(1),
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    totalCorrect++;
                    totalPoints += result.points;
                } else {
                    batch.update(userRef, {
                        totalPredictions: firebase.firestore.FieldValue.increment(1),
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

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
                    detail: result.detail,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                const historyRef = db.collection('user_predictions_history').doc();
                batch.set(historyRef, historyData);

                results.push({
                    userId: userId,
                    userName: prediction.userName || 'Unknown',
                    points: result.points,
                    isCorrect: result.isCorrect,
                    detail: result.detail
                });
                
                processedCount++;
            }

            if (processedCount === 0) {
                console.log('📭 Không có dự đoán mới để xử lý');
                await matchDoc.ref.update({
                    isResultEntered: true,
                    resultEnteredAt: firebase.firestore.FieldValue.serverTimestamp(),
                    pointsCalculated: true,
                    calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                return {
                    totalPredictions: 0,
                    totalCorrect: 0,
                    totalPoints: 0,
                    alreadyCalculated: false,
                    noNewPredictions: true
                };
            }

            batch.update(matchDoc.ref, {
                isResultEntered: true,
                resultEnteredAt: firebase.firestore.FieldValue.serverTimestamp(),
                pointsCalculated: true,
                calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            await batch.commit();
            
            console.log(`✅ Đã tính điểm cho ${processedCount} dự đoán mới`);
            console.log(`📊 Số dự đoán đúng: ${totalCorrect}`);
            console.log(`💰 Tổng điểm phân phối: ${totalPoints}`);
            
            results.forEach(r => {
                console.log(`  👤 ${r.userName}: ${r.points} điểm - ${r.detail}`);
            });

            if (window.statisticsManager) {
                await window.statisticsManager.loadRanking();
            }

            return {
                totalPredictions: processedCount,
                totalCorrect: totalCorrect,
                totalPoints: totalPoints,
                results: results,
                alreadyCalculated: false,
                noNewPredictions: false
            };

        } catch (error) {
            console.error('❌ Lỗi tính điểm chi tiết:', error);
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

        const isCorrectScore = (predHome === actualHome && predAway === actualAway);
        
        const actualDiff = actualHome - actualAway;
        let isCorrectHandicap = false;
        let detail = '';
        let points = 0;

        switch(handicapChoice) {
            case 'home':
                if (actualDiff > userHandicap) {
                    isCorrectHandicap = true;
                    detail = `✅ ${match.homeTeam} thắng cách biệt ${actualDiff} > ${userHandicap}`;
                } else if (actualDiff > 0 && actualDiff <= userHandicap) {
                    isCorrectHandicap = false;
                    detail = `⚠️ ${match.homeTeam} thắng nhưng không đủ chấp (${actualDiff} ≤ ${userHandicap})`;
                    points = 0.5;
                } else {
                    isCorrectHandicap = false;
                    detail = `❌ ${match.homeTeam} không thắng đủ chấp`;
                }
                break;
                
            case 'away':
                if (actualDiff < -userHandicap) {
                    isCorrectHandicap = true;
                    detail = `✅ ${match.awayTeam} thắng cách biệt ${Math.abs(actualDiff)} > ${userHandicap}`;
                } else if (actualDiff < 0 && Math.abs(actualDiff) <= userHandicap) {
                    isCorrectHandicap = false;
                    detail = `⚠️ ${match.awayTeam} thắng nhưng không đủ chấp (${Math.abs(actualDiff)} ≤ ${userHandicap})`;
                    points = 0.5;
                } else {
                    isCorrectHandicap = false;
                    detail = `❌ ${match.awayTeam} không thắng đủ chấp`;
                }
                break;
                
            case 'draw':
                if (Math.abs(actualDiff) < userHandicap) {
                    isCorrectHandicap = true;
                    detail = `✅ Hòa với chấp ${userHandicap} (diff: ${actualDiff})`;
                } else if (Math.abs(actualDiff) < userHandicap * 2) {
                    isCorrectHandicap = false;
                    detail = `⚠️ Gần hòa nhưng không đủ (diff: ${actualDiff})`;
                    points = 0.5;
                } else {
                    isCorrectHandicap = false;
                    detail = `❌ Không hòa (diff: ${actualDiff})`;
                }
                break;
                
            default:
                isCorrectHandicap = true;
                detail = 'Không chọn kèo chấp';
        }

        if (isCorrectScore && isCorrectHandicap) {
            points = 1;
            detail = `✅ Đúng tỷ số (${predHome}-${predAway}) và đúng kèo chấp! +1 điểm`;
        } else if (isCorrectScore && !isCorrectHandicap) {
            points = 0.5;
            detail = `⚠️ Đúng tỷ số (${predHome}-${predAway}) nhưng sai kèo chấp! +0.5 điểm`;
        } else if (!isCorrectScore && isCorrectHandicap) {
            points = 0.5;
            detail = `⚠️ Sai tỷ số nhưng đúng kèo chấp! +0.5 điểm`;
        } else {
            points = 0;
            detail = `❌ Sai tỷ số và sai kèo chấp! 0 điểm`;
        }

        return {
            points: points,
            isCorrect: points >= 0.5,
            isCorrectScore: isCorrectScore,
            isCorrectHandicap: isCorrectHandicap,
            detail: detail
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

            const user = firebase.auth().currentUser;
            if (!user) {
                alert('Vui lòng đăng nhập để xem chi tiết');
                return;
            }

            const predSnap = await db.collection('predictions')
                .where('matchId', '==', matchId)
                .where('userId', '==', user.uid)
                .get();

            let prediction = null;
            if (!predSnap.empty) {
                prediction = predSnap.docs[0].data();
            }

            const resultSnap = await db.collection('match_results')
                .where('matchId', '==', matchId)
                .limit(1)
                .get();

            let resultInfo = 'Chưa có';
            if (!resultSnap.empty) {
                const result = resultSnap.docs[0].data();
                resultInfo = `
                    Nhập bởi: ${result.enteredByEmail || 'Admin'}<br>
                    Thời gian: ${result.enteredAt?.toDate?.()?.toLocaleString() || 'N/A'}<br>
                    Ghi chú: ${result.note || 'Không có'}
                `;
            }

            this.showMatchDetailModal(match, prediction, resultInfo);

        } catch (error) {
            console.error('❌ Lỗi xem chi tiết:', error);
            alert('❌ Lỗi: ' + error.message);
        }
    }

    showMatchDetailModal(match, prediction, resultInfo) {
        const modalHtml = `
            <div id="matchDetailModal" class="modal" style="display:block;">
                <div class="modal-content" style="max-width: 600px; max-height: 90vh; overflow-y: auto;">
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
                                ${match.status === 'finished' ? 
                                    `${match.homeScore} - ${match.awayScore}` : 
                                    '⏳ Chưa có kết quả'}
                            </div>
                        </div>
                    </div>

                    ${match.status === 'finished' ? `
                        <div style="margin-top:15px;background:#e8f4fd;padding:15px;border-radius:8px;">
                            <div style="font-weight:bold;color:#666;">📝 Lịch sử nhập kết quả</div>
                            <div style="font-size:0.9rem;margin-top:5px;">${resultInfo}</div>
                        </div>
                    ` : ''}

                    ${prediction ? `
                        <div style="margin-top:20px;padding:15px;border-radius:8px;background:${prediction.isCorrect ? '#d4edda' : '#f8d7da'};">
                            <h3 style="margin-bottom:10px;">📝 Dự đoán của bạn</h3>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                                <div><strong>Dự đoán:</strong> ${prediction.homeScore} - ${prediction.awayScore}</div>
                                <div><strong>Kèo chấp:</strong> ${prediction.userHandicap || match.handicap || 0}</div>
                                <div><strong>Chọn:</strong> ${prediction.handicapChoice || 'draw'}</div>
                                <div><strong>Điểm:</strong> ${prediction.points || 0}</div>
                            </div>
                            ${prediction.isProcessed ? `
                                <div style="margin-top:10px;font-weight:bold;color:${prediction.isCorrect ? '#28a745' : '#dc3545'};">
                                    ${prediction.isCorrect ? '✅ Dự đoán đúng!' : '❌ Dự đoán sai'}
                                </div>
                                ${prediction.calculatedAt ? `
                                    <div style="margin-top:5px;font-size:0.8rem;color:#888;">
                                        Tính điểm lúc: ${prediction.calculatedAt?.toDate?.()?.toLocaleString() || 'N/A'}
                                    </div>
                                ` : ''}
                            ` : `
                                <div style="margin-top:10px;font-weight:bold;color:#ffc107;">
                                    ⏳ Chờ tính điểm...
                                </div>
                            `}
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

async function viewMatchHistory(matchId) {
    const matchManager = new MatchManager();
    await matchManager.viewMatchHistory(matchId);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MatchManager;
}

console.log('✅ MatchManager loaded successfully');