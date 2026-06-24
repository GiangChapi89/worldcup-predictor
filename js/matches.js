// js/matches.js
class MatchManager {
    constructor() {
        this.matches = [];
        this.unsubscribe = null;
    }

    // ============================================
    // LẮNG NGHE DỮ LIỆU TRẬN ĐẤU REAL-TIME
    // ============================================
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

    // ============================================
    // HIỂN THỊ DANH SÁCH TRẬN ĐẤU
    // ============================================
    // js/matches.js - CẬP NHẬT HÀM renderMatches

    renderMatches() {
        const container = document.getElementById('matchList');
        if (!container) return;
        
        if (!this.matches.length) {
            container.innerHTML = '<p>⚠️ Không có trận đấu nào.</p>';
            return;
        }

        // Nhóm các trận đấu theo bảng
        const groupedMatches = this.matches.reduce((groups, match) => {
            const group = match.group || 'Chưa xếp bảng';
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(match);
            return groups;
        }, {});

        let html = '';

        // Sắp xếp các bảng theo thứ tự
        const sortedGroups = Object.keys(groupedMatches).sort();

        for (const groupName of sortedGroups) {
            const matches = groupedMatches[groupName];
            
            // Header của bảng
            html += `
                <div class="group-section">
                    <div class="group-header">
                        <h3 class="group-title">🏆 ${groupName}</h3>
                        <span class="group-count">${matches.length} trận</span>
                    </div>
                    <div class="match-grid">
            `;

            // Hiển thị các trận trong bảng
            matches.forEach(match => {
                const isFinished = match.status === 'finished';
                const isLoggedIn = !!window.currentUserId;
                const handicapDisplay = match.handicap > 0 ? `⚡ Chấp ${match.handicap}` : '⚡ Đồng banh';
                
                // Lấy thông tin bảng đấu
                const groupDisplay = match.group ? `🏆 ${match.group}` : '';

                html += `
                    <div class="match-card">
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
            });

            html += `
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    // ============================================
    // TÍNH ĐIỂM DỰA TRÊN KÈO CHẤP VÀ TỶ SỐ
    // ============================================
    // js/matches.js - CẬP NHẬT HÀM calculatePoints

    async calculatePoints(matchId) {
        console.log('🧮 Bắt đầu tính điểm cho trận:', matchId);
        
        try {
            const db = firebase.firestore();
            
            // Lấy thông tin trận đấu
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

            // ⚠️ KIỂM TRA ĐÃ TÍNH ĐIỂM CHƯA
            if (match.isResultEntered === true) {
                console.log('⚠️ Trận đấu đã được tính điểm rồi! Bỏ qua.');
                return {
                    alreadyCalculated: true,
                    message: 'Trận đấu đã được tính điểm trước đó'
                };
            }

            // Lấy tất cả dự đoán cho trận này
            const predictionsSnap = await db.collection('predictions')
                .where('matchId', '==', matchId)
                .get();

            if (predictionsSnap.empty) {
                console.log('📭 Không có dự đoán nào cho trận này');
                // Đánh dấu đã xử lý để không tính lại
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
                    alreadyCalculated: false
                };
            }

            console.log(`📝 Tìm thấy ${predictionsSnap.size} dự đoán`);

            const batch = db.batch();
            let totalCorrect = 0;
            let totalPoints = 0;
            const results = [];
            let processedCount = 0;

            // Duyệt từng dự đoán
            for (const doc of predictionsSnap.docs) {
                const prediction = doc.data();
                const userId = prediction.userId;
                
                // ⚠️ CHỈ XỬ LÝ DỰ ĐOÁN CHƯA XỬ LÝ
                if (prediction.isProcessed === true) {
                    console.log(`⏭️ Bỏ qua dự đoán đã xử lý của user: ${userId}`);
                    continue;
                }
                
                console.log(`👤 Xử lý dự đoán của user: ${userId}`);
                console.log(`📝 Dự đoán: ${prediction.homeScore} - ${prediction.awayScore}`);
                console.log(`📊 Kết quả thực tế: ${match.homeScore} - ${match.awayScore}`);
                
                // Tính điểm dựa trên kèo chấp và tỷ số
                const result = this.calculateMatchResult(match, prediction);
                console.log(`📊 Kết quả: điểm=${result.points}, đúng=${result.isCorrect}`);
                
                // Cập nhật điểm cho dự đoán
                const predRef = db.collection('predictions').doc(doc.id);
                batch.update(predRef, {
                    points: result.points,
                    isCorrect: result.isCorrect,
                    isProcessed: true,
                    calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Cập nhật số dư cho user
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
                    // Nếu sai, vẫn tăng totalPredictions
                    batch.update(userRef, {
                        totalPredictions: firebase.firestore.FieldValue.increment(1),
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
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

            // Nếu không có dự đoán nào mới để xử lý
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

            // Đánh dấu trận đấu đã tính điểm
            batch.update(matchDoc.ref, {
                isResultEntered: true,
                resultEnteredAt: firebase.firestore.FieldValue.serverTimestamp(),
                pointsCalculated: true,
                calculatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Commit tất cả cập nhật
            await batch.commit();
            
            console.log(`✅ Đã tính điểm cho ${processedCount} dự đoán mới`);
            console.log(`📊 Số dự đoán đúng: ${totalCorrect}`);
            console.log(`💰 Tổng điểm phân phối: ${totalPoints}`);
            
            // Log chi tiết kết quả
            results.forEach(r => {
                console.log(`  👤 ${r.userName}: ${r.points} điểm - ${r.detail}`);
            });

            // Cập nhật lại bảng xếp hạng
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

        // 1. Kiểm tra dự đoán đúng tỷ số
        const isCorrectScore = (predHome === actualHome && predAway === actualAway);
        
        // 2. Kiểm tra kèo chấp
        const actualDiff = actualHome - actualAway;
        let isCorrectHandicap = false;
        let detail = '';
        let points = 0;

        // Tính điểm dựa trên kèo chấp
        switch(handicapChoice) {
            case 'home': // Chọn đội nhà
                if (actualDiff > userHandicap) {
                    isCorrectHandicap = true;
                    detail = `✅ ${match.homeTeam} thắng cách biệt ${actualDiff} > ${userHandicap}`;
                } else if (actualDiff > 0 && actualDiff <= userHandicap) {
                    // Thắng nhưng không đủ chấp
                    isCorrectHandicap = false;
                    detail = `⚠️ ${match.homeTeam} thắng nhưng không đủ chấp (${actualDiff} ≤ ${userHandicap})`;
                    points = 0.5;
                } else {
                    isCorrectHandicap = false;
                    detail = `❌ ${match.homeTeam} không thắng đủ chấp`;
                }
                break;
                
            case 'away': // Chọn đội khách
                if (actualDiff < -userHandicap) {
                    isCorrectHandicap = true;
                    detail = `✅ ${match.awayTeam} thắng cách biệt ${Math.abs(actualDiff)} > ${userHandicap}`;
                } else if (actualDiff < 0 && Math.abs(actualDiff) <= userHandicap) {
                    // Thắng nhưng không đủ chấp
                    isCorrectHandicap = false;
                    detail = `⚠️ ${match.awayTeam} thắng nhưng không đủ chấp (${Math.abs(actualDiff)} ≤ ${userHandicap})`;
                    points = 0.5;
                } else {
                    isCorrectHandicap = false;
                    detail = `❌ ${match.awayTeam} không thắng đủ chấp`;
                }
                break;
                
            case 'draw': // Chọn hòa
                if (Math.abs(actualDiff) < userHandicap) {
                    isCorrectHandicap = true;
                    detail = `✅ Hòa với chấp ${userHandicap} (diff: ${actualDiff})`;
                } else if (Math.abs(actualDiff) < userHandicap * 2) {
                    // Gần hòa
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

        // 3. Tổng hợp kết quả
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
    // NHẬP KẾT QUẢ TRẬN ĐẤU (ADMIN)
    // ============================================
    async enterMatchResult(matchId, homeScore, awayScore, adminNote = '') {
        try {
            const db = firebase.firestore();
            const user = firebase.auth().currentUser;
            
            if (!user) {
                throw new Error('Vui lòng đăng nhập để nhập kết quả');
            }

            // Kiểm tra quyền admin
            const isAdmin = await this.checkIsAdmin(user);
            if (!isAdmin) {
                throw new Error('Bạn không có quyền nhập kết quả');
            }

            // Lấy thông tin trận đấu
            const matchRef = db.collection('matches').doc(matchId);
            const matchDoc = await matchRef.get();
            
            if (!matchDoc.exists) {
                throw new Error('Không tìm thấy trận đấu');
            }

            const match = matchDoc.data();
            
            if (match.status === 'finished') {
                throw new Error('Trận đấu đã có kết quả');
            }

            // Validate tỷ số
            if (homeScore < 0 || awayScore < 0) {
                throw new Error('Tỷ số không được nhỏ hơn 0');
            }

            // Cập nhật kết quả
            await matchRef.update({
                homeScore: parseInt(homeScore),
                awayScore: parseInt(awayScore),
                status: 'finished',
                isResultEntered: false,
                resultEnteredBy: user.uid,
                resultEnteredAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Lưu lịch sử nhập kết quả
            await db.collection('match_results').add({
                matchId: matchId,
                homeScore: parseInt(homeScore),
                awayScore: parseInt(awayScore),
                enteredBy: user.uid,
                enteredByEmail: user.email,
                note: adminNote || `Nhập kết quả ${match.homeTeam} vs ${match.awayTeam}`,
                enteredAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('✅ Đã nhập kết quả trận đấu');

            // Tự động tính điểm
            const result = await this.calculatePoints(matchId);

            return {
                success: true,
                message: 'Đã nhập kết quả và tính điểm thành công',
                result: result
            };

        } catch (error) {
            console.error('❌ Lỗi nhập kết quả:', error);
            throw error;
        }
    }

    // ============================================
    // KIỂM TRA QUYỀN ADMIN
    // ============================================
    async checkIsAdmin(user) {
        if (!user) return false;
        
        try {
            const db = firebase.firestore();
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                return data.role === 'admin' || data.isAdmin === true;
            }
        } catch (error) {
            console.error('❌ Lỗi kiểm tra admin:', error);
        }
        
        return false;
    }

    // ============================================
    // XÓA KẾT QUẢ TRẬN ĐẤU (ADMIN)
    // ============================================
    async deleteMatchResult(matchId) {
        try {
            const db = firebase.firestore();
            const user = firebase.auth().currentUser;
            
            if (!user) {
                throw new Error('Vui lòng đăng nhập');
            }

            const isAdmin = await this.checkIsAdmin(user);
            if (!isAdmin) {
                throw new Error('Bạn không có quyền xóa kết quả');
            }

            const matchRef = db.collection('matches').doc(matchId);
            const matchDoc = await matchRef.get();
            
            if (!matchDoc.exists) {
                throw new Error('Không tìm thấy trận đấu');
            }

            const match = matchDoc.data();
            
            if (match.status !== 'finished') {
                throw new Error('Trận đấu chưa có kết quả để xóa');
            }
            
            // Reset kết quả
            await matchRef.update({
                homeScore: null,
                awayScore: null,
                status: 'upcoming',
                isResultEntered: false,
                resultEnteredBy: null,
                resultEnteredAt: null,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Xóa các dự đoán đã xử lý
            const predictionsSnap = await db.collection('predictions')
                .where('matchId', '==', matchId)
                .where('isProcessed', '==', true)
                .get();

            const batch = db.batch();
            
            predictionsSnap.forEach(doc => {
                batch.update(doc.ref, {
                    points: 0,
                    isCorrect: false,
                    isProcessed: false,
                    calculatedAt: null
                });
            });

            // Reset lại số dư cho user
            const allPredictions = await db.collection('predictions')
                .where('matchId', '==', matchId)
                .get();

            const userBatch = db.batch();
            const userPoints = new Map();
            
            allPredictions.forEach(doc => {
                const pred = doc.data();
                if (!userPoints.has(pred.userId)) {
                    userPoints.set(pred.userId, {
                        points: pred.points || 0,
                        isCorrect: pred.isCorrect || false
                    });
                }
            });

            // Trả lại điểm cho user
            for (const [userId, data] of userPoints) {
                const userRef = db.collection('users').doc(userId);
                if (data.points > 0) {
                    userBatch.update(userRef, {
                        balance: firebase.firestore.FieldValue.increment(-data.points),
                        totalPoints: firebase.firestore.FieldValue.increment(-data.points),
                        correctPredictions: firebase.firestore.FieldValue.increment(data.isCorrect ? -1 : 0)
                    });
                } else {
                    userBatch.update(userRef, {
                        balance: firebase.firestore.FieldValue.increment(1)
                    });
                }
            }

            // Xóa lịch sử dự đoán cho trận này
            const historySnap = await db.collection('user_predictions_history')
                .where('matchId', '==', matchId)
                .get();

            historySnap.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            await userBatch.commit();

            console.log('✅ Đã xóa kết quả và reset dữ liệu');

            // Cập nhật lại bảng xếp hạng
            if (window.statisticsManager) {
                await window.statisticsManager.loadRanking();
            }

            return {
                success: true,
                message: 'Đã xóa kết quả và reset dữ liệu thành công'
            };

        } catch (error) {
            console.error('❌ Lỗi xóa kết quả:', error);
            throw error;
        }
    }

    // ============================================
    // XEM CHI TIẾT TRẬN ĐẤU
    // ============================================
    async viewMatchHistory(matchId) {
        try {
            const db = firebase.firestore();
            
            // Lấy thông tin trận đấu
            const matchDoc = await db.collection('matches').doc(matchId).get();
            if (!matchDoc.exists) {
                alert('❌ Không tìm thấy trận đấu');
                return;
            }
            const match = matchDoc.data();

            // Lấy dự đoán của user hiện tại
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

            // Lấy lịch sử nhập kết quả
            const resultSnap = await db.collection('match_results')
                .where('matchId', '==', matchId)
                .orderBy('enteredAt', 'desc')
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

            // Hiển thị modal chi tiết
            this.showMatchDetailModal(match, prediction, resultInfo);

        } catch (error) {
            console.error('❌ Lỗi xem chi tiết:', error);
            alert('❌ Lỗi: ' + error.message);
        }
    }

    // ============================================
    // HIỂN THỊ MODAL CHI TIẾT
    // ============================================
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

    // ============================================
    // DỪNG LẮNG NGHE
    // ============================================
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

// Export cho các file khác sử dụng
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MatchManager;
}