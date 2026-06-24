// js/admin.js - SỬA HÀM checkAdmin

// ============================================
// DANH SÁCH ADMIN EMAIL (SUPER ADMIN) - CHỈ DÙNG CHO SUPER ADMIN
// ============================================
const SUPER_ADMIN_EMAILS = [
    'songdaytronglong@gmail.com',
    'admin@gmail.com'
];

// ============================================
// KIỂM TRA QUYỀN ADMIN - TỪ FIRESTORE
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

        // 🔧 KIỂM TRA QUYỀN ADMIN TỪ FIRESTORE
        try {
            const db = firebase.firestore();
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                const isAdmin = userData.role === 'admin' || userData.isAdmin === true;
                
                if (isAdmin) {
                    console.log('✅ Admin verified from Firestore:', user.email);
                    
                    // Hiển thị tên admin
                    const nameEl = document.getElementById('adminName');
                    if (nameEl) {
                        nameEl.textContent = '👤 ' + (userData.nickname || userData.name || user.displayName || user.email);
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
                }
            }
        } catch (error) {
            console.error('❌ Lỗi kiểm tra Firestore:', error);
        }

        // Nếu không có quyền admin
        document.body.innerHTML = `
            <div style="text-align:center;padding:50px;font-family:Arial,sans-serif;">
                <h2>⛔ Không có quyền truy cập</h2>
                <p style="margin:20px 0;color:#666;">Tài khoản <strong>${user.email}</strong> không có quyền admin</p>
                <a href="index.html" style="display:inline-block;padding:12px 30px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:8px;text-decoration:none;font-weight:600;">← Về trang chủ</a>
            </div>
        `;
        return false;
        
    } catch (error) {
        console.error('❌ Lỗi:', error);
        document.body.innerHTML = `
            <div style="text-align:center;padding:50px;font-family:Arial,sans-serif;">
                <h2>❌ Lỗi</h2>
                <p style="margin:20px 0;color:red;">${error.message}</p>
                <button onclick="location.reload()" style="padding:12px 30px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">🔄 Thử lại</button>
                <br><br>
                <a href="index.html" style="color:#667eea;">← Về trang chủ</a>
            </div>
        `;
        return false;
    }
}

// ============================================
// CẬP NHẬT HÀM logAdminAction
// ============================================
async function logAdminAction(action, target, details) {
    try {
        const db = firebase.firestore();
        const user = firebase.auth().currentUser;
        if (!user) return;
        
        // Lấy thông tin user từ Firestore
        let userName = user.displayName || user.email;
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                userName = data.nickname || data.name || user.displayName || user.email;
            }
        } catch (e) {
            console.warn('Không thể lấy tên user:', e);
        }
        
        await db.collection('audit_logs').add({
            adminId: user.uid,
            adminName: userName,
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
// CẬP NHẬT HÀM checkIsAdmin TRONG MATCH MANAGER
// ============================================
// Hàm này sẽ được sử dụng trong matches.js
async function checkIsAdmin(user) {
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
// CẬP NHẬT HÀM submitMatchResult - SỬA KIỂM TRA ADMIN
// ============================================
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
        
        // 🔧 KIỂM TRA QUYỀN ADMIN TỪ FIRESTORE
        const isAdmin = await checkIsAdmin(user);
        if (!isAdmin) {
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

        console.log('📝 Cập nhật kết quả trận đấu...');

        // 1. Cập nhật kết quả trận đấu
        await db.collection('matches').doc(matchId).update({
            homeScore: homeScoreInt,
            awayScore: awayScoreInt,
            status: 'finished',
            isResultEntered: false,
            resultEnteredBy: user?.uid || 'admin',
            resultEnteredAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Đã cập nhật kết quả trận đấu');

        // 2. Lưu lịch sử nhập kết quả
        await db.collection('match_results').add({
            matchId: matchId,
            homeScore: homeScoreInt,
            awayScore: awayScoreInt,
            enteredBy: user?.uid || 'admin',
            enteredByEmail: user?.email || 'admin',
            note: note || `Nhập kết quả ${match.homeTeam} vs ${match.awayTeam}`,
            enteredAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Đã lưu lịch sử kết quả');

        // 3. Log hành động
        await logAdminAction('enter_result', matchId, { 
            homeScore: homeScoreInt, 
            awayScore: awayScoreInt, 
            note,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam
        });

        // 4. Đóng form
        cancelResultForm();

        // 5. TỰ ĐỘNG TÍNH ĐIỂM
        console.log('🧮 Tự động tính điểm...');
        
        try {
            if (typeof MatchManager === 'undefined') {
                console.error('❌ MatchManager không tồn tại!');
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
// CẬP NHẬT HÀM deleteMatchResult - SỬA KIỂM TRA ADMIN
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
        const user = firebase.auth().currentUser;
        
        // 🔧 KIỂM TRA QUYỀN ADMIN TỪ FIRESTORE
        const isAdmin = await checkIsAdmin(user);
        if (!isAdmin) {
            alert('❌ Bạn không có quyền xóa kết quả!');
            return;
        }
        
        // ... Phần còn lại giữ nguyên ...
        
    } catch (error) {
        console.error('❌ Lỗi xóa kết quả:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}