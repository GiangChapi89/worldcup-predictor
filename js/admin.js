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
// SUBMIT MATCH RESULT - SỬA LỖI
// ============================================
// js/admin.js - SỬA HÀM submitMatchResult

async function submitMatchResult() {
    console.log('🔍 submitMatchResult called');
    
    const matchId = document.getElementById('resultMatchId').value;
    const homeScore = document.getElementById('resultHomeScore').value;
    const awayScore = document.getElementById('resultAwayScore').value;
    const note = document.getElementById('resultNote').value;

    console.log('📊 Form data:', { matchId, homeScore, awayScore, note });

    if (!matchId) {
        alert('❌ Không tìm thấy ID trận đấu!');
        return;
    }

    if (!homeScore || !awayScore) {
        alert('⚠️ Vui lòng nhập đầy đủ tỷ số!');
        return;
    }

    const homeScoreInt = parseInt(homeScore);
    const awayScoreInt = parseInt(awayScore);

    if (isNaN(homeScoreInt) || isNaN(awayScoreInt)) {
        alert('⚠️ Tỷ số phải là số!');
        return;
    }

    if (homeScoreInt < 0 || awayScoreInt < 0) {
        alert('⚠️ Tỷ số không được nhỏ hơn 0!');
        return;
    }

    if (!confirm(`Bạn có chắc muốn nhập kết quả:\n${homeScoreInt} - ${awayScoreInt}?\nSau khi nhập, hệ thống sẽ tự động tính điểm!`)) {
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
        
        // Kiểm tra trận đấu tồn tại
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

        // Cập nhật kết quả
        await db.collection('matches').doc(matchId).update({
            homeScore: homeScoreInt,
            awayScore: awayScoreInt,
            status: 'finished',
            isResultEntered: false,
            resultEnteredBy: user?.uid || 'admin',
            resultEnteredAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Lưu lịch sử nhập kết quả
        await db.collection('match_results').add({
            matchId: matchId,
            homeScore: homeScoreInt,
            awayScore: awayScoreInt,
            enteredBy: user?.uid || 'admin',
            enteredByEmail: user?.email || 'admin',
            note: note || `Nhập kết quả ${match.homeTeam} vs ${match.awayTeam}`,
            enteredAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Log hành động
        await logAdminAction('enter_result', matchId, { 
            homeScore: homeScoreInt, 
            awayScore: awayScoreInt, 
            note,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam
        });

        alert('✅ Đã nhập kết quả thành công! Đang tính điểm...');

        // 🔧 TÍNH ĐIỂM - SỬA LỖI
        try {
            // Kiểm tra MatchManager có tồn tại không
            if (typeof MatchManager !== 'undefined') {
                const matchManager = new MatchManager();
                await matchManager.calculatePoints(matchId);
                alert('✅ Đã tính điểm thành công!');
            } else {
                console.warn('⚠️ MatchManager không tồn tại, bỏ qua tính điểm tự động');
                alert('⚠️ Đã nhập kết quả thành công! Vui lòng tính điểm thủ công.');
            }
        } catch (calcError) {
            console.warn('⚠️ Lỗi tính điểm:', calcError);
            alert('⚠️ Đã nhập kết quả nhưng chưa tính điểm được. Vui lòng tính điểm thủ công.');
        }

        // Đóng form và reload
        cancelResultForm();
        await loadMatches();
        await loadDashboard();
        
        console.log('✅ Hoàn tất quá trình nhập kết quả');

    } catch (error) {
        console.error('❌ Lỗi nhập kết quả:', error);
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
                    <th>Điểm</th>
                    <th>Trạng thái</th>
                </tr>
            </thead>
            <tbody>`;
        
        for (const doc of snapshot.docs) {
            const pred = doc.data();
            let matchName = 'N/A';
            try {
                const matchDoc = await db.collection('matches').doc(pred.matchId).get();
                if (matchDoc.exists) {
                    const m = matchDoc.data();
                    matchName = `${m.homeTeam} vs ${m.awayTeam}`;
                }
            } catch (e) {}
            
            const statusBadge = pred.isProcessed ? 
                (pred.isCorrect ? '✅ Đúng' : '❌ Sai') : 
                '⏳ Chờ xử lý';
            
            html += `
                <tr>
                    <td>${pred.userName || 'N/A'}</td>
                    <td>${matchName}</td>
                    <td style="text-align:center;font-weight:600;">${pred.homeScore} - ${pred.awayScore}</td>
                    <td>${pred.userHandicap || 0} (${pred.handicapChoice || 'draw'})</td>
                    <td style="text-align:center;font-weight:bold;color:${pred.points > 0 ? '#28a745' : '#dc3545'};">${pred.points || 0}</td>
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
