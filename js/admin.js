// js/admin.js - CẬP NHẬT HOÀN CHỈNH

console.log('🔍 Admin.js loaded');

// ============================================
// DANH SÁCH ADMIN
// ============================================
const ADMIN_EMAILS = [
    'songdaytronglong@gmail.com',
    'admin@gmail.com'
];

// ============================================
// KIỂM TRA QUYỀN ADMIN
// ============================================
async function checkAdmin() {
    console.log('🔍 Checking admin permissions...');
    
    try {
        // Đợi auth load
        const user = await new Promise((resolve) => {
            const unsubscribe = firebase.auth().onAuthStateChanged(u => {
                unsubscribe();
                resolve(u);
            });
        });

        console.log('📧 Current user:', user?.email);

        if (!user) {
            document.body.innerHTML = `
                <div style="text-align:center;padding:50px;font-family:Arial,sans-serif;">
                    <h2>🔐 Vui lòng đăng nhập</h2>
                    <p style="margin:20px 0;color:#666;">Bạn cần đăng nhập để truy cập trang admin</p>
                    <a href="index.html" style="display:inline-block;padding:12px 30px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:8px;text-decoration:none;font-weight:600;">← Về trang chủ</a>
                </div>
            `;
            return false;
        }

        if (!ADMIN_EMAILS.includes(user.email)) {
            document.body.innerHTML = `
                <div style="text-align:center;padding:50px;font-family:Arial,sans-serif;">
                    <h2>⛔ Không có quyền truy cập</h2>
                    <p style="margin:20px 0;color:#666;">Tài khoản <strong>${user.email}</strong> không có quyền admin</p>
                    <a href="index.html" style="display:inline-block;padding:12px 30px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:8px;text-decoration:none;font-weight:600;">← Về trang chủ</a>
                </div>
            `;
            return false;
        }

        // ✅ Admin
        console.log('✅ Admin verified:', user.email);
        
        const nameEl = document.getElementById('adminName');
        if (nameEl) {
            nameEl.textContent = '👤 ' + (user.displayName || user.email);
        }
        
        // Hiển thị container
        const container = document.querySelector('.admin-container');
        if (container) {
            container.style.display = 'block';
        }
        
        // Load dữ liệu
        await loadDashboard();
        await loadMatches();
        await loadUsers();
        await loadPredictions();
        await loadLogs();
        
        return true;
        
    } catch (error) {
        console.error('❌ Lỗi:', error);
        return false;
    }
}

// ============================================
// LOAD DASHBOARD
// ============================================
async function loadDashboard() {
    try {
        const db = firebase.firestore();
        const [usersSnap, matchesSnap, predSnap] = await Promise.all([
            db.collection('users').get(),
            db.collection('matches').get(),
            db.collection('predictions').get()
        ]);
        
        document.getElementById('totalUsers').textContent = usersSnap.size || 0;
        document.getElementById('totalMatches').textContent = matchesSnap.size || 0;
        document.getElementById('totalPredictions').textContent = predSnap.size || 0;
        
        let totalPoints = 0;
        usersSnap.forEach(doc => {
            totalPoints += doc.data().totalPoints || 0;
        });
        document.getElementById('totalPoints').textContent = totalPoints;
        
        await loadRecentActivity();
        
    } catch (error) {
        console.error('Lỗi load dashboard:', error);
    }
}

// ============================================
// LOAD RECENT ACTIVITY
// ============================================
async function loadRecentActivity() {
    const container = document.getElementById('recentActivityList');
    if (!container) return;
    
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('match_results')
            .orderBy('enteredAt', 'desc')
            .limit(10)
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">Chưa có hoạt động nào gần đây</p>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const result = doc.data();
            const time = result.enteredAt?.toDate?.()?.toLocaleString() || 'N/A';
            html += `
                <div style="display:flex;justify-content:space-between;padding:10px 15px;border-bottom:1px solid #f0f0f0;align-items:center;">
                    <div>
                        <strong>📝 Nhập kết quả</strong>
                        <span style="margin-left:10px;color:#666;">${result.note || 'Trận đấu'}</span>
                    </div>
                    <div style="color:#888;font-size:13px;">${time}</div>
                </div>
            `;
        });
        container.innerHTML = html;
        
    } catch (error) {
        console.warn('⚠️ Lỗi load recent activity:', error.message);
        container.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">Chưa có hoạt động nào</p>';
    }
}

