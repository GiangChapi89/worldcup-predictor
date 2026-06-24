// js/admin.js - HOÀN CHỈNH

// ============================================
// DANH SÁCH ADMIN EMAIL (SUPER ADMIN)
// ============================================
const SUPER_ADMIN_EMAILS = [
    'songdaytronglong@gmail.com',
    'admin@gmail.com'
];

// ============================================
// KIỂM TRA QUYỀN ADMIN TỪ FIRESTORE
// ============================================
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
// HÀM LOAD DASHBOARD
// ============================================
async function loadDashboard() {
    console.log('📊 Loading dashboard...');
    
    try {
        const db = firebase.firestore();
        
        const usersSnap = await db.collection('users').get();
        const totalUsers = usersSnap.size;
        const totalUsersEl = document.getElementById('totalUsers');
        if (totalUsersEl) totalUsersEl.textContent = totalUsers || 0;
        
        const matchesSnap = await db.collection('matches').get();
        const totalMatches = matchesSnap.size;
        const totalMatchesEl = document.getElementById('totalMatches');
        if (totalMatchesEl) totalMatchesEl.textContent = totalMatches || 0;
        
        const predSnap = await db.collection('predictions').get();
        const totalPredictions = predSnap.size;
        const totalPredictionsEl = document.getElementById('totalPredictions');
        if (totalPredictionsEl) totalPredictionsEl.textContent = totalPredictions || 0;
        
        let totalPoints = 0;
        usersSnap.forEach(doc => {
            const data = doc.data();
            totalPoints += data.totalPoints || 0;
        });
        const totalPointsEl = document.getElementById('totalPoints');
        if (totalPointsEl) totalPointsEl.textContent = totalPoints || 0;
        
        await loadRecentActivity();
        
        console.log('✅ Dashboard loaded successfully');
        
    } catch (error) {
        console.error('❌ Lỗi load dashboard:', error);
    }
}

