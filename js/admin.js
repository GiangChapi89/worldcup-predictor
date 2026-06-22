// js/admin.js
let currentAction = null;
let currentTarget = null;

// Kiểm tra quyền admin
// js/admin.js
async function checkAdmin() {
    // Hiển thị loading
    document.body.innerHTML = '<div style="text-align:center;padding:50px;">⏳ Đang kiểm tra quyền...</div>';
    
    try {
        const user = auth.currentUser;
        
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        // Kiểm tra email
        if (!ADMIN_EMAILS.includes(user.email)) {
            alert('❌ Không có quyền admin!');
            window.location.href = 'index.html';
            return;
        }
        
        // ✅ Admin - Hiển thị trang
        console.log('✅ Admin:', user.email);
        // Load lại nội dung trang (nếu đã bị xóa)
        location.reload();
        
    } catch (error) {
        console.error('❌ Lỗi:', error);
        window.location.href = 'index.html';
    }
}

// Load Dashboard
async function loadDashboard() {
    try {
        // Thống kê users
        const usersSnap = await db.collection('users').get();
        document.getElementById('totalUsers').textContent = usersSnap.size;
        
        // Thống kê matches
        const matchesSnap = await db.collection('matches').get();
        document.getElementById('totalMatches').textContent = matchesSnap.size;
        
        // Thống kê predictions
        const predSnap = await db.collection('predictions').get();
        document.getElementById('totalPredictions').textContent = predSnap.size;
        
        // Load recent activity
        loadRecentActivity();
    } catch (error) {
        console.error('Lỗi load dashboard:', error);
    }
}

// Quản lý trận đấu
async function loadMatches() {
    const container = document.getElementById('matchListAdmin');
    container.innerHTML = '<p>Đang tải...</p>';
    
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
                        <button onclick="confirmDeleteMatch('${doc.id}')" class="btn-danger">🗑️ Xóa</button>
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

// Thêm/Sửa trận đấu
async function saveMatch() {
    const matchId = document.getElementById('matchId').value;
    const data = {
        homeTeam: document.getElementById('homeTeam').value,
        awayTeam: document.getElementById('awayTeam').value,
        date: document.getElementById('matchDate').value,
        time: document.getElementById('matchTime').value,
        handicap: parseFloat(document.getElementById('handicap').value),
        group: document.getElementById('group').value,
        homeScore: document.getElementById('homeScore').value ? parseInt(document.getElementById('homeScore').value) : null,
        awayScore: document.getElementById('awayScore').value ? parseInt(document.getElementById('awayScore').value) : null,
        status: document.getElementById('homeScore').value && document.getElementById('awayScore').value ? 'finished' : 'upcoming',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        if (matchId) {
            // Update
            await db.collection('matches').doc(matchId).update(data);
            await logAdminAction('update_match', matchId, data);
            alert('✅ Cập nhật trận đấu thành công!');
        } else {
            // Create
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            data.createdBy = auth.currentUser.uid;
            await db.collection('matches').add(data);
            await logAdminAction('create_match', null, data);
            alert('✅ Thêm trận đấu thành công!');
        }
        cancelMatchForm();
        loadMatches();
    } catch (error) {
        console.error('Lỗi lưu trận đấu:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}

// Edit match
function editMatch(matchId) {
    showAddMatchForm();
    db.collection('matches').doc(matchId).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('matchId').value = matchId;
            document.getElementById('homeTeam').value = data.homeTeam || '';
            document.getElementById('awayTeam').value = data.awayTeam || '';
            document.getElementById('matchDate').value = data.date || '';
            document.getElementById('matchTime').value = data.time || '';
            document.getElementById('handicap').value = data.handicap || 0;
            document.getElementById('group').value = data.group || '';
            document.getElementById('homeScore').value = data.homeScore || '';
            document.getElementById('awayScore').value = data.awayScore || '';
            document.getElementById('deleteMatchBtn').style.display = 'inline-block';
        }
    });
}

// Delete match
async function deleteMatch() {
    const matchId = document.getElementById('matchId').value;
    if (!matchId) return;
    
    if (confirm('Bạn có chắc muốn xóa trận đấu này?')) {
        try {
            await db.collection('matches').doc(matchId).delete();
            await logAdminAction('delete_match', matchId, {});
            alert('✅ Xóa trận đấu thành công!');
            cancelMatchForm();
            loadMatches();
        } catch (error) {
            console.error('Lỗi xóa trận:', error);
            alert('❌ Lỗi: ' + error.message);
        }
    }
}

// Quản lý người dùng
async function loadUsers() {
    const container = document.getElementById('userList');
    container.innerHTML = '<p>Đang tải...</p>';
    
    try {
        const snapshot = await db.collection('users')
            .orderBy('name')
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = '<p>Chưa có người dùng nào</p>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const user = doc.data();
            const isAdmin = ['admin@gmail.com', 'your-email@gmail.com'].includes(user.email);
            html += `
                <div class="user-card">
                    <div class="user-info">
                        <span class="user-name">${user.name || 'N/A'}</span>
                        <span class="user-email">${user.email}</span>
                        <div>
                            <span class="badge ${isAdmin ? 'badge-admin' : 'badge-user'}">${isAdmin ? 'Admin' : 'User'}</span>
                            <span class="badge ${user.isActive !== false ? 'badge-active' : 'badge-locked'}">
                                ${user.isActive !== false ? 'Đang hoạt động' : 'Đã khóa'}
                            </span>
                            <span>⭐ ${user.totalPoints || 0} điểm</span>
                        </div>
                    </div>
                    <div class="user-actions">
                        ${!isAdmin ? `
                            <button onclick="toggleUserStatus('${doc.id}')" class="btn-secondary">
                                ${user.isActive !== false ? '🔒 Khóa' : '🔓 Mở khóa'}
                            </button>
                            <button onclick="deleteUser('${doc.id}')" class="btn-danger">🗑️ Xóa</button>
                        ` : '<span class="badge badge-admin">Không thể thao tác với Admin</span>'}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (error) {
        console.error('Lỗi load users:', error);
        container.innerHTML = `<p style="color:red;">Lỗi: ${error.message}</p>`;
    }
}

// Toggle user status (lock/unlock)
async function toggleUserStatus(uid) {
    const userRef = db.collection('users').doc(uid);
    const doc = await userRef.get();
    if (!doc.exists) return;
    
    const currentStatus = doc.data().isActive;
    const newStatus = currentStatus === false ? true : false;
    
    if (confirm(`Bạn có chắc muốn ${newStatus ? 'mở khóa' : 'khóa'} người dùng này?`)) {
        await userRef.update({
            isActive: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await logAdminAction(newStatus ? 'unlock_user' : 'lock_user', uid, { newStatus });
        loadUsers();
    }
}

// Delete user
async function deleteUser(uid) {
    if (confirm('Bạn có chắc muốn xóa người dùng này? Hành động này không thể hoàn tác!')) {
        try {
            // Xóa user
            await db.collection('users').doc(uid).delete();
            
            // Xóa tất cả dự đoán của user
            const predSnap = await db.collection('predictions')
                .where('userId', '==', uid)
                .get();
            
            const batch = db.batch();
            predSnap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            
            await logAdminAction('delete_user', uid, {});
            alert('✅ Xóa người dùng thành công!');
            loadUsers();
        } catch (error) {
            console.error('Lỗi xóa user:', error);
            alert('❌ Lỗi: ' + error.message);
        }
    }
}

// Log admin actions
async function logAdminAction(action, target, details) {
    try {
        const user = auth.currentUser;
        await db.collection('audit_logs').add({
            adminId: user.uid,
            adminName: user.displayName || user.email,
            adminEmail: user.email,
            action: action,
            target: target || null,
            details: details || {},
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Lỗi log:', error);
    }
}

// Load logs
async function loadLogs() {
    const container = document.getElementById('logList');
    container.innerHTML = '<p>Đang tải...</p>';
    
    try {
        const snapshot = await db.collection('audit_logs')
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = '<p>Chưa có lịch sử hoạt động</p>';
            return;
        }
        
        let html = '<table class="log-table"><thead><tr><th>Thời gian</th><th>Admin</th><th>Hành động</th><th>Chi tiết</th></tr></thead><tbody>';
        snapshot.forEach(doc => {
            const log = doc.data();
            const time = log.timestamp?.toDate?.()?.toLocaleString() || 'N/A';
            html += `
                <tr>
                    <td>${time}</td>
                    <td>${log.adminName || log.adminEmail}</td>
                    <td>${getActionLabel(log.action)}</td>
                    <td>${JSON.stringify(log.details)}</td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Lỗi load logs:', error);
        container.innerHTML = `<p style="color:red;">Lỗi: ${error.message}</p>`;
    }
}

function getActionLabel(action) {
    const labels = {
        'create_match': '➕ Tạo trận đấu',
        'update_match': '✏️ Cập nhật trận đấu',
        'delete_match': '🗑️ Xóa trận đấu',
        'lock_user': '🔒 Khóa user',
        'unlock_user': '🔓 Mở khóa user',
        'delete_user': '🗑️ Xóa user',
        'update_prediction': '✏️ Cập nhật dự đoán'
    };
    return labels[action] || action;
}

// Search users
function searchUsers() {
    const keyword = document.getElementById('userSearch').value.toLowerCase();
    const cards = document.querySelectorAll('.user-card');
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(keyword) ? 'flex' : 'none';
    });
}

// Export users to CSV
async function exportUsers() {
    try {
        const snapshot = await db.collection('users').get();
        let csv = 'Tên,Email,Điểm,Dự đoán đúng,Tổng dự đoán,Trạng thái\n';
        snapshot.forEach(doc => {
            const user = doc.data();
            csv += `${user.name || ''},${user.email || ''},${user.totalPoints || 0},${user.correctPredictions || 0},${user.totalPredictions || 0},${user.isActive !== false ? 'Active' : 'Locked'}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
    } catch (error) {
        console.error('Lỗi export:', error);
        alert('❌ Lỗi export: ' + error.message);
    }
}

// UI Functions
function showAddMatchForm() {
    document.getElementById('matchForm').style.display = 'block';
    document.getElementById('deleteMatchBtn').style.display = 'none';
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

function confirmDeleteMatch(matchId) {
    if (confirm('Bạn có chắc muốn xóa trận đấu này?')) {
        db.collection('matches').doc(matchId).delete()
            .then(() => {
                logAdminAction('delete_match', matchId, {});
                loadMatches();
                alert('✅ Xóa trận đấu thành công!');
            })
            .catch(error => {
                console.error('Lỗi xóa:', error);
                alert('❌ Lỗi: ' + error.message);
            });
    }
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        // Remove active from all tabs
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active to clicked tab
        this.classList.add('active');
        const tabId = this.dataset.tab;
        document.getElementById(tabId).classList.add('active');
        
        // Load data based on tab
        switch(tabId) {
            case 'matches':
                loadMatches();
                break;
            case 'users':
                loadUsers();
                break;
            case 'logs':
                loadLogs();
                break;
            case 'predictions':
                loadPredictionsAdmin();
                break;
        }
    });
});

// Load predictions admin
async function loadPredictionsAdmin() {
    const container = document.getElementById('predictionList');
    container.innerHTML = '<p>Đang tải...</p>';
    
    try {
        const snapshot = await db.collection('predictions')
            .orderBy('timestamp', 'desc')
            .limit(100)
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = '<p>Chưa có dự đoán nào</p>';
            return;
        }
        
        let html = '<table class="log-table"><thead><tr><th>User</th><th>Trận</th><th>Dự đoán</th><th>Kết quả</th><th>Điểm</th></tr></thead><tbody>';
        for (const doc of snapshot.docs) {
            const pred = doc.data();
            const matchDoc = await db.collection('matches').doc(pred.matchId).get();
            const match = matchDoc.data();
            
            html += `
                <tr>
                    <td>${pred.userName || 'N/A'}</td>
                    <td>${match ? `${match.homeTeam} vs ${match.awayTeam}` : 'N/A'}</td>
                    <td>${pred.homeScore} - ${pred.awayScore}</td>
                    <td>${match?.status === 'finished' ? `${match.homeScore} - ${match.awayScore}` : 'Chưa có'}</td>
                    <td>${pred.points || 0}</td>
                </tr>
            `;
        }
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Lỗi load predictions:', error);
        container.innerHTML = `<p style="color:red;">Lỗi: ${error.message}</p>`;
    }
}

// Logout
function logout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}



// Initialize
document.addEventListener('DOMContentLoaded', checkAdmin);