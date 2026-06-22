// js/admin.js
console.log('🔍 Admin.js loaded');

// ============================================
// DANH SÁCH ADMIN EMAIL - THÊM EMAIL CỦA BẠN
// ============================================
const ADMIN_EMAILS = [
    'songdaytronglong@gmail.com',  // ✅ Email của bạn
    'admin@gmail.com'
];

// ============================================
// KIỂM TRA QUYỀN ADMIN - FIX LỖI
// ============================================
async function checkAdmin() {
    console.log('🔍 Checking admin permissions...');
    
    try {
        // ĐỢI AUTH LOAD - QUAN TRỌNG
        await new Promise((resolve) => {
            const unsubscribe = firebase.auth().onAuthStateChanged(user => {
                unsubscribe();
                resolve(user);
            });
        });

        const user = firebase.auth().currentUser;
        console.log('📧 Current user:', user?.email);

        // Nếu chưa đăng nhập
        if (!user) {
            console.warn('⚠️ Chưa đăng nhập');
            document.body.innerHTML = `
                <div style="text-align:center;padding:50px;font-family:Arial;">
                    <h2>🔐 Vui lòng đăng nhập</h2>
                    <p style="margin:20px 0;color:#666;">Bạn cần đăng nhập để truy cập trang admin</p>
                    <a href="index.html" style="display:inline-block;padding:12px 30px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:8px;text-decoration:none;font-weight:600;">← Về trang chủ</a>
                </div>
            `;
            return false;
        }

        // Kiểm tra email admin
        if (!ADMIN_EMAILS.includes(user.email)) {
            console.warn('⚠️ Không có quyền admin:', user.email);
            document.body.innerHTML = `
                <div style="text-align:center;padding:50px;font-family:Arial;">
                    <h2>⛔ Không có quyền truy cập</h2>
                    <p style="margin:20px 0;color:#666;">Tài khoản <strong>${user.email}</strong> không có quyền admin</p>
                    <a href="index.html" style="display:inline-block;padding:12px 30px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border-radius:8px;text-decoration:none;font-weight:600;">← Về trang chủ</a>
                </div>
            `;
            return false;
        }

        // ✅ LÀ ADMIN - HIỂN THỊ TRANG
        console.log('✅ Admin verified:', user.email);
        
        // Hiển thị tên admin
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
        console.error('❌ Lỗi kiểm tra admin:', error);
        document.body.innerHTML = `
            <div style="text-align:center;padding:50px;font-family:Arial;">
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
// CÁC HÀM LOAD DỮ LIỆU
// ============================================
async function loadDashboard() {
    try {
        const [usersSnap, matchesSnap, predSnap] = await Promise.all([
            firebase.firestore().collection('users').get(),
            firebase.firestore().collection('matches').get(),
            firebase.firestore().collection('predictions').get()
        ]);
        
        document.getElementById('totalUsers').textContent = usersSnap.size || 0;
        document.getElementById('totalMatches').textContent = matchesSnap.size || 0;
        document.getElementById('totalPredictions').textContent = predSnap.size || 0;
        
        let totalPoints = 0;
        usersSnap.forEach(doc => {
            totalPoints += doc.data().totalPoints || 0;
        });
        document.getElementById('totalPoints').textContent = totalPoints;
        
    } catch (error) {
        console.error('Lỗi load dashboard:', error);
    }
}

async function loadMatches() {
    const container = document.getElementById('matchListAdmin');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">⏳ Đang tải...</div>';
    
    try {
        const snapshot = await firebase.firestore().collection('matches')
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
            
            html += `
                <div class="match-card">
                    <div class="match-info">
                        <span class="team">${match.homeTeam || '?'}</span>
                        <span class="vs">vs</span>
                        <span class="team">${match.awayTeam || '?'}</span>
                    </div>
                    <div class="match-details">
                        <span>📅 ${match.date || 'N/A'}</span>
                        <span>⏰ ${match.time || 'N/A'}</span>
                        <span>⚡ ${match.handicap || 0}</span>
                    </div>
                    <div class="match-score">
                        ${isFinished ? `${match.homeScore} - ${match.awayScore}` : '⏳ Chưa diễn ra'}
                    </div>
                    <div class="match-actions">
                        <button onclick="editMatch('${id}')" class="btn-secondary btn-sm">✏️ Sửa</button>
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

async function loadUsers() {
    const container = document.getElementById('userList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">⏳ Đang tải...</div>';
    
    try {
        const snapshot = await firebase.firestore().collection('users')
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
                        <span>⭐ ${user.totalPoints || 0}</span>
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

async function loadPredictions() {
    const container = document.getElementById('predictionList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">⏳ Đang tải...</div>';
    
    try {
        const snapshot = await firebase.firestore().collection('predictions')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align:center;padding:20px;color:#888;">📭 Chưa có dự đoán nào</p>';
            return;
        }
        
        let html = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;">
            <thead><tr style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;">
                <th style="padding:12px 16px;text-align:left;">User</th>
                <th style="padding:12px 16px;text-align:left;">Trận</th>
                <th style="padding:12px 16px;text-align:center;">Dự đoán</th>
                <th style="padding:12px 16px;text-align:center;">Điểm</th>
            </tr></thead><tbody>`;
        
        for (const doc of snapshot.docs) {
            const pred = doc.data();
            let matchName = 'N/A';
            try {
                const matchDoc = await firebase.firestore().collection('matches').doc(pred.matchId).get();
                if (matchDoc.exists) {
                    const m = matchDoc.data();
                    matchName = `${m.homeTeam} vs ${m.awayTeam}`;
                }
            } catch (e) {}
            
            html += `<tr style="border-bottom:1px solid #f0f0f0;">
                <td style="padding:10px 16px;">${pred.userName || 'N/A'}</td>
                <td style="padding:10px 16px;">${matchName}</td>
                <td style="padding:10px 16px;text-align:center;">${pred.homeScore} - ${pred.awayScore}</td>
                <td style="padding:10px 16px;text-align:center;">${pred.points || 0}</td>
            </tr>`;
        }
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Lỗi load predictions:', error);
        container.innerHTML = `<p style="color:red;">❌ Lỗi: ${error.message}</p>`;
    }
}

async function loadLogs() {
    const container = document.getElementById('logList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">⏳ Đang tải...</div>';
    
    try {
        const snapshot = await firebase.firestore().collection('audit_logs')
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="text-align:center;padding:20px;color:#888;">📭 Chưa có lịch sử</p>';
            return;
        }
        
        let html = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;">
            <thead><tr style="background:#333;color:white;">
                <th style="padding:12px 16px;text-align:left;">Thời gian</th>
                <th style="padding:12px 16px;text-align:left;">Admin</th>
                <th style="padding:12px 16px;text-align:left;">Hành động</th>
            </tr></thead><tbody>`;
        
        snapshot.forEach(doc => {
            const log = doc.data();
            const time = log.timestamp?.toDate?.()?.toLocaleString() || 'N/A';
            
            html += `<tr style="border-bottom:1px solid #f0f0f0;">
                <td style="padding:10px 16px;font-size:13px;">${time}</td>
                <td style="padding:10px 16px;">${log.adminName || log.adminEmail || 'N/A'}</td>
                <td style="padding:10px 16px;">${log.action || 'N/A'}</td>
            </tr>`;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Lỗi load logs:', error);
        container.innerHTML = `<p style="color:red;">❌ Lỗi: ${error.message}</p>`;
    }
}

// ============================================
// CRUD MATCHES
// ============================================
function showAddMatchForm() {
    const form = document.getElementById('matchForm');
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
    document.getElementById('matchForm').style.display = 'none';
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
        if (matchId) {
            await firebase.firestore().collection('matches').doc(matchId).update(data);
            alert('✅ Cập nhật trận đấu thành công!');
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            data.createdBy = firebase.auth().currentUser.uid;
            await firebase.firestore().collection('matches').add(data);
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
        const doc = await firebase.firestore().collection('matches').doc(matchId).get();
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
        await firebase.firestore().collection('matches').doc(matchId).delete();
        alert('✅ Xóa trận đấu thành công!');
        await loadMatches();
        await loadDashboard();
    } catch (error) {
        console.error('Lỗi xóa trận:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}

// ============================================
// TAB SWITCHING
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            const tabId = this.dataset.tab;
            const content = document.getElementById(tabId);
            if (content) content.classList.add('active');
            
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
// INIT - GỌI KHI TRANG LOAD
// ============================================
console.log('🔄 DOM loaded, checking admin...');
// Đợi DOM load xong rồi mới kiểm tra
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAdmin);
} else {
    checkAdmin();
}