// ============================================
// LOAD MATCHES
// ============================================
async function loadMatches() {
    const container = document.getElementById('matchListAdmin');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">⏳ Đang tải...</div>';
    
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('matches')
            .orderBy('date')
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align:center;padding:20px;color:#888;">📭 Chưa có trận đấu nào</p>';
            return;
        }
        
        let html = '<div class="match-grid">';
        snapshot.forEach(doc => {
            const match = doc.data();
            const id = doc.id;
            const isFinished = match.status === 'finished';
            const statusClass = isFinished ? 'finished' : 'upcoming';
            
            html += `
                <div class="match-card ${statusClass}">
                    <div class="match-info">
                        <span class="team">${match.homeTeam || '?'}</span>
                        <span class="vs">vs</span>
                        <span class="team">${match.awayTeam || '?'}</span>
                        <span class="match-status-badge ${statusClass}">${isFinished ? '✅ Đã kết thúc' : '⏳ Sắp diễn ra'}</span>
                    </div>
                    <div class="match-details">
                        <span>📅 ${match.date || 'N/A'}</span>
                        <span>⏰ ${match.time || 'N/A'}</span>
                        <span>⚡ ${match.handicap || 0}</span>
                        <span>🏆 ${match.group || 'N/A'}</span>
                    </div>
                    <div class="match-score ${statusClass}">
                        ${isFinished ? 
                            `${match.homeScore} - ${match.awayScore} 🏆` : 
                            '⏳ Chưa diễn ra'}
                    </div>
                    <div class="match-actions">
                        <button onclick="editMatch('${id}')" class="btn-secondary btn-sm">✏️ Sửa</button>
                        ${!isFinished ? `
                            <button onclick="showResultForm('${id}')" class="btn-success btn-sm">📝 Nhập kết quả</button>
                        ` : `
                            <button onclick="viewMatchResult('${id}')" class="btn-info btn-sm">📊 Xem kết quả</button>
                            <button onclick="deleteMatchResult('${id}')" class="btn-danger btn-sm">🗑️ Xóa kết quả</button>
                        `}
                        <button onclick="deleteMatch('${id}')" class="btn-danger btn-sm">🗑️ Xóa</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Lỗi load matches:', error);
        container.innerHTML = `<p style="color:red;">❌ Lỗi: ${error.message}</p>`;
    }
}

// ============================================
// SHOW RESULT FORM - SỬA LỖI
// ============================================
async function showResultForm(matchId) {
    console.log('🔍 showResultForm called with matchId:', matchId);
    
    if (!matchId) {
        alert('❌ Không tìm thấy ID trận đấu!');
        return;
    }

    try {
        const db = firebase.firestore();
        
        // Lấy trực tiếp từ Firestore
        const matchDoc = await db.collection('matches').doc(matchId).get();
        
        console.log('📄 Match document exists:', matchDoc.exists);
        
        if (!matchDoc.exists) {
            alert('❌ Không tìm thấy trận đấu với ID: ' + matchId);
            return;
        }
        
        const match = matchDoc.data();
        console.log('📊 Match data:', match);
        
        // Kiểm tra trận đấu đã kết thúc chưa
        if (match.status === 'finished') {
            alert('⚠️ Trận đấu đã có kết quả! Vui lòng xóa kết quả cũ trước khi nhập mới.');
            return;
        }

        // Hiển thị form
        document.getElementById('resultMatchId').value = matchId;
        document.getElementById('resultMatchName').textContent = `${match.homeTeam} vs ${match.awayTeam}`;
        document.getElementById('resultHomeScore').value = '';
        document.getElementById('resultAwayScore').value = '';
        document.getElementById('resultNote').value = '';
        
        const form = document.getElementById('resultForm');
        if (form) {
            form.style.display = 'block';
            form.scrollIntoView({ behavior: 'smooth' });
            console.log('✅ Form hiển thị thành công');
        } else {
            console.error('❌ Không tìm thấy form element');
        }
        
    } catch (error) {
        console.error('❌ Lỗi hiển thị form kết quả:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}

// ============================================

// js/admin.js - SỬA HÀM submitMatchResult VÀ THÊM HÀM TÍNH ĐIỂM THỦ CÔNG

// ============================================
// SUBMIT MATCH RESULT - CẬP NHẬT
// ============================================
// js/admin.js - SỬA HÀM submitMatchResult

async function submitMatchResult() {
    console.log('🔍 submitMatchResult called');
    
    const matchId = document.getElementById('resultMatchId').value;
    const homeScore = document.getElementById('resultHomeScore').value;
    const awayScore = document.getElementById('resultAwayScore').value;
    const note = document.getElementById('resultNote').value;

    if (!matchId || !homeScore || !awayScore) {
        alert('⚠️ Vui lòng nhập đầy đủ thông tin!');
        return;
    }

    const homeScoreInt = parseInt(homeScore);
    const awayScoreInt = parseInt(awayScore);

    if (isNaN(homeScoreInt) || isNaN(awayScoreInt) || homeScoreInt < 0 || awayScoreInt < 0) {
        alert('⚠️ Vui lòng nhập tỷ số hợp lệ!');
        return;
    }

    if (!confirm(`Bạn có chắc muốn nhập kết quả:\n${homeScoreInt} - ${awayScoreInt}?`)) {
        return;
    }

    try {
        const db = firebase.firestore();
        const user = firebase.auth().currentUser;
        
        // Kiểm tra quyền admin
        const adminEmails = ['songdaytronglong@gmail.com', 'admin@gmail.com'];
        if (!adminEmails.includes(user?.email)) {
            alert('❌ Bạn không có quyền nhập kết quả!');
            return;
        }
        
        // Kiểm tra trận đấu
        const matchDoc = await db.collection('matches').doc(matchId).get();
        if (!matchDoc.exists) {
            alert('❌ Không tìm thấy trận đấu!');
            return;
        }
        
        const match = matchDoc.data();
        if (match.status === 'finished') {
            alert('⚠️ Trận đấu đã có kết quả!');
            return;
        }

        // 1. Cập nhật kết quả
        await db.collection('matches').doc(matchId).update({
            homeScore: homeScoreInt,
            awayScore: awayScoreInt,
            status: 'finished',
            isResultEntered: false,  // CHƯA TÍNH ĐIỂM
            resultEnteredBy: user?.uid || 'admin',
            resultEnteredAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 2. Lưu lịch sử
        await db.collection('match_results').add({
            matchId: matchId,
            homeScore: homeScoreInt,
            awayScore: awayScoreInt,
            enteredBy: user?.uid || 'admin',
            enteredByEmail: user?.email || 'admin',
            note: note || `Nhập kết quả ${match.homeTeam} vs ${match.awayTeam}`,
            enteredAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 3. Đóng form
        cancelResultForm();

        // 4. TỰ ĐỘNG TÍNH ĐIỂM
        console.log('🧮 Tự động tính điểm...');
        
        try {
            if (typeof MatchManager === 'undefined') {
                alert('⚠️ Lỗi: Không tìm thấy MatchManager');
                await loadMatches();
                await loadPredictions();
                return;
            }
            
            const matchManager = new MatchManager();
            const result = await matchManager.calculatePoints(matchId);
            
            if (result) {
                if (result.alreadyCalculated) {
                    alert('⚠️ Trận đấu đã được tính điểm trước đó!');
                } else if (result.noNewPredictions) {
                    alert('✅ Đã nhập kết quả thành công! Không có dự đoán mới.');
                } else {
                    alert(`✅ Đã nhập kết quả và tính điểm thành công!\n📊 Số dự đoán mới: ${result.totalPredictions}\n✅ Đúng: ${result.totalCorrect}\n💰 Điểm: ${result.totalPoints}`);
                }
            }
            
            // Reload dữ liệu
            await loadMatches();
            await loadDashboard();
            await loadPredictions();
            
        } catch (calcError) {
            console.error('❌ Lỗi tính điểm:', calcError);
            alert('⚠️ Đã nhập kết quả nhưng lỗi tính điểm. Vui lòng tính thủ công.');
            await loadMatches();
            await loadPredictions();
        }

    } catch (error) {
        console.error('❌ Lỗi:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}
// ============================================
// TÍNH ĐIỂM THỦ CÔNG - THÊM MỚI
// ============================================
async function manualCalculatePoints() {
    console.log('🧮 Manual calculate points called');
    
    const matchId = prompt('📝 Nhập ID trận đấu cần tính điểm:');
    if (!matchId) {
        console.log('❌ Không có ID trận đấu');
        return;
    }
    
    if (!confirm(`⚠️ Bạn có chắc muốn tính điểm cho trận đấu ${matchId}?`)) {
        return;
    }
    
    try {
        // Kiểm tra MatchManager
        if (typeof MatchManager === 'undefined') {
            alert('❌ Lỗi: MatchManager không tồn tại! Vui lòng kiểm tra file matches.js');
            return;
        }
        
        const db = firebase.firestore();
        
        // Kiểm tra trận đấu tồn tại
        const matchDoc = await db.collection('matches').doc(matchId).get();
        
        if (!matchDoc.exists) {
            alert('❌ Không tìm thấy trận đấu!');
            return;
        }
        
        const match = matchDoc.data();
        
        if (match.status !== 'finished') {
            alert('⚠️ Trận đấu chưa kết thúc! Vui lòng nhập kết quả trước.');
            return;
        }
        
        console.log('📊 Match data:', match);
        
        // Lấy tất cả dự đoán cho trận này
        const predictionsSnap = await db.collection('predictions')
            .where('matchId', '==', matchId)
            .get();
        
        if (predictionsSnap.empty) {
            alert('⚠️ Không có dự đoán nào cho trận này!');
            return;
        }
        
        console.log(`📝 Tìm thấy ${predictionsSnap.size} dự đoán`);
        
        // Tính điểm
        const matchManager = new MatchManager();
        const result = await matchManager.calculatePoints(matchId);
        
        if (result) {
            alert(`✅ Tính điểm thành công!\n📊 Số dự đoán: ${result.totalPredictions}\n✅ Dự đoán đúng: ${result.totalCorrect}\n💰 Tổng điểm: ${result.totalPoints}`);
            await loadPredictions();
            await loadDashboard();
            await loadMatches();
        } else {
            alert('⚠️ Không có dự đoán nào để tính điểm');
        }
        
    } catch (error) {
        console.error('❌ Lỗi tính điểm thủ công:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}

// ============================================
// TÍNH ĐIỂM TẤT CẢ TRẬN ĐÃ KẾT THÚC - THÊM MỚI
// ============================================
// js/admin.js - SỬA HÀM calculateAllMatches

async function calculateAllMatches() {
    console.log('🧮 Calculate all matches points called');
    
    if (!confirm('⚠️ Tính điểm cho TẤT CẢ trận đã kết thúc CHƯA TÍNH ĐIỂM?')) {
        return;
    }
    
    try {
        const db = firebase.firestore();
        
        // Lấy trận đã kết thúc và CHƯA tính điểm
        const matchesSnap = await db.collection('matches')
            .where('status', '==', 'finished')
            .where('isResultEntered', '==', false)
            .get();
        
        if (matchesSnap.empty) {
            alert('✅ Không có trận nào cần tính điểm!');
            return;
        }
        
        console.log(`📝 Tìm thấy ${matchesSnap.size} trận chưa tính điểm`);
        
        let totalMatches = 0;
        let totalPredictions = 0;
        let totalCorrect = 0;
        let totalPoints = 0;
        const matchResults = [];
        
        const matchManager = new MatchManager();
        
        for (const doc of matchesSnap.docs) {
            const match = doc.data();
            const matchId = doc.id;
            
            console.log(`📊 Xử lý: ${match.homeTeam} vs ${match.awayTeam}`);
            
            const result = await matchManager.calculatePoints(matchId);
            
            if (result && !result.alreadyCalculated && !result.noNewPredictions) {
                totalMatches++;
                totalPredictions += result.totalPredictions || 0;
                totalCorrect += result.totalCorrect || 0;
                totalPoints += result.totalPoints || 0;
                matchResults.push({
                    match: `${match.homeTeam} vs ${match.awayTeam}`,
                    predictions: result.totalPredictions,
                    correct: result.totalCorrect,
                    points: result.totalPoints
                });
            }
        }
        
        let detailMessage = matchResults.length > 0 ? '\n\n📊 Chi tiết:' : '';
        matchResults.forEach(r => {
            detailMessage += `\n  ${r.match}: ${r.correct}/${r.predictions} đúng, ${r.points} điểm`;
        });
        
        alert(`✅ Tính điểm hoàn tất!\n📊 Số trận: ${totalMatches}\n📝 Dự đoán: ${totalPredictions}\n✅ Đúng: ${totalCorrect}\n💰 Điểm: ${totalPoints}${detailMessage}`);
        
        await loadPredictions();
        await loadDashboard();
        await loadMatches();
        
    } catch (error) {
        console.error('❌ Lỗi:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}

// ============================================
// CANCEL RESULT FORM
// ============================================
function cancelResultForm() {
    const form = document.getElementById('resultForm');
    if (form) {
        form.style.display = 'none';
    }
    // Reset các field
    document.getElementById('resultMatchId').value = '';
    document.getElementById('resultMatchName').textContent = '';
    document.getElementById('resultHomeScore').value = '';
    document.getElementById('resultAwayScore').value = '';
    document.getElementById('resultNote').value = '';
}

// ============================================
// VIEW MATCH RESULT
// ============================================
async function viewMatchResult(matchId) {
    try {
        const db = firebase.firestore();
        const matchDoc = await db.collection('matches').doc(matchId).get();
        if (!matchDoc.exists) {
            alert('❌ Không tìm thấy trận đấu');
            return;
        }
        
        const match = matchDoc.data();
        
        // Lấy lịch sử nhập kết quả
        const resultSnap = await db.collection('match_results')
            .where('matchId', '==', matchId)
            .orderBy('enteredAt', 'desc')
            .limit(1)
            .get();

        let resultInfo = 'Chưa có lịch sử nhập kết quả';
        if (!resultSnap.empty) {
            const result = resultSnap.docs[0].data();
            resultInfo = `
Nhập bởi: ${result.enteredByEmail || 'Admin'}
Thời gian: ${result.enteredAt?.toDate?.()?.toLocaleString() || 'N/A'}
Ghi chú: ${result.note || 'Không có'}
            `;
        }

        // Đếm số dự đoán cho trận này
        const predSnap = await db.collection('predictions')
            .where('matchId', '==', matchId)
            .get();

        const totalPredictions = predSnap.size;
        let correctPredictions = 0;
        predSnap.forEach(doc => {
            if (doc.data().isCorrect) correctPredictions++;
        });

        alert(`
📊 KẾT QUẢ TRẬN ĐẤU
━━━━━━━━━━━━━━━━━━━━━━
${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}

📝 CHI TIẾT:
${resultInfo}

⚡ Kèo chấp: ${match.handicap || 0}
🏆 Trạng thái: ${match.status || 'N/A'}

📊 THỐNG KÊ DỰ ĐOÁN:
Tổng dự đoán: ${totalPredictions}
Dự đoán đúng: ${correctPredictions}
Tỷ lệ đúng: ${totalPredictions > 0 ? Math.round((correctPredictions/totalPredictions)*100) : 0}%
        `);
    } catch (error) {
        console.error('❌ Lỗi xem kết quả:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}

// ============================================
// DELETE MATCH RESULT
// ============================================
async function deleteMatchResult(matchId) {
    if (!matchId) {
        alert('❌ Không tìm thấy ID trận đấu!');
        return;
    }

    if (!confirm('⚠️ Bạn có chắc muốn xóa kết quả trận đấu?\nHành động này sẽ reset tất cả dữ liệu và điểm số liên quan!')) {
        return;
    }

    try {
        const db = firebase.firestore();
        
        // Kiểm tra trận đấu tồn tại
        const matchDoc = await db.collection('matches').doc(matchId).get();
        if (!matchDoc.exists) {
            alert('❌ Không tìm thấy trận đấu!');
            return;
        }
        
        const match = matchDoc.data();
        
        if (match.status !== 'finished') {
            alert('⚠️ Trận đấu chưa có kết quả để xóa!');
            return;
        }

        // Reset kết quả
        await db.collection('matches').doc(matchId).update({
            homeScore: null,
            awayScore: null,
            status: 'upcoming',
            isResultEntered: false,
            resultEnteredBy: null,
            resultEnteredAt: null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Reset các dự đoán đã xử lý
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

        // Reset điểm cho user
        const allPredictions = await db.collection('predictions')
            .where('matchId', '==', matchId)
            .get();

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

        const userBatch = db.batch();
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

        // Xóa lịch sử dự đoán
        const historySnap = await db.collection('user_predictions_history')
            .where('matchId', '==', matchId)
            .get();

        historySnap.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Xóa lịch sử nhập kết quả
        const resultSnap = await db.collection('match_results')
            .where('matchId', '==', matchId)
            .get();

        resultSnap.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        await userBatch.commit();

        // Log hành động
        await logAdminAction('delete_result', matchId, { 
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam
        });

        alert('✅ Đã xóa kết quả và reset dữ liệu thành công!');
        
        await loadMatches();
        await loadDashboard();

    } catch (error) {
        console.error('❌ Lỗi xóa kết quả:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}

// ============================================
// CRUD MATCHES
// ============================================
function showAddMatchForm() {
    const form = document.getElementById('matchForm');
    if (!form) return;
    form.style.display = 'block';
    document.getElementById('matchId').value = '';
    document.getElementById('homeTeam').value = '';
    document.getElementById('awayTeam').value = '';
    document.getElementById('matchDate').value = '';
    document.getElementById('matchTime').value = '';
    document.getElementById('handicap').value = '0';
    document.getElementById('group').value = '';
    document.getElementById('homeScore').value = '';
    document.getElementById('awayScore').value = '';
    form.scrollIntoView({ behavior: 'smooth' });
}

function cancelMatchForm() {
    const form = document.getElementById('matchForm');
    if (form) {
        form.style.display = 'none';
    }
}

async function saveMatch() {
    const matchId = document.getElementById('matchId').value;
    const data = {
        homeTeam: document.getElementById('homeTeam').value.trim(),
        awayTeam: document.getElementById('awayTeam').value.trim(),
        date: document.getElementById('matchDate').value,
        time: document.getElementById('matchTime').value,
        handicap: parseFloat(document.getElementById('handicap').value) || 0,
        group: document.getElementById('group').value.trim() || 'Group A',
        homeScore: document.getElementById('homeScore').value ? parseInt(document.getElementById('homeScore').value) : null,
        awayScore: document.getElementById('awayScore').value ? parseInt(document.getElementById('awayScore').value) : null,
        status: document.getElementById('homeScore').value && document.getElementById('awayScore').value ? 'finished' : 'upcoming',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (!data.homeTeam || !data.awayTeam || !data.date || !data.time) {
        alert('⚠️ Vui lòng nhập đầy đủ thông tin!');
        return;
    }
    
    try {
        const db = firebase.firestore();
        if (matchId) {
            await db.collection('matches').doc(matchId).update(data);
            await logAdminAction('update_match', matchId, { homeTeam: data.homeTeam, awayTeam: data.awayTeam });
            alert('✅ Cập nhật trận đấu thành công!');
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            data.createdBy = firebase.auth().currentUser.uid;
            const docRef = await db.collection('matches').add(data);
            await logAdminAction('create_match', docRef.id, { homeTeam: data.homeTeam, awayTeam: data.awayTeam });
            alert('✅ Thêm trận đấu thành công!');
        }
        cancelMatchForm();
        await loadMatches();
        await loadDashboard();
    } catch (error) {
        console.error('Lỗi lưu trận đấu:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}

async function editMatch(matchId) {
    try {
        const db = firebase.firestore();
        const doc = await db.collection('matches').doc(matchId).get();
        if (doc.exists) {
            const data = doc.data();
            showAddMatchForm();
            document.getElementById('matchId').value = matchId;
            document.getElementById('homeTeam').value = data.homeTeam || '';
            document.getElementById('awayTeam').value = data.awayTeam || '';
            document.getElementById('matchDate').value = data.date || '';
            document.getElementById('matchTime').value = data.time || '';
            document.getElementById('handicap').value = data.handicap || 0;
            document.getElementById('group').value = data.group || '';
            document.getElementById('homeScore').value = data.homeScore || '';
            document.getElementById('awayScore').value = data.awayScore || '';
        }
    } catch (error) {
        console.error('Lỗi edit match:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}

async function deleteMatch(matchId) {
    if (!confirm('⚠️ Bạn có chắc muốn xóa trận đấu này?')) return;
    
    try {
        const db = firebase.firestore();
        const matchDoc = await db.collection('matches').doc(matchId).get();
        const match = matchDoc.data();
        await db.collection('matches').doc(matchId).delete();
        await logAdminAction('delete_match', matchId, { homeTeam: match?.homeTeam, awayTeam: match?.awayTeam });
        alert('✅ Xóa trận đấu thành công!');
        await loadMatches();
        await loadDashboard();
    } catch (error) {
        console.error('Lỗi xóa trận:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}

// ============================================
// LOAD USERS
// ============================================
async function loadUsers() {
    const container = document.getElementById('userList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">⏳ Đang tải...</div>';
    
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('users')
            .orderBy('totalPoints', 'desc')
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align:center;padding:20px;color:#888;">📭 Chưa có người dùng nào</p>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            const isAdmin = ADMIN_EMAILS.includes(user.email);
            
            html += `
                <div class="user-card">
                    <div class="user-info">
                        <span class="user-name">${user.name || 'N/A'}</span>
                        <span class="user-email">${user.email || 'N/A'}</span>
                    </div>
                    <div class="user-stats">
                        <span class="badge ${isAdmin ? 'badge-admin' : 'badge-user'}">${isAdmin ? 'Admin' : 'User'}</span>
                        <span class="badge ${user.isActive !== false ? 'badge-active' : 'badge-locked'}">
                            ${user.isActive !== false ? '✅ Active' : '🔒 Locked'}
                        </span>
                        <span>💰 ${user.balance || 0}</span>
                        <span>⭐ ${user.totalPoints || 0}</span>
                        <span>🎯 ${user.correctPredictions || 0}/${user.totalPredictions || 0}</span>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Lỗi load users:', error);
        container.innerHTML = `<p style="color:red;">❌ Lỗi: ${error.message}</p>`;
    }
}

