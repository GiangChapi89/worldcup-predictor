// js/admin.js - VERSION SỬA LỖI

// ============================================
// DANH SÁCH ADMIN EMAIL
// ============================================
const ADMIN_EMAILS = [
    'songdaytronglong@gmail.com',  // ✅ Email của bạn
    'admin@gmail.com'
];

// ============================================
// KIỂM TRA QUYỀN ADMIN
// ============================================
async function checkAdmin() {
    console.log('🔍 Đang kiểm tra quyền admin...');
    
    try {
        // Đợi auth load
        await new Promise(resolve => {
            const unsubscribe = auth.onAuthStateChanged(user => {
                unsubscribe();
                resolve(user);
            });
        });

        const user = auth.currentUser;
        console.log('📧 User hiện tại:', user?.email);

        // Kiểm tra đã đăng nhập chưa
        if (!user) {
            console.warn('⚠️ Chưa đăng nhập');
            // KHÔNG CHUYỂN HƯỚNG NGAY, hiển thị thông báo
            document.body.innerHTML = `
                <div style="text-align:center;padding:50px;">
                    <h2>🔐 Vui lòng đăng nhập</h2>
                    <p style="margin:20px 0;">Bạn cần đăng nhập để truy cập trang admin</p>
                    <a href="index.html" class="btn-primary" style="display:inline-block;padding:12px 30px;border-radius:8px;text-decoration:none;color:white;background:linear-gradient(135deg,#667eea,#764ba2);">← Về trang chủ</a>
                </div>
            `;
            return false;
        }

        // Kiểm tra email có trong danh sách admin không
        if (!ADMIN_EMAILS.includes(user.email)) {
            console.warn('⚠️ Không có quyền admin:', user.email);
            document.body.innerHTML = `
                <div style="text-align:center;padding:50px;">
                    <h2>⛔ Không có quyền truy cập</h2>
                    <p style="margin:20px 0;">Tài khoản ${user.email} không có quyền admin</p>
                    <a href="index.html" class="btn-primary" style="display:inline-block;padding:12px 30px;border-radius:8px;text-decoration:none;color:white;background:linear-gradient(135deg,#667eea,#764ba2);">← Về trang chủ</a>
                </div>
            `;
            return false;
        }

        // ✅ LÀ ADMIN - Hiển thị trang
        console.log('✅ Admin logged in:', user.email);
        
        // Cập nhật tên admin
        const nameEl = document.getElementById('adminName');
        if (nameEl) {
            nameEl.textContent = user.displayName || user.email;
        }
        
        // Load dữ liệu
        await Promise.all([
            loadDashboard(),
            loadMatches(),
            loadUsers(),
            loadLogs()
        ]);
        
        // Hiển thị các tab
        document.querySelector('.admin-container').style.display = 'block';
        
        return true;
        
    } catch (error) {
        console.error('❌ Lỗi kiểm tra admin:', error);
        // KHÔNG CHUYỂN HƯỚNG, hiển thị lỗi
        document.body.innerHTML = `
            <div style="text-align:center;padding:50px;">
                <h2>❌ Lỗi</h2>
                <p style="margin:20px 0;color:red;">${error.message}</p>
                <button onclick="location.reload()" class="btn-primary" style="padding:12px 30px;border-radius:8px;border:none;cursor:pointer;color:white;background:linear-gradient(135deg,#667eea,#764ba2);">🔄 Thử lại</button>
                <br><br>
                <a href="index.html" style="color:#667eea;">← Về trang chủ</a>
            </div>
        `;
        return false;
    }
}

// ============================================
// KHỞI TẠO KHI TRANG LOAD
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Admin page loaded');
    
    // Ẩn container chính ban đầu
    const container = document.querySelector('.admin-container');
    if (container) {
        container.style.display = 'none';
    }
    
    // Kiểm tra quyền admin
    checkAdmin();
});

// ============================================
// HÀM LOAD DỮ LIỆU
// ============================================
async function loadDashboard() {
    try {
        // Users
        const usersSnap = await db.collection('users').get();
        document.getElementById('totalUsers').textContent = usersSnap.size;
        
        // Matches
        const matchesSnap = await db.collection('matches').get();
        document.getElementById('totalMatches').textContent = matchesSnap.size;
        
        // Predictions
        const predSnap = await db.collection('predictions').get();
        document.getElementById('totalPredictions').textContent = predSnap.size;
    } catch (error) {
        console.error('Lỗi load dashboard:', error);
    }
}