// ============================================
// HÀM LOAD RECENT ACTIVITY
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
// HÀM LOAD MATCHES
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
// HÀM LOAD USERS
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
        const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(currentUser?.email);

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
            const isSuperAdminUser = SUPER_ADMIN_EMAILS.includes(user.email);
            
            const statusBadge = user.isActive !== false 
                ? '<span class="badge badge-active">✅ Active</span>' 
                : '<span class="badge badge-locked">🔒 Locked</span>';
            
            let roleBadge = isAdmin 
                ? '<span class="badge badge-admin">👑 Admin</span>' 
                : '<span class="badge badge-user">👤 User</span>';
            
            let actionButtons = '';
            
            if (isSuperAdmin && !isSuperAdminUser && !isCurrentUser) {
                if (isAdmin) {
                    actionButtons = `
                        <button onclick="revokeAdmin('${userId}')" class="btn-warning btn-sm" style="background:#ffc107;color:#333;">
                            🔄 Thu hồi
                        </button>
                    `;
                } else {
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
        
        const totalUsers = snapshot.size;
        const adminCount = snapshot.docs.filter(doc => {
            const data = doc.data();
            return data.role === 'admin' || data.isAdmin === true;
        }).length;
        
        html += `
            <div style="margin-top:20px;padding:15px 20px;background:white;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.08);display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                <div><strong>👥 Tổng số người dùng:</strong> ${totalUsers}</div>
                <div><strong>👑 Số admin:</strong> ${adminCount}</div>
                <div><strong>👤 Số user thường:</strong> ${totalUsers - adminCount}</div>
                ${isSuperAdmin ? `
                    <div style="color:#28a745;">✅ Bạn có quyền phê duyệt admin</div>
                ` : `
                    <div style="color:#888;">ℹ️ Chỉ Super Admin mới có quyền phê duyệt</div>
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
// HÀM LOAD PREDICTIONS
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
            
            try {
                const matchDoc = await db.collection('matches').doc(pred.matchId).get();
                if (matchDoc.exists) {
                    const m = matchDoc.data();
                    matchName = `${m.homeTeam} vs ${m.awayTeam}`;
                    if (m.status === 'finished') {
                        matchResult = `${m.homeScore} - ${m.awayScore}`;
                    }
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
                    <td style="text-align:center;font-weight:600;">${matchResult}</td>
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
// HÀM LOAD LOGS
// ============================================
async function loadLogs() {
    const container = document.getElementById('logList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">⏳ Đang tải...</div>';
    
    try {
        const db = firebase.firestore();
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
        
        const logs = [];
        snapshot.forEach(doc => {
            logs.push({ id: doc.id, ...doc.data() });
        });
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
                'delete_user': '🗑️ Xóa user',
                'approve_admin': '👑 Phê duyệt admin',
                'revoke_admin': '👑 Thu hồi admin'
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
// ĐĂNG XUẤT
// ============================================
function logout() {
    if (confirm('Bạn có muốn đăng xuất?')) {
        firebase.auth().signOut().then(() => {
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error('❌ Lỗi đăng xuất:', error);
            alert('❌ Lỗi đăng xuất: ' + error.message);
        });
    }
}

// ============================================
// KIỂM TRA QUYỀN ADMIN
// ============================================
async function checkAdmin() {
    console.log('🔍 Checking admin permissions...');
    
    try {
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

        const isAdmin = await checkIsAdmin(user);
        
        if (isAdmin) {
            console.log('✅ Admin verified from Firestore:', user.email);
            
            const nameEl = document.getElementById('adminName');
            if (nameEl) {
                try {
                    const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                    const userData = userDoc.data();
                    nameEl.textContent = '👤 ' + (userData?.nickname || userData?.name || user.displayName || user.email);
                } catch (e) {
                    nameEl.textContent = '👤 ' + (user.displayName || user.email);
                }
            }
            
            const container = document.querySelector('.admin-container');
            if (container) {
                container.style.display = 'block';
            }
            
            await loadDashboard();
            await loadMatches();
            await loadUsers();
            await loadPredictions();
            await loadLogs();
            
            return true;
        }

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
        const user = firebase.auth().currentUser;
        const isAdmin = await checkIsAdmin(user);
        
        if (!isAdmin) {
            alert('❌ Bạn không có quyền!');
            return;
        }
        
        if (matchId) {
            await db.collection('matches').doc(matchId).update(data);
            await logAdminAction('update_match', matchId, { homeTeam: data.homeTeam, awayTeam: data.awayTeam });
            alert('✅ Cập nhật trận đấu thành công!');
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            data.createdBy = user.uid;
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
        const user = firebase.auth().currentUser;
        const isAdmin = await checkIsAdmin(user);
        
        if (!isAdmin) {
            alert('❌ Bạn không có quyền!');
            return;
        }
        
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
// QUẢN LÝ KẾT QUẢ
// ============================================
function showResultForm(matchId) {
    const form = document.getElementById('resultForm');
    if (!form) return;
    
    document.getElementById('resultMatchId').value = matchId;
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth' });
}

function cancelResultForm() {
    const form = document.getElementById('resultForm');
    if (form) {
        form.style.display = 'none';
    }
}

async function submitMatchResult() {
    console.log('🔍 submitMatchResult called');
    
    const matchId = document.getElementById('resultMatchId').value;
    const homeScore = document.getElementById('resultHomeScore').value;
    const awayScore = document.getElementById('resultAwayScore').value;
    const note = document.getElementById('resultNote').value;

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

    if (!confirm(`Bạn có chắc muốn nhập kết quả:\n${homeScoreInt} - ${awayScoreInt}?`)) {
        return;
    }

    try {
        const db = firebase.firestore();
        const user = firebase.auth().currentUser;
        
        const isAdmin = await checkIsAdmin(user);
        if (!isAdmin) {
            alert('❌ Bạn không có quyền nhập kết quả!');
            return;
        }
        
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

        await db.collection('matches').doc(matchId).update({
            homeScore: homeScoreInt,
            awayScore: awayScoreInt,
            status: 'finished',
            isResultEntered: false,
            resultEnteredBy: user?.uid || 'admin',
            resultEnteredAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await db.collection('match_results').add({
            matchId: matchId,
            homeScore: homeScoreInt,
            awayScore: awayScoreInt,
            enteredBy: user?.uid || 'admin',
            enteredByEmail: user?.email || 'admin',
            note: note || `Nhập kết quả ${match.homeTeam} vs ${match.awayTeam}`,
            enteredAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await logAdminAction('enter_result', matchId, { 
            homeScore: homeScoreInt, 
            awayScore: awayScoreInt, 
            note,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam
        });

        cancelResultForm();

        try {
            if (typeof MatchManager !== 'undefined') {
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
            }
            
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

async function deleteMatchResult(matchId) {
    if (!matchId) {
        alert('❌ Không tìm thấy ID trận đấu!');
        return;
    }

    if (!confirm('⚠️ Bạn có chắc muốn xóa kết quả trận đấu?')) {
        return;
    }

    try {
        const db = firebase.firestore();
        const user = firebase.auth().currentUser;
        
        const isAdmin = await checkIsAdmin(user);
        if (!isAdmin) {
            alert('❌ Bạn không có quyền xóa kết quả!');
            return;
        }
        
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

        await db.collection('matches').doc(matchId).update({
            homeScore: null,
            awayScore: null,
            status: 'upcoming',
            isResultEntered: false,
            resultEnteredBy: null,
            resultEnteredAt: null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

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

async function viewMatchResult(matchId) {
    try {
        const db = firebase.firestore();
        const matchDoc = await db.collection('matches').doc(matchId).get();
        if (!matchDoc.exists) {
            alert('❌ Không tìm thấy trận đấu');
            return;
        }
        
        const match = matchDoc.data();
        
        const resultSnap = await db.collection('match_results')
            .where('matchId', '==', matchId)
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

        alert(`
📊 KẾT QUẢ TRẬN ĐẤU
━━━━━━━━━━━━━━━━━━━━━━
${match.homeTeam} ${match.homeScore} - ${match.awayScore} ${match.awayTeam}

📝 CHI TIẾT:
${resultInfo}

⚡ Kèo chấp: ${match.handicap || 0}
🏆 Trạng thái: ${match.status || 'N/A'}
        `);
    } catch (error) {
        console.error('❌ Lỗi xem kết quả:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}

// ============================================
// PHÊ DUYỆT ADMIN
// ============================================
async function approveAdmin(userId) {
    if (!userId) {
        alert('❌ Không tìm thấy ID người dùng!');
        return;
    }

    if (!confirm('⚠️ Bạn có chắc muốn cấp quyền ADMIN cho người dùng này?')) {
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
        
        if (userData.role === 'admin') {
            alert('⚠️ Người dùng này đã có quyền admin!');
            return;
        }

        await userRef.update({
            role: 'admin',
            isAdmin: true,
            approvedBy: firebase.auth().currentUser?.uid || 'admin',
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await logAdminAction('approve_admin', userId, {
            userName: userData.name || userData.email,
            userEmail: userData.email
        });

        alert(`✅ Đã cấp quyền ADMIN cho ${userData.name || userData.email}!`);
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

    if (!confirm('⚠️ Bạn có chắc muốn THU HỒI quyền ADMIN?')) {
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
        
        const currentUser = firebase.auth().currentUser;
        if (userId === currentUser?.uid) {
            alert('❌ Bạn không thể thu hồi quyền admin của chính mình!');
            return;
        }

        if (userData.role !== 'admin') {
            alert('⚠️ Người dùng này không có quyền admin!');
            return;
        }

        await userRef.update({
            role: 'user',
            isAdmin: false,
            revokedBy: currentUser?.uid || 'admin',
            revokedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await logAdminAction('revoke_admin', userId, {
            userName: userData.name || userData.email,
            userEmail: userData.email
        });

        alert(`✅ Đã thu hồi quyền ADMIN của ${userData.name || userData.email}!`);
        await loadUsers();

    } catch (error) {
        console.error('❌ Lỗi thu hồi quyền admin:', error);
        alert('❌ Lỗi: ' + error.message);
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
        
        let userName = user.displayName || user.email;
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                userName = data.nickname || data.name || user.displayName || user.email;
            }
        } catch (e) {}
        
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
// TÍNH ĐIỂM THỦ CÔNG
// ============================================
async function manualCalculatePoints() {
    const matchId = prompt('📝 Nhập ID trận đấu cần tính điểm:');
    if (!matchId) return;
    
    if (!confirm(`⚠️ Bạn có chắc muốn tính điểm cho trận đấu ${matchId}?`)) return;
    
    try {
        const user = firebase.auth().currentUser;
        const isAdmin = await checkIsAdmin(user);
        if (!isAdmin) {
            alert('❌ Bạn không có quyền!');
            return;
        }
        
        if (typeof MatchManager === 'undefined') {
            alert('❌ Lỗi: MatchManager không tồn tại!');
            return;
        }
        
        const matchManager = new MatchManager();
        const result = await matchManager.calculatePoints(matchId);
        
        if (result) {
            alert(`✅ Tính điểm thành công!\n📊 Số dự đoán: ${result.totalPredictions}\n✅ Đúng: ${result.totalCorrect}\n💰 Điểm: ${result.totalPoints}`);
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

// ============================================
// TÍNH ĐIỂM TẤT CẢ
// ============================================
async function calculateAllMatches() {
    if (!confirm('⚠️ Tính điểm cho TẤT CẢ trận đã kết thúc CHƯA TÍNH ĐIỂM?')) return;
    
    try {
        const db = firebase.firestore();
        const user = firebase.auth().currentUser;
        const isAdmin = await checkIsAdmin(user);
        if (!isAdmin) {
            alert('❌ Bạn không có quyền!');
            return;
        }
        
        const matchesSnap = await db.collection('matches')
            .where('status', '==', 'finished')
            .where('isResultEntered', '==', false)
            .get();
        
        if (matchesSnap.empty) {
            alert('✅ Không có trận nào cần tính điểm!');
            return;
        }
        
        let totalMatches = 0;
        let totalPredictions = 0;
        let totalCorrect = 0;
        let totalPoints = 0;
        
        const matchManager = new MatchManager();
        
        for (const doc of matchesSnap.docs) {
            const match = doc.data();
            const matchId = doc.id;
            
            const result = await matchManager.calculatePoints(matchId);
            
            if (result && !result.alreadyCalculated && !result.noNewPredictions) {
                totalMatches++;
                totalPredictions += result.totalPredictions || 0;
                totalCorrect += result.totalCorrect || 0;
                totalPoints += result.totalPoints || 0;
            }
        }
        
        alert(`✅ Tính điểm hoàn tất!\n📊 Số trận: ${totalMatches}\n📝 Dự đoán: ${totalPredictions}\n✅ Đúng: ${totalCorrect}\n💰 Điểm: ${totalPoints}`);
        
        await loadPredictions();
        await loadDashboard();
        await loadMatches();
        
    } catch (error) {
        console.error('❌ Lỗi:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}

// ============================================
// RESET ĐIỂM
// ============================================
async function resetMatchPoints() {
    const matchId = prompt('📝 Nhập ID trận đấu cần reset điểm:');
    if (!matchId) return;
    
    if (!confirm(`⚠️ RESET ĐIỂM cho trận ${matchId}?`)) return;
    
    try {
        const db = firebase.firestore();
        const user = firebase.auth().currentUser;
        const isAdmin = await checkIsAdmin(user);
        if (!isAdmin) {
            alert('❌ Bạn không có quyền!');
            return;
        }
        
        await db.collection('matches').doc(matchId).update({
            isResultEntered: false,
            pointsCalculated: false,
            calculatedAt: null
        });
        
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

// ============================================
// RESET HỆ THỐNG
// ============================================
async function resetSystem() {
    if (!confirm('⚠️ BẠN CÓ CHẮC MUỐN RESET TOÀN BỘ HỆ THỐNG?')) {
        return;
    }
    
    if (!confirm('⚠️ LẦN CUỐI: Bạn có chắc chắn?')) {
        return;
    }
    
    const password = prompt('🔐 Nhập mật khẩu xác nhận (admin123):');
    if (!password || password.toLowerCase().trim() !== 'admin123') {
        alert('❌ Mật khẩu không đúng! Hủy reset.');
        return;
    }
    
    try {
        const db = firebase.firestore();
        const user = firebase.auth().currentUser;
        const isAdmin = await checkIsAdmin(user);
        if (!isAdmin) {
            alert('❌ Bạn không có quyền!');
            return;
        }
        
        const collections = ['matches', 'predictions', 'match_results', 'user_predictions_history', 'audit_logs'];
        
        for (const col of collections) {
            const snap = await db.collection(col).get();
            const batch = db.batch();
            snap.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        
        await db.collection('users').doc(user.uid).set({
            name: user.displayName || 'Admin',
            email: user.email,
            role: 'admin',
            isAdmin: true,
            isActive: true,
            balance: 0,
            totalPoints: 0,
            correctPredictions: 0,
            totalPredictions: 0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        const sampleMatches = [
            { homeTeam: 'Brazil', awayTeam: 'Argentina', date: '2026-06-25', time: '20:00', handicap: 0.25, group: 'Group A' },
            { homeTeam: 'Germany', awayTeam: 'France', date: '2026-06-26', time: '17:00', handicap: 0.5, group: 'Group B' },
            { homeTeam: 'England', awayTeam: 'Spain', date: '2026-06-27', time: '15:00', handicap: 0, group: 'Group C' }
        ];
        
        for (const match of sampleMatches) {
            await db.collection('matches').add({
                ...match,
                status: 'upcoming',
                homeScore: null,
                awayScore: null,
                isResultEntered: false,
                pointsCalculated: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        alert('✅ Reset hệ thống thành công!');
        location.reload();
        
    } catch (error) {
        console.error('❌ Lỗi reset:', error);
        alert('❌ Lỗi: ' + error.message);
    }
}

// ============================================
// KHỞI TẠO
// ============================================
console.log('🔄 Initializing admin page...');

// Đảm bảo các hàm được định nghĩa toàn cục
window.logout = logout;
window.loadMatches = loadMatches;
window.loadUsers = loadUsers;
window.loadPredictions = loadPredictions;
window.loadLogs = loadLogs;
window.loadDashboard = loadDashboard;
window.showAddMatchForm = showAddMatchForm;
window.saveMatch = saveMatch;
window.editMatch = editMatch;
window.deleteMatch = deleteMatch;
window.showResultForm = showResultForm;
window.submitMatchResult = submitMatchResult;
window.cancelResultForm = cancelResultForm;
window.deleteMatchResult = deleteMatchResult;
window.viewMatchResult = viewMatchResult;
window.manualCalculatePoints = manualCalculatePoints;
window.calculateAllMatches = calculateAllMatches;
window.resetMatchPoints = resetMatchPoints;
window.resetSystem = resetSystem;
window.approveAdmin = approveAdmin;
window.revokeAdmin = revokeAdmin;
window.exportUsers = exportUsers;
window.checkAdmin = checkAdmin;

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM ready, checking admin...');
    setTimeout(checkAdmin, 500);
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('📄 DOM already ready, checking admin...');
    setTimeout(checkAdmin, 500);
}

console.log('✅ admin.js loaded successfully');