// ============================================
// LOAD PREDICTIONS
// ============================================
// js/admin.js - CẬP NHẬT HÀM loadPredictions

async function loadPredictions() {
    const container = document.getElementById('predictionList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">⏳ Đang tải...</div>';
    
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('predictions')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align:center;padding:20px;color:#888;">📭 Chưa có dự đoán nào</p>';
            return;
        }
        
        let html = `<div class="table-wrapper"><table>
            <thead>
                <tr>
                    <th>User</th>
                    <th>Trận</th>
                    <th>Dự đoán</th>
                    <th>Kèo chấp</th>
                    <th>Kết quả</th>
                    <th>Điểm</th>
                    <th>Trạng thái</th>
                </tr>
            </thead>
            <tbody>`;
        
        for (const doc of snapshot.docs) {
            const pred = doc.data();
            let matchName = 'N/A';
            let matchResult = 'Chưa có';
            let actualHome = '-';
            let actualAway = '-';
            
            try {
                const matchDoc = await db.collection('matches').doc(pred.matchId).get();
                if (matchDoc.exists) {
                    const m = matchDoc.data();
                    matchName = `${m.homeTeam} vs ${m.awayTeam}`;
                    if (m.status === 'finished') {
                        actualHome = m.homeScore;
                        actualAway = m.awayScore;
                        matchResult = `${m.homeScore} - ${m.awayScore}`;
                    }
                }
            } catch (e) {}
            
            const statusBadge = pred.isProcessed ? 
                (pred.isCorrect ? '✅ Đúng' : '❌ Sai') : 
                '⏳ Chờ xử lý';
            
            const pointsColor = pred.points > 0 ? '#28a745' : (pred.isProcessed ? '#dc3545' : '#ffc107');
            
            html += `
                <tr>
                    <td>${pred.userName || 'N/A'}</td>
                    <td>${matchName}</td>
                    <td style="text-align:center;font-weight:600;">${pred.homeScore} - ${pred.awayScore}</td>
                    <td>${pred.userHandicap || 0} (${pred.handicapChoice || 'draw'})</td>
                    <td style="text-align:center;font-weight:600;color:${matchResult !== 'Chưa có' ? '#2d3436' : '#b2bec3'};">${matchResult}</td>
                    <td style="text-align:center;font-weight:bold;color:${pointsColor};">${pred.points || 0}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        }
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Lỗi load predictions:', error);
        container.innerHTML = `<p style="color:red;">❌ Lỗi: ${error.message}</p>`;
    }
}

// ============================================
// LOAD LOGS
// ============================================
// js/admin.js - SỬA HÀM loadLogs

async function loadLogs() {
    const container = document.getElementById('logList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">⏳ Đang tải...</div>';
    
    try {
        const db = firebase.firestore();
        
        // 🔧 SỬA: Không dùng orderBy để tránh cần index
        const snapshot = await db.collection('audit_logs')
            .limit(20)
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div style="text-align:center;padding:30px;color:#888;">
                    <p>📭 Chưa có lịch sử hoạt động</p>
                    <p style="font-size:13px;margin-top:5px;">Lịch sử sẽ được ghi lại khi admin thực hiện các thao tác</p>
                </div>
            `;
            return;
        }
        
        // Sắp xếp trong JavaScript thay vì Firestore
        const logs = [];
        snapshot.forEach(doc => {
            logs.push({ id: doc.id, ...doc.data() });
        });
        
        // Sắp xếp theo timestamp giảm dần
        logs.sort((a, b) => {
            const timeA = a.timestamp?.toDate?.()?.getTime() || 0;
            const timeB = b.timestamp?.toDate?.()?.getTime() || 0;
            return timeB - timeA;
        });
        
        let html = `<div class="table-wrapper"><table>
            <thead>
                <tr>
                    <th>Thời gian</th>
                    <th>Admin</th>
                    <th>Hành động</th>
                    <th>Chi tiết</th>
                </tr>
            </thead>
            <tbody>`;
        
        logs.forEach(log => {
            let time = 'N/A';
            if (log.timestamp && log.timestamp.toDate) {
                time = log.timestamp.toDate().toLocaleString();
            }
            
            const actionLabels = {
                'create_match': '➕ Tạo trận đấu',
                'update_match': '✏️ Cập nhật trận đấu',
                'delete_match': '🗑️ Xóa trận đấu',
                'enter_result': '📝 Nhập kết quả',
                'delete_result': '🗑️ Xóa kết quả',
                'lock_user': '🔒 Khóa user',
                'unlock_user': '🔓 Mở khóa user',
                'delete_user': '🗑️ Xóa user'
            };
            
            html += `
                <tr>
                    <td style="font-size:13px;">${time}</td>
                    <td>${log.adminName || log.adminEmail || 'N/A'}</td>
                    <td>${actionLabels[log.action] || log.action || 'N/A'}</td>
                    <td style="font-size:13px;color:#666;">${log.detail || ''}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.warn('⚠️ Lỗi load logs:', error.message);
        container.innerHTML = `
            <div style="text-align:center;padding:30px;color:#888;">
                <p>📭 Chưa có lịch sử hoạt động</p>
                <p style="font-size:13px;margin-top:5px;color:#aaa;">Lịch sử sẽ được ghi lại khi bạn thực hiện các thao tác quản trị</p>
            </div>
        `;
    }
}

// ============================================
// EXPORT USERS
// ============================================
async function exportUsers() {
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('users').get();
        
        let csv = 'Tên,Email,Điểm,Dự đoán đúng,Tổng dự đoán,Số dư,Trạng thái\n';
        snapshot.forEach(doc => {
            const user = doc.data();
            csv += `${user.name || ''},${user.email || ''},${user.totalPoints || 0},${user.correctPredictions || 0},${user.totalPredictions || 0},${user.balance || 0},${user.isActive !== false ? 'Active' : 'Locked'}\n`;
        });
        
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
    } catch (error) {
        console.error('Lỗi export:', error);
        alert('❌ Lỗi export: ' + error.message);
    }
}

// ============================================
// LOG ADMIN ACTIONS
// ============================================
async function logAdminAction(action, target, details) {
    try {
        const db = firebase.firestore();
        const user = firebase.auth().currentUser;
        if (!user) return;
        
        await db.collection('audit_logs').add({
            adminId: user.uid,
            adminName: user.displayName || user.email,
            adminEmail: user.email,
            action: action,
            target: target || null,
            detail: JSON.stringify(details || {}),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.warn('⚠️ Không thể ghi log:', error.message);
    }
}

// ============================================
// TAB SWITCHING
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
        btn.addEventListener('click', function() {
            tabs.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            const tabId = this.dataset.tab;
            const content = document.getElementById(tabId);
            if (content) {
                content.classList.add('active');
            }
            
            // Load data khi chuyển tab
            switch(tabId) {
                case 'matches': loadMatches(); break;
                case 'users': loadUsers(); break;
                case 'predictions': loadPredictions(); break;
                case 'logs': loadLogs(); break;
            }
        });
    });
});

// ============================================
// LOGOUT
// ============================================
function logout() {
    if (confirm('Bạn có muốn đăng xuất?')) {
        firebase.auth().signOut().then(() => {
            window.location.href = 'index.html';
        });
    }
}

// ============================================
// INIT
// ============================================
console.log('🔄 Initializing admin page...');
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAdmin);
} else {
    checkAdmin();
}

// js/admin.js - THÊM HÀM TÍNH ĐIỂM THỦ CÔNG

async function manualCalculatePoints() {
    const matchId = prompt('Nhập ID trận đấu cần tính điểm:');
    if (!matchId) return;
    
    if (!confirm(`Bạn có chắc muốn tính điểm cho trận đấu ${matchId}?`)) return;
    
    try {
        const matchManager = new MatchManager();
        const result = await matchManager.calculatePoints(matchId);
        
        if (result) {
            alert(`✅ Tính điểm thành công!\nSố dự đoán: ${result.totalPredictions}\nDự đoán đúng: ${result.totalCorrect}\nTổng điểm: ${result.totalPoints}`);
            await loadPredictions();
            await loadDashboard();
        } else {
            alert('⚠️ Không có dự đoán nào để tính điểm');
        }
    } catch (error) {
        console.error('❌ Lỗi tính điểm:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}

// Thêm nút tính điểm thủ công trong admin.html
// <button onclick="manualCalculatePoints()" class="btn-info btn-sm">🧮 Tính điểm thủ công</button>
// js/admin.js - THÊM HÀM TÍNH ĐIỂM THỦ CÔNG

async function manualCalculatePoints() {
    console.log('🧮 Manual calculate points called');
    
    const matchId = prompt('📝 Nhập ID trận đấu cần tính điểm:');
    if (!matchId) {
        console.log('❌ Không có ID trận đấu');
        return;
    }
    
    if (!confirm(`⚠️ Bạn có chắc muốn tính điểm cho trận đấu ${matchId}?`)) {
        return;
    }
    
    try {
        // Kiểm tra MatchManager
        if (typeof MatchManager === 'undefined') {
            alert('❌ Lỗi: MatchManager không tồn tại!');
            return;
        }
        
        const matchManager = new MatchManager();
        console.log('✅ MatchManager initialized');
        
        // Kiểm tra trận đấu tồn tại
        const db = firebase.firestore();
        const matchDoc = await db.collection('matches').doc(matchId).get();
        
        if (!matchDoc.exists) {
            alert('❌ Không tìm thấy trận đấu!');
            return;
        }
        
        const match = matchDoc.data();
        
        if (match.status !== 'finished') {
            alert('⚠️ Trận đấu chưa kết thúc! Vui lòng nhập kết quả trước.');
            return;
        }
        
        // Tính điểm
        const result = await matchManager.calculatePoints(matchId);
        
        if (result) {
            alert(`✅ Tính điểm thành công!\n📊 Số dự đoán: ${result.totalPredictions}\n✅ Dự đoán đúng: ${result.totalCorrect}\n💰 Tổng điểm: ${result.totalPoints}`);
            await loadPredictions();
            await loadDashboard();
            await loadMatches();
        } else {
            alert('⚠️ Không có dự đoán nào để tính điểm');
        }
        
    } catch (error) {
        console.error('❌ Lỗi tính điểm thủ công:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}

// js/admin.js - THÊM HÀM RESET ĐIỂM


async function resetMatchPoints() {
    const matchId = prompt('📝 Nhập ID trận đấu cần reset điểm:');
    if (!matchId) return;
    
    if (!confirm(`⚠️ RESET ĐIỂM cho trận ${matchId}?\nHành động này sẽ xóa tất cả điểm đã tính!`)) {
        return;
    }
    
    try {
        const db = firebase.firestore();
        
        // Kiểm tra trận đấu
        const matchDoc = await db.collection('matches').doc(matchId).get();
        if (!matchDoc.exists) {
            alert('❌ Không tìm thấy trận đấu!');
            return;
        }
        
        const match = matchDoc.data();
        
        // Reset trạng thái trận đấu
        await db.collection('matches').doc(matchId).update({
            isResultEntered: false,
            pointsCalculated: false,
            calculatedAt: null
        });
        
        // Reset các dự đoán
        const predSnap = await db.collection('predictions')
            .where('matchId', '==', matchId)
            .get();
        
        const batch = db.batch();
        predSnap.forEach(doc => {
            batch.update(doc.ref, {
                points: 0,
                isCorrect: false,
                isProcessed: false,
                calculatedAt: null
            });
        });
        await batch.commit();
        
        alert('✅ Đã reset điểm cho trận đấu!');
        await loadMatches();
        await loadDashboard();
        await loadPredictions();
        
    } catch (error) {
        console.error('❌ Lỗi reset:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}
// js/admin.js - THÊM HÀM RESET HỆ THỐNG

// ============================================
// js/admin.js - SỬA LẠI HÀM resetSystem

// ============================================
// RESET TOÀN BỘ HỆ THỐNG - SỬA LỖI MẬT KHẨU
// ============================================
async function resetSystem() {
    console.log('🔄 Reset system called');
    
    // Xác nhận lần 1
    if (!confirm('⚠️ BẠN CÓ CHẮC MUỐN RESET TOÀN BỘ HỆ THỐNG?\n\nHành động này sẽ XÓA TẤT CẢ:\n- Tất cả trận đấu\n- Tất cả dự đoán\n- Tất cả kết quả\n- Tất cả lịch sử\n- Tất cả người dùng\n\nDữ liệu sẽ không thể khôi phục!')) {
        console.log('❌ Hủy reset hệ thống');
        return;
    }
    
    // Xác nhận lần 2
    if (!confirm('⚠️ LẦN CUỐI: Bạn có chắc chắn muốn xóa toàn bộ dữ liệu?')) {
        console.log('❌ Hủy reset hệ thống');
        return;
    }
    
    // Kiểm tra quyền admin trước khi yêu cầu mật khẩu
    try {
        const user = firebase.auth().currentUser;
        const adminEmails = ['songdaytronglong@gmail.com', 'admin@gmail.com'];
        
        if (!user || !adminEmails.includes(user.email)) {
            alert('❌ Bạn không có quyền reset hệ thống!');
            return;
        }
    } catch (error) {
        console.error('❌ Lỗi kiểm tra quyền:', error);
        alert('❌ Lỗi: ' + error.message);
        return;
    }

    // 🔧 SỬA: Yêu cầu nhập mật khẩu xác nhận (không so sánh với mật khẩu Firebase)
    const password = prompt('🔐 Nhập mật khẩu xác nhận để reset hệ thống:\n(Mật khẩu mặc định: admin123)');
    
    console.log('🔑 Mật khẩu nhập vào:', password);
    console.log('🔑 Độ dài:', password?.length);
    
    // Kiểm tra mật khẩu - KHÔNG PHÂN BIỆT HOA THƯỜNG
    if (!password || password.toLowerCase().trim() !== 'admin123') {
        console.log('❌ Mật khẩu không đúng!');
        alert('❌ Mật khẩu không đúng! Hủy reset.\n\nMật khẩu mặc định: admin123');
        return;
    }
    
    console.log('✅ Mật khẩu đúng!');
    
    // Xác nhận lần cuối
    if (!confirm('⚠️ XÁC NHẬN CUỐI CÙNG: Reset toàn bộ hệ thống?')) {
        console.log('❌ Hủy reset');
        return;
    }

    try {
        const db = firebase.firestore();
        const user = firebase.auth().currentUser;
        
        // Hiển thị loading
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'resetLoading';
        loadingDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.85);
            color: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-size: 24px;
            font-family: Arial, sans-serif;
        `;
        loadingDiv.innerHTML = `
            <div style="text-align:center;max-width:500px;padding:20px;">
                <div style="font-size:48px;margin-bottom:20px;">🔄</div>
                <div style="font-size:24px;font-weight:bold;">Đang reset hệ thống...</div>
                <div id="resetProgress" style="font-size:16px;margin-top:15px;color:#ffd700;">Đang xóa dữ liệu...</div>
                <div style="margin-top:30px;width:100%;height:4px;background:#333;border-radius:2px;overflow:hidden;">
                    <div id="resetProgressBar" style="width:0%;height:100%;background:linear-gradient(90deg,#667eea,#764ba2);transition:width 0.5s;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(loadingDiv);

        const progress = document.getElementById('resetProgress');
        const progressBar = document.getElementById('resetProgressBar');
        
        let progressValue = 0;
        
        function updateProgress(text, value) {
            progress.textContent = text;
            progressValue = value || progressValue + 10;
            if (progressBar) {
                progressBar.style.width = Math.min(progressValue, 100) + '%';
            }
            console.log(`📊 Progress: ${Math.min(progressValue, 100)}% - ${text}`);
        }

        // 1. Xóa collection: matches
        updateProgress('📊 Đang xóa trận đấu...', 10);
        const matchesSnap = await db.collection('matches').get();
        const batch1 = db.batch();
        matchesSnap.forEach(doc => batch1.delete(doc.ref));
        await batch1.commit();
        console.log('✅ Đã xóa matches');

        // 2. Xóa collection: predictions
        updateProgress('📝 Đang xóa dự đoán...', 25);
        const predSnap = await db.collection('predictions').get();
        const batch2 = db.batch();
        predSnap.forEach(doc => batch2.delete(doc.ref));
        await batch2.commit();
        console.log('✅ Đã xóa predictions');

        // 3. Xóa collection: match_results
        updateProgress('📊 Đang xóa kết quả trận đấu...', 40);
        const resultSnap = await db.collection('match_results').get();
        const batch3 = db.batch();
        resultSnap.forEach(doc => batch3.delete(doc.ref));
        await batch3.commit();
        console.log('✅ Đã xóa match_results');

        // 4. Xóa collection: user_predictions_history
        updateProgress('📋 Đang xóa lịch sử dự đoán...', 55);
        const historySnap = await db.collection('user_predictions_history').get();
        const batch4 = db.batch();
        historySnap.forEach(doc => batch4.delete(doc.ref));
        await batch4.commit();
        console.log('✅ Đã xóa user_predictions_history');

        // 5. Xóa collection: audit_logs
        updateProgress('📋 Đang xóa lịch sử hoạt động...', 70);
        const logSnap = await db.collection('audit_logs').get();
        const batch5 = db.batch();
        logSnap.forEach(doc => batch5.delete(doc.ref));
        await batch5.commit();
        console.log('✅ Đã xóa audit_logs');

        // 6. Xóa collection: users (GIỮ LẠI ADMIN HIỆN TẠI)
        updateProgress('👤 Đang xóa người dùng...', 80);
        const usersSnap = await db.collection('users').get();
        const batch6 = db.batch();
        usersSnap.forEach(doc => {
            if (doc.id !== user.uid) {
                batch6.delete(doc.ref);
            }
        });
        await batch6.commit();
        console.log('✅ Đã xóa users (giữ lại admin)');

        // 7. Reset dữ liệu của admin hiện tại
        updateProgress('🔄 Đang reset dữ liệu admin...', 90);
        await db.collection('users').doc(user.uid).set({
            name: user.displayName || 'Admin',
            email: user.email,
            role: 'admin',
            isActive: true,
            balance: 0,
            totalPoints: 0,
            correctPredictions: 0,
            totalPredictions: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('✅ Đã reset dữ liệu admin');

        // 8. Tạo trận đấu mẫu
        updateProgress('⚽ Đang tạo trận đấu mẫu...', 95);
        const sampleMatches = [
            { homeTeam: 'Brazil', awayTeam: 'Argentina', date: '2026-06-22', time: '20:00', handicap: 0.25, group: 'Group A' },
            { homeTeam: 'Germany', awayTeam: 'France', date: '2026-06-23', time: '17:00', handicap: 0.5, group: 'Group B' },
            { homeTeam: 'England', awayTeam: 'Spain', date: '2026-06-24', time: '15:00', handicap: 0, group: 'Group C' }
        ];

        for (const match of sampleMatches) {
            await db.collection('matches').add({
                ...match,
                status: 'upcoming',
                homeScore: null,
                awayScore: null,
                isResultEntered: false,
                pointsCalculated: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        console.log('✅ Đã tạo trận đấu mẫu');

        // 9. Log hành động
        await db.collection('audit_logs').add({
            adminId: user.uid,
            adminName: user.displayName || user.email,
            adminEmail: user.email,
            action: 'reset_system',
            detail: 'Reset toàn bộ hệ thống',
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 10. Hoàn thành
        updateProgress('✅ Hoàn tất reset hệ thống!', 100);
        progress.style.color = '#28a745';
        
        setTimeout(() => {
            loadingDiv.innerHTML = `
                <div style="text-align:center;">
                    <div style="font-size:60px;margin-bottom:20px;">✅</div>
                    <div style="font-size:28px;color:#28a745;font-weight:bold;">RESET HỆ THỐNG THÀNH CÔNG!</div>
                    <div style="font-size:16px;margin-top:20px;color:#ffd700;">
                        ✅ Đã xóa tất cả dữ liệu<br>
                        ✅ Đã tạo 3 trận đấu mẫu<br>
                        ✅ Đã reset điểm admin
                    </div>
                    <button onclick="location.reload()" style="margin-top:30px;padding:12px 40px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;border-radius:8px;font-size:18px;cursor:pointer;font-weight:600;">
                        🔄 Tải lại trang
                    </button>
                </div>
            `;
        }, 1500);

    } catch (error) {
        console.error('❌ Lỗi reset hệ thống:', error);
        const loadingDiv = document.getElementById('resetLoading');
        if (loadingDiv) {
            loadingDiv.innerHTML = `
                <div style="text-align:center;">
                    <div style="font-size:48px;margin-bottom:20px;">❌</div>
                    <div style="font-size:24px;color:#dc3545;font-weight:bold;">LỖI RESET HỆ THỐNG!</div>
                    <div style="font-size:16px;margin-top:20px;color:#ffd700;">${error.message}</div>
                    <button onclick="document.getElementById('resetLoading').remove()" style="margin-top:30px;padding:12px 40px;background:#dc3545;color:white;border:none;border-radius:8px;font-size:18px;cursor:pointer;">
                        Đóng
                    </button>
                </div>
            `;
        }
        alert('❌ Lỗi reset hệ thống: ' + error.message);
    }
}

// ============================================
// THÊM NÚT RESET VÀO ADMIN PANEL
// ============================================
function addResetSystemButton() {
    // Tìm container
    let actions = document.querySelector('.admin-actions');
    
    if (!actions) {
        const container = document.querySelector('.admin-container');
        if (!container) return;
        
        actions = document.createElement('div');
        actions.className = 'admin-actions';
        actions.style.cssText = `
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin: 20px 0;
            padding: 15px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        `;
        container.prepend(actions);
    }

    // Kiểm tra nếu đã có nút Reset System thì không thêm lại
    if (actions.querySelector('.btn-reset-system')) {
        console.log('ℹ️ Nút Reset System đã tồn tại');
        return;
    }

    // Thêm nút Reset Hệ Thống
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn-reset-system';
    resetBtn.innerHTML = '🗑️ Reset Hệ Thống';
    resetBtn.onclick = resetSystem;
    resetBtn.style.cssText = `
        background: linear-gradient(135deg, #dc3545, #c82333);
        color: white;
        border: none;
        padding: 12px 28px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 700;
        font-size: 14px;
        transition: all 0.3s;
        box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);
        letter-spacing: 0.5px;
    `;
    resetBtn.onmouseover = function() {
        this.style.transform = 'scale(1.05)';
        this.style.boxShadow = '0 6px 25px rgba(220, 53, 69, 0.5)';
    };
    resetBtn.onmouseout = function() {
        this.style.transform = 'scale(1)';
        this.style.boxShadow = '0 4px 15px rgba(220, 53, 69, 0.3)';
    };
    
    actions.appendChild(resetBtn);
    console.log('✅ Đã thêm nút Reset Hệ Thống');
}

// Gọi khi trang load - SỬA LỖI: Đảm bảo chỉ gọi 1 lần
let resetButtonAdded = false;

document.addEventListener('DOMContentLoaded', function() {
    if (!resetButtonAdded) {
        resetButtonAdded = true;
        // Đợi DOM load xong mới thêm nút
        setTimeout(addResetSystemButton, 500);
    }
});
// js/admin.js - THÊM CÁC HÀM MỚI

// ============================================
// PHÊ DUYỆT ADMIN - CẤP QUYỀN ADMIN CHO USER
// ============================================
async function approveAdmin(userId) {
    if (!userId) {
        alert('❌ Không tìm thấy ID người dùng!');
        return;
    }

    if (!confirm('⚠️ Bạn có chắc muốn cấp quyền ADMIN cho người dùng này?\n\nHọ sẽ có toàn quyền quản trị hệ thống!')) {
        return;
    }

    try {
        const db = firebase.firestore();
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            alert('❌ Không tìm thấy người dùng!');
            return;
        }

        const userData = userDoc.data();
        
        // Kiểm tra nếu đã là admin
        if (userData.role === 'admin') {
            alert('⚠️ Người dùng này đã có quyền admin!');
            return;
        }

        // Cập nhật role thành admin
        await userRef.update({
            role: 'admin',
            isAdmin: true,
            approvedBy: firebase.auth().currentUser?.uid || 'admin',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Log hành động
        await logAdminAction('approve_admin', userId, {
            userName: userData.name || userData.email,
            userEmail: userData.email,
            approvedBy: firebase.auth().currentUser?.email || 'admin'
        });

        alert(`✅ Đã cấp quyền ADMIN cho ${userData.name || userData.email}!`);
        
        // Reload danh sách user
        await loadUsers();

    } catch (error) {
        console.error('❌ Lỗi phê duyệt admin:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}

// ============================================
// THU HỒI QUYỀN ADMIN
// ============================================
async function revokeAdmin(userId) {
    if (!userId) {
        alert('❌ Không tìm thấy ID người dùng!');
        return;
    }

    if (!confirm('⚠️ Bạn có chắc muốn THU HỒI quyền ADMIN của người dùng này?\n\nHọ sẽ mất toàn quyền quản trị!')) {
        return;
    }

    try {
        const db = firebase.firestore();
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            alert('❌ Không tìm thấy người dùng!');
            return;
        }

        const userData = userDoc.data();
        
        // Không cho thu hồi quyền của chính mình
        const currentUser = firebase.auth().currentUser;
        if (userId === currentUser?.uid) {
            alert('❌ Bạn không thể thu hồi quyền admin của chính mình!');
            return;
        }

        // Kiểm tra nếu chưa phải admin
        if (userData.role !== 'admin') {
            alert('⚠️ Người dùng này không có quyền admin!');
            return;
        }

        // Cập nhật role thành user
        await userRef.update({
            role: 'user',
            isAdmin: false,
            revokedBy: currentUser?.uid || 'admin',
            revokedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Log hành động
        await logAdminAction('revoke_admin', userId, {
            userName: userData.name || userData.email,
            userEmail: userData.email,
            revokedBy: currentUser?.email || 'admin'
        });

        alert(`✅ Đã thu hồi quyền ADMIN của ${userData.name || userData.email}!`);
        
        // Reload danh sách user
        await loadUsers();

    } catch (error) {
        console.error('❌ Lỗi thu hồi quyền admin:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}

// ============================================
// HIỂN THỊ DANH SÁCH USER - CẬP NHẬT CÓ NÚT PHÊ DUYỆT
// ============================================
async function loadUsers() {
    const container = document.getElementById('userList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">⏳ Đang tải...</div>';
    
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('users')
            .orderBy('totalPoints', 'desc')
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align:center;padding:20px;color:#888;">📭 Chưa có người dùng nào</p>';
            return;
        }
        
        const currentUser = firebase.auth().currentUser;
        const adminEmails = ['songdaytronglong@gmail.com', 'admin@gmail.com'];
        const isSuperAdmin = adminEmails.includes(currentUser?.email);

        let html = `
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
                    <thead>
                        <tr style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;">
                            <th style="padding:12px 16px;text-align:left;">#</th>
                            <th style="padding:12px 16px;text-align:left;">Tên</th>
                            <th style="padding:12px 16px;text-align:left;">Email</th>
                            <th style="padding:12px 16px;text-align:center;">Vai trò</th>
                            <th style="padding:12px 16px;text-align:center;">Điểm</th>
                            <th style="padding:12px 16px;text-align:center;">Trạng thái</th>
                            <th style="padding:12px 16px;text-align:center;">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        let index = 1;
        for (const doc of snapshot.docs) {
            const user = doc.data();
            const userId = doc.id;
            const isAdmin = user.role === 'admin' || user.isAdmin === true;
            const isCurrentUser = userId === currentUser?.uid;
            const isSuperAdminUser = adminEmails.includes(user.email);
            
            // Xác định trạng thái
            const statusBadge = user.isActive !== false 
                ? '<span class="badge badge-active">✅ Active</span>' 
                : '<span class="badge badge-locked">🔒 Locked</span>';
            
            // Xác định vai trò
            let roleBadge = '';
            if (isAdmin) {
                roleBadge = '<span class="badge badge-admin">👑 Admin</span>';
            } else {
                roleBadge = '<span class="badge badge-user">👤 User</span>';
            }
            
            // Nút thao tác
            let actionButtons = '';
            
            // Chỉ hiển thị nút cho super admin (không phải user thường)
            if (isSuperAdmin && !isSuperAdminUser) {
                if (isAdmin) {
                    // Nếu đã là admin -> hiển thị nút thu hồi
                    actionButtons = `
                        <button onclick="revokeAdmin('${userId}')" class="btn-warning btn-sm" style="background:#ffc107;color:#333;">
                            🔄 Thu hồi
                        </button>
                    `;
                } else {
                    // Nếu chưa là admin -> hiển thị nút phê duyệt
                    actionButtons = `
                        <button onclick="approveAdmin('${userId}')" class="btn-success btn-sm">
                            ✅ Phê duyệt
                        </button>
                    `;
                }
            } else if (isSuperAdmin && isSuperAdminUser) {
                actionButtons = '<span style="color:#888;font-size:12px;">👑 Super Admin</span>';
            } else if (isCurrentUser) {
                actionButtons = '<span style="color:#888;font-size:12px;">👤 Bạn</span>';
            } else {
                actionButtons = '<span style="color:#888;font-size:12px;">-</span>';
            }
            
            html += `
                <tr style="border-bottom:1px solid #f0f0f0;${isCurrentUser ? 'background:#f0f2ff;' : ''}">
                    <td style="padding:10px 16px;text-align:center;">${index}</td>
                    <td style="padding:10px 16px;font-weight:600;">${user.name || user.nickname || 'N/A'}</td>
                    <td style="padding:10px 16px;color:#666;">${user.email || 'N/A'}</td>
                    <td style="padding:10px 16px;text-align:center;">${roleBadge}</td>
                    <td style="padding:10px 16px;text-align:center;font-weight:bold;color:#667eea;">${user.totalPoints || 0}</td>
                    <td style="padding:10px 16px;text-align:center;">${statusBadge}</td>
                    <td style="padding:10px 16px;text-align:center;">${actionButtons}</td>
                </tr>
            `;
            index++;
        }
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        // Thêm thông tin tổng quan
        const totalUsers = snapshot.size;
        const adminCount = snapshot.docs.filter(doc => {
            const data = doc.data();
            return data.role === 'admin' || data.isAdmin === true;
        }).length;
        
        html += `
            <div style="margin-top:20px;padding:15px 20px;background:white;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.08);display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                <div>
                    <strong>👥 Tổng số người dùng:</strong> ${totalUsers}
                </div>
                <div>
                    <strong>👑 Số admin:</strong> ${adminCount}
                </div>
                <div>
                    <strong>👤 Số user thường:</strong> ${totalUsers - adminCount}
                </div>
                ${isSuperAdmin ? `
                    <div style="color:#28a745;">
                        ✅ Bạn có quyền phê duyệt admin
                    </div>
                ` : `
                    <div style="color:#888;">
                        ℹ️ Chỉ Super Admin mới có quyền phê duyệt
                    </div>
                `}
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Lỗi load users:', error);
        container.innerHTML = `<p style="color:red;">❌ Lỗi: ${error.message}</p>`;
    }
}

// ============================================
// THÊM CSS CHO ADMIN TABLE
// ============================================
function addAdminTableStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .btn-warning {
            background: #ffc107;
            color: #333;
            border: none;
            padding: 6px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
            transition: all 0.3s;
        }
        
        .btn-warning:hover {
            background: #e0a800;
            transform: translateY(-2px);
        }
        
        .badge {
            padding: 3px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .badge-admin {
            background: #ffd700;
            color: #333;
        }
        
        .badge-user {
            background: #e0e0e0;
            color: #666;
        }
        
        .badge-active {
            background: #28a745;
            color: white;
        }
        
        .badge-locked {
            background: #dc3545;
            color: white;
        }
        
        #userList table {
            width: 100%;
            border-collapse: collapse;
        }
        
        #userList th {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 16px;
            text-align: left;
            font-weight: 600;
        }
        
        #userList td {
            padding: 10px 16px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        #userList tr:hover td {
            background: #f8f9fa;
        }
        
        @media (max-width: 768px) {
            #userList table {
                font-size: 13px;
            }
            
            #userList th,
            #userList td {
                padding: 8px 10px;
            }
        }
    `;
    document.head.appendChild(style);
}

// Gọi khi load trang
document.addEventListener('DOMContentLoaded', function() {
    // ... code hiện có ...
    addAdminTableStyles();
});