async function loadMatches() {
    const container = document.getElementById('matchListAdmin');
    if (!container) return;
    
    try {
        const snapshot = await db.collection('matches')
            .orderBy('date')
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = '<p>Chưa có trận đấu nào</p>';
            return;
        }
        
        let html = '<div class="match-grid">';
        snapshot.forEach(doc => {
            const match = doc.data();
            html += `
                <div class="match-card">
                    <div class="match-info">
                        <span class="team">${match.homeTeam}</span>
                        <span class="vs">vs</span>
                        <span class="team">${match.awayTeam}</span>
                    </div>
                    <div class="match-details">
                        <span>📅 ${match.date}</span>
                        <span>⏰ ${match.time}</span>
                        <span>⚡ Chấp: ${match.handicap || 0}</span>
                    </div>
                    <div class="match-score">
                        ${match.status === 'finished' ? 
                            `${match.homeScore} - ${match.awayScore}` : 
                            '⏳ Chưa diễn ra'}
                    </div>
                    <div class="match-actions">
                        <button onclick="editMatch('${doc.id}')" class="btn-secondary">✏️ Sửa</button>
                        <button onclick="deleteMatch('${doc.id}')" class="btn-danger">🗑️ Xóa</button>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Lỗi load matches:', error);
        container.innerHTML = `<p style="color:red;">Lỗi: ${error.message}</p>`;
    }
}

async function loadUsers() {
    const container = document.getElementById('userList');
    if (!container) return;
    
    try {
        const snapshot = await db.collection('users').get();
        if (snapshot.empty) {
            container.innerHTML = '<p>Chưa có người dùng nào</p>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            html += `
                <div class="user-card">
                    <span>${user.name || user.email}</span>
                    <span>${user.email}</span>
                    <span>⭐ ${user.totalPoints || 0}</span>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (error) {
        console.error('Lỗi load users:', error);
    }
}

async function loadLogs() {
    const container = document.getElementById('logList');
    if (!container) return;
    container.innerHTML = '<p>Đang tải...</p>';
}

// ============================================
// HÀM QUẢN LÝ TRẬN ĐẤU
// ============================================
function showAddMatchForm() {
    document.getElementById('matchForm').style.display = 'block';
    document.getElementById('matchId').value = '';
    document.getElementById('homeTeam').value = '';
    document.getElementById('awayTeam').value = '';
    document.getElementById('matchDate').value = '';
    document.getElementById('matchTime').value = '';
    document.getElementById('handicap').value = '0';
    document.getElementById('group').value = '';
    document.getElementById('homeScore').value = '';
    document.getElementById('awayScore').value = '';
}

function cancelMatchForm() {
    document.getElementById('matchForm').style.display = 'none';
}

async function saveMatch() {
    const matchId = document.getElementById('matchId').value;
    const data = {
        homeTeam: document.getElementById('homeTeam').value,
        awayTeam: document.getElementById('awayTeam').value,
        date: document.getElementById('matchDate').value,
        time: document.getElementById('matchTime').value,
        handicap: parseFloat(document.getElementById('handicap').value),
        group: document.getElementById('group').value || 'Group A',
        homeScore: document.getElementById('homeScore').value ? parseInt(document.getElementById('homeScore').value) : null,
        awayScore: document.getElementById('awayScore').value ? parseInt(document.getElementById('awayScore').value) : null,
        status: document.getElementById('homeScore').value && document.getElementById('awayScore').value ? 'finished' : 'upcoming',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        if (matchId) {
            await db.collection('matches').doc(matchId).update(data);
            alert('✅ Cập nhật trận đấu thành công!');
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            data.createdBy = auth.currentUser.uid;
            await db.collection('matches').add(data);
            alert('✅ Thêm trận đấu thành công!');
        }
        cancelMatchForm();
        loadMatches();
    } catch (error) {
        console.error('Lỗi lưu trận đấu:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}

async function editMatch(matchId) {
    try {
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
    }
}

async function deleteMatch(matchId) {
    if (confirm('Bạn có chắc muốn xóa trận đấu này?')) {
        try {
            await db.collection('matches').doc(matchId).delete();
            alert('✅ Xóa trận đấu thành công!');
            loadMatches();
        } catch (error) {
            console.error('Lỗi xóa trận:', error);
            alert('❌ Lỗi: ' + error.message);
        }
    }
}

// ============================================
// TAB SWITCHING
// ============================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        this.classList.add('active');
        const tabId = this.dataset.tab;
        document.getElementById(tabId).classList.add('active');
        
        if (tabId === 'matches') loadMatches();
        if (tabId === 'users') loadUsers();
        if (tabId === 'logs') loadLogs();
    });
});

// ============================================
// LOGOUT
// ============================================
function logout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

console.log('✅ admin.js loaded successfully!');