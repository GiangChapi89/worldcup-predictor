// js/filter.js - CẬP NHẬT VỚI TÌM KIẾM ĐỘI

let allMatches = [];
let allResults = [];
let allTeams = [];

// ============================================
// KHỞI TẠO
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Initializing filters...');
    initSubTabs();
    loadTeamsForFilters();
    setupTeamSearch();
});

// ============================================
// SETUP TÌM KIẾM ĐỘI
// ============================================
function setupTeamSearch() {
    // Tìm kiếm đội trong lịch thi đấu
    const scheduleTeamFilter = document.getElementById('scheduleTeamFilter');
    if (scheduleTeamFilter) {
        scheduleTeamFilter.addEventListener('change', function() {
            applyScheduleFilters();
        });
    }
    
    // Tìm kiếm đội trong kết quả
    const resultTeamFilter = document.getElementById('resultTeamFilter');
    if (resultTeamFilter) {
        resultTeamFilter.addEventListener('change', function() {
            applyResultFilters();
        });
    }
}

// ============================================
// SUB TABS
// ============================================
function initSubTabs() {
    const subTabs = document.querySelectorAll('.sub-tab-btn');
    
    subTabs.forEach(btn => {
        btn.addEventListener('click', function() {
            const subTabId = this.dataset.subtab;
            
            subTabs.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.subtab-content').forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            const content = document.getElementById('subtab-' + subTabId);
            if (content) {
                content.classList.add('active');
            }
            
            // Ẩn tất cả bộ lọc
            document.querySelectorAll('.filter-section').forEach(f => {
                f.style.display = 'none';
            });
            
            switch(subTabId) {
                case 'schedule':
                    const scheduleFilter = document.getElementById('scheduleFilterSection');
                    if (scheduleFilter) scheduleFilter.style.display = 'flex';
                    loadSchedule();
                    break;
                case 'results':
                    const resultFilter = document.getElementById('resultFilterSection');
                    if (resultFilter) resultFilter.style.display = 'flex';
                    loadResults();
                    break;
                case 'predictions':
                    loadMyPredictions();
                    break;
            }
        });
    });
    
    setTimeout(() => {
        const scheduleFilter = document.getElementById('scheduleFilterSection');
        if (scheduleFilter) scheduleFilter.style.display = 'flex';
        const resultFilter = document.getElementById('resultFilterSection');
        if (resultFilter) resultFilter.style.display = 'none';
        loadSchedule();
    }, 500);
}

// ============================================
// LOAD TEAMS CHO FILTER
// ============================================
async function loadTeamsForFilters() {
    try {
        // Luôn bắt đầu với danh sách đội từ GROUPS_DATA
        let allTeamsSet = new Set();
        if (typeof GROUPS_DATA !== 'undefined') {
            Object.values(GROUPS_DATA).forEach(group => {
                group.teams.forEach(team => {
                    allTeamsSet.add(team);
                });
            });
        }

        // (Tùy chọn) Bổ sung thêm các đội từ Firestore nếu có
        const db = firebase.firestore();
        const snapshot = await db.collection('matches').get();
        snapshot.forEach(doc => {
            const match = doc.data();
            if (match.homeTeam) allTeamsSet.add(match.homeTeam);
            if (match.awayTeam) allTeamsSet.add(match.awayTeam);
        });

        // Cập nhật mảng allTeams và populate dropdown
        allTeams = Array.from(allTeamsSet).sort();
        populateTeamDropdown('scheduleTeamFilter', allTeams);
        populateTeamDropdown('resultTeamFilter', allTeams);

        console.log('✅ Teams loaded:', allTeams.length);
    } catch (error) {
        console.error('❌ Lỗi load teams:', error);
        // Fallback an toàn: chỉ dùng GROUPS_DATA
        if (typeof GROUPS_DATA !== 'undefined') {
            const teams = new Set();
            Object.values(GROUPS_DATA).forEach(group => {
                group.teams.forEach(team => {
                    teams.add(team);
                });
            });
            allTeams = Array.from(teams).sort();
            populateTeamDropdown('scheduleTeamFilter', allTeams);
            populateTeamDropdown('resultTeamFilter', allTeams);
        }
    }
}

function populateTeamDropdown(selectId, teams) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '';
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = '🏷️ Tất cả đội';
    select.appendChild(allOption);
    
    // Nhóm các đội theo bảng
    if (typeof TEAM_TO_GROUP !== 'undefined') {
        // Nhóm theo bảng
        const groupedTeams = {};
        teams.forEach(team => {
            const group = TEAM_TO_GROUP[team] || 'Khác';
            if (!groupedTeams[group]) {
                groupedTeams[group] = [];
            }
            groupedTeams[group].push(team);
        });
        
        // Sắp xếp các bảng
        const sortedGroups = Object.keys(groupedTeams).sort();
        sortedGroups.forEach(group => {
            // Thêm option group header
            const optGroup = document.createElement('optgroup');
            optGroup.label = '🏆 ' + group;
            
            groupedTeams[group].sort().forEach(team => {
                const option = document.createElement('option');
                option.value = team;
                option.textContent = team;
                optGroup.appendChild(option);
            });
            select.appendChild(optGroup);
        });
    } else {
        // Fallback: không nhóm
        teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team;
            option.textContent = team;
            select.appendChild(option);
        });
    }
}

// ============================================
// LỊCH THI ĐẤU
// ============================================
async function loadSchedule() {
    const container = document.getElementById('scheduleList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">⏳ Đang tải...</div>';
    
    try {
        const db = firebase.firestore();
        // Sắp xếp từ mới nhất đến cũ nhất
        const snapshot = await db.collection('matches')
            .orderBy('date', 'desc')
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = '<div class="no-results"><div class="icon">📭</div><p>Chưa có trận đấu nào</p></div>';
            return;
        }
        
        allMatches = [];
        snapshot.forEach(doc => {
            allMatches.push({ id: doc.id, ...doc.data() });
        });
        
        renderSchedule(allMatches);
        
    } catch (error) {
        console.error('❌ Lỗi load schedule:', error);
        container.innerHTML = `<p style="color:red;">❌ Lỗi: ${error.message}</p>`;
    }
}

// CẬP NHẬT HÀM renderSchedule - HIỂN THỊ THEO TRẠNG THÁI
// ============================================
function renderSchedule(matches) {
    const container = document.getElementById('scheduleList');
    if (!container) return;
    
    if (!matches || matches.length === 0) {
        container.innerHTML = '<div class="no-results"><div class="icon">🔍</div><p>Không tìm thấy trận đấu nào</p></div>';
        return;
    }
    
    // Nhóm theo ngày (giữ nguyên thứ tự đã sắp xếp)
    const grouped = {};
    matches.forEach(match => {
        const date = match.date || 'Chưa có ngày';
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(match);
    });
    
    let html = '';
    // Sắp xếp ngày từ mới nhất đến cũ nhất
    const sortedDates = Object.keys(grouped).sort((a, b) => {
        if (a === 'Chưa có ngày') return 1;
        if (b === 'Chưa có ngày') return -1;
        return b.localeCompare(a);
    });
    
    sortedDates.forEach(date => {
        // Sắp xếp trận trong ngày theo giờ
        const sortedMatches = grouped[date].sort((a, b) => {
            if (!a.time) return 1;
            if (!b.time) return -1;
            return b.time.localeCompare(a.time);
        });
        
        // Đếm số trận đã kết thúc và sắp diễn ra
        const finished = sortedMatches.filter(m => m.status === 'finished').length;
        const upcoming = sortedMatches.filter(m => m.status === 'upcoming' || !m.status).length;
        
        html += `<div class="group-section">`;
        html += `
            <div class="group-header">
                <span class="group-title">📅 ${date}</span>
                <span class="group-count">
                    ${sortedMatches.length} trận 
                    ${finished > 0 ? `| ✅ ${finished} đã kết thúc` : ''}
                    ${upcoming > 0 ? `| ⏳ ${upcoming} sắp diễn ra` : ''}
                </span>
            </div>
        `;
        html += `<div class="match-grid">`;
        
        sortedMatches.forEach(match => {
            const isFinished = match.status === 'finished';
            const isLoggedIn = !!window.currentUserId;
            const handicapDisplay = match.handicap > 0 ? `⚡ Chấp ${match.handicap}` : '⚡ Đồng banh';
            
            // Tìm bảng của đội
            let groupDisplay = match.group || '';
            if (!groupDisplay && typeof TEAM_TO_GROUP !== 'undefined') {
                const homeGroup = TEAM_TO_GROUP[match.homeTeam];
                const awayGroup = TEAM_TO_GROUP[match.awayTeam];
                if (homeGroup && homeGroup === awayGroup) {
                    groupDisplay = homeGroup;
                } else if (homeGroup) {
                    groupDisplay = homeGroup;
                } else if (awayGroup) {
                    groupDisplay = awayGroup;
                }
            }
            
            html += `
                <div class="match-card ${isFinished ? 'finished' : 'upcoming'}">
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
                            ${groupDisplay ? `<span class="group-badge">${groupDisplay}</span>` : ''}
                        </div>
                    </div>
                    <div class="match-details">
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
        
        html += `</div></div>`;
    });
    
    container.innerHTML = html;
}

// ============================================
// KẾT QUẢ
// ============================================
// js/filter.js - SỬA HÀM loadResults

async function loadResults() {
    const container = document.getElementById('resultList');
    if (!container) return;

    container.innerHTML = '<div class="loading">⏳ Đang tải...</div>';

    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('matches')
            .where('status', '==', 'finished')
            .orderBy('date', 'desc')
            .get();

        if (snapshot.empty) {
            container.innerHTML = `
                <div class="no-results">
                    <div class="icon">📭</div>
                    <p>Chưa có kết quả trận đấu nào</p>
                </div>
            `;
            return;
        }

        allResults = [];
        snapshot.forEach(doc => {
            allResults.push({ id: doc.id, ...doc.data() });
        });

        renderResults(allResults);

    } catch (error) {
        console.error('❌ Lỗi load results:', error);
        
        // Kiểm tra lỗi index
        if (error.message && error.message.includes('index')) {
            // Lấy link từ error message
            const indexLink = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/)?.[0];
            
            container.innerHTML = `
                <div class="no-results" style="padding: 30px; text-align: center;">
                    <div class="icon" style="font-size: 48px; margin-bottom: 15px;">🔧</div>
                    <h3 style="color: #2d3436; margin-bottom: 10px;">Đang cấu hình cơ sở dữ liệu</h3>
                    <p style="color: #666; margin-bottom: 15px;">
                        Hệ thống đang tạo chỉ mục để hiển thị kết quả. Vui lòng thử lại sau vài phút.
                    </p>
                    <a href="${indexLink || '#'}" 
                       target="_blank" 
                       style="display: inline-block; padding: 10px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
                        📊 Tạo chỉ mục
                    </a>
                    <p style="color: #999; font-size: 12px; margin-top: 10px;">
                        Nhấn vào nút trên để tạo chỉ mục, sau đó tải lại trang
                    </p>
                </div>
            `;
        } else {
            container.innerHTML = `<p style="color:red; text-align:center; padding: 20px;">❌ Lỗi: ${error.message}</p>`;
        }
    }
}

function renderResults(matches) {
    const container = document.getElementById('resultList');
    if (!container) return;
    
    if (!matches || matches.length === 0) {
        container.innerHTML = '<div class="no-results"><div class="icon">🔍</div><p>Không tìm thấy kết quả nào</p></div>';
        return;
    }
    
    let html = '';
    matches.forEach(match => {
        const isWin = match.homeScore > match.awayScore;
        const isDraw = match.homeScore === match.awayScore;
        const scoreClass = isWin ? 'win' : (isDraw ? 'draw' : 'lose');
        
        html += `
            <div class="result-item">
                <div class="match-info">
                    <div class="match-teams">${match.homeTeam} vs ${match.awayTeam}</div>
                    <div class="match-meta">
                        📅 ${match.date || 'N/A'} | ⏰ ${match.time || 'N/A'} | 🏆 ${match.group || 'N/A'}
                    </div>
                </div>
                <div class="match-score ${scoreClass}">
                    ${match.homeScore} - ${match.awayScore}
                    ${isWin ? '🏆' : (isDraw ? '🤝' : '❌')}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// DỰ ĐOÁN CỦA TÔI
// ============================================
async function loadMyPredictions() {
    const container = document.getElementById('myPredictionsList');
    if (!container) return;
    
    const user = firebase.auth().currentUser;
    if (!user) {
        container.innerHTML = `
            <div class="no-results">
                <div class="icon">🔐</div>
                <p>Vui lòng đăng nhập để xem dự đoán của bạn</p>
                <button onclick="document.getElementById('loginBtn').click()" style="margin-top:15px;padding:10px 30px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">
                    🔑 Đăng Nhập
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '<div class="loading">⏳ Đang tải...</div>';
    
    try {
        const db = firebase.firestore();
        
        // Lấy dữ liệu KHÔNG orderBy để tránh lỗi index
        const snapshot = await db.collection('user_predictions_history')
            .where('userId', '==', user.uid)
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div class="no-results">
                    <div class="icon">📝</div>
                    <p>Bạn chưa có dự đoán nào</p>
                    <p style="font-size:0.9rem;color:#999;margin-top:5px;">Hãy dự đoán các trận đấu để tích lũy điểm!</p>
                </div>
            `;
            return;
        }
        
        // Sắp xếp trong JavaScript
        const docs = [];
        snapshot.forEach(doc => docs.push({ id: doc.id, ...doc.data() }));
        docs.sort((a, b) => {
            const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
            const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
            return timeB - timeA;
        });
        
        let html = '';
        let totalPoints = 0;
        let correctCount = 0;
        let totalPredictions = docs.length;
        let hasHistory = false;
        
        docs.forEach(pred => {
            totalPoints += pred.points || 0;
            if (pred.isCorrect) correctCount++;
            if (pred.isProcessed) hasHistory = true;
            
            const isCorrect = pred.isCorrect || false;
            const isProcessed = pred.isProcessed || false;
            const matchDate = pred.matchDate || 'N/A';
            const homeTeam = pred.homeTeam || 'N/A';
            const awayTeam = pred.awayTeam || 'N/A';
            
            let statusText = '';
            let statusColor = '';
            if (isProcessed) {
                if (isCorrect) {
                    statusText = '✅ Đúng';
                    statusColor = '#28a745';
                } else {
                    statusText = '❌ Sai';
                    statusColor = '#dc3545';
                }
            } else {
                statusText = '⏳ Chờ xử lý';
                statusColor = '#ffc107';
            }
            
            const cardColor = isProcessed ? 
                (isCorrect ? '#d4edda' : '#f8d7da') : 
                '#fff3cd';
            const borderColor = isProcessed ? 
                (isCorrect ? '#28a745' : '#dc3545') : 
                '#ffc107';
            
            html += `
                <div class="result-item" style="border-left-color: ${borderColor}; background: ${cardColor};">
                    <div class="match-info">
                        <div class="match-teams">${homeTeam} vs ${awayTeam}</div>
                        <div class="match-meta">
                            📅 ${matchDate} | ⚡ Kèo: ${pred.userHandicap || 0}
                            <span style="margin-left: 10px; color: ${statusColor}; font-weight: 600;">${statusText}</span>
                        </div>
                        <div class="match-prediction">
                            <strong>Dự đoán:</strong> ${pred.predictedHomeScore} - ${pred.predictedAwayScore}
                            ${isProcessed ? ` | <strong>Kết quả:</strong> ${pred.actualHomeScore} - ${pred.actualAwayScore}` : ''}
                            ${isProcessed ? `<span class="${isCorrect ? 'correct' : 'wrong'}" style="margin-left:10px;">${isCorrect ? '✅ Đúng' : '❌ Sai'}</span>` : ''}
                        </div>
                    </div>
                    <div class="match-score ${isCorrect ? 'win' : (isProcessed ? 'lose' : '')}">
                        ${isProcessed ? (isCorrect ? '+1' : '0') : '⏳'} điểm
                    </div>
                </div>
            `;
        });
        
        if (!hasHistory) {
            html = `
                <div style="background: #e8f4fd; padding: 15px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #17a2b8;">
                    <p style="margin: 0; color: #0c5460;">
                        ℹ️ <strong>Lưu ý:</strong> Các dự đoán của bạn sẽ được tính điểm sau khi trận đấu kết thúc và admin nhập kết quả.
                    </p>
                </div>
                ${html}
            `;
        }
        
        const accuracy = totalPredictions > 0 ? Math.round((correctCount / totalPredictions) * 100) : 0;
        
        html = `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:15px;margin-bottom:20px;">
                <div style="background:white;padding:15px;border-radius:10px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                    <div style="font-size:24px;font-weight:bold;color:#667eea;">${totalPredictions}</div>
                    <div style="color:#888;font-size:14px;">Tổng dự đoán</div>
                </div>
                <div style="background:white;padding:15px;border-radius:10px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                    <div style="font-size:24px;font-weight:bold;color:#28a745;">${correctCount}</div>
                    <div style="color:#888;font-size:14px;">Dự đoán đúng</div>
                </div>
                <div style="background:white;padding:15px;border-radius:10px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                    <div style="font-size:24px;font-weight:bold;color:#fdcb6e;">${accuracy}%</div>
                    <div style="color:#888;font-size:14px;">Tỷ lệ đúng</div>
                </div>
                <div style="background:white;padding:15px;border-radius:10px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                    <div style="font-size:24px;font-weight:bold;color:#764ba2;">${totalPoints}</div>
                    <div style="color:#888;font-size:14px;">Tổng điểm</div>
                </div>
            </div>
            ${html}
        `;
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Lỗi load predictions:', error);
        container.innerHTML = `<p style="color:red; text-align:center; padding: 20px;">❌ Lỗi: ${error.message}</p>`;
    }
}

// ============================================
// CẬP NHẬT HÀM applyScheduleFilters - THÊM LỌC TRẠNG THÁI
// ============================================
function applyScheduleFilters() {
    const dateFilter = document.getElementById('scheduleDateFilter').value;
    const groupFilter = document.getElementById('scheduleGroupFilter').value;
    const teamFilter = document.getElementById('scheduleTeamFilter').value;
    const statusFilter = document.getElementById('scheduleStatusFilter').value;
    
    console.log('🔍 Áp dụng lọc:', { dateFilter, groupFilter, teamFilter, statusFilter });
    
    let filtered = [...allMatches];
    
    if (dateFilter) {
        filtered = filtered.filter(m => m.date === dateFilter);
    }
    
    if (groupFilter !== 'all') {
        filtered = filtered.filter(m => m.group === groupFilter);
    }
    
    if (teamFilter !== 'all') {
        filtered = filtered.filter(m => m.homeTeam === teamFilter || m.awayTeam === teamFilter);
    }
    
    if (statusFilter !== 'all') {
        filtered = filtered.filter(m => m.status === statusFilter);
    }
    
    renderSchedule(filtered);
}

// HÀM RESET LỌC
// ============================================
function resetScheduleFilters() {
    document.getElementById('scheduleDateFilter').value = '';
    document.getElementById('scheduleGroupFilter').value = 'all';
    document.getElementById('scheduleTeamFilter').value = 'all';
    document.getElementById('scheduleStatusFilter').value = 'all';
    renderSchedule(allMatches);
}

async function applyResultFilters() {
    const dateFilter = document.getElementById('resultDateFilter').value;
    const groupFilter = document.getElementById('resultGroupFilter').value;
    const teamFilter = document.getElementById('resultTeamFilter').value;
    
    console.log('🔍 Áp dụng lọc kết quả:', { dateFilter, groupFilter, teamFilter });
    
    if (allResults.length === 0) {
        const db = firebase.firestore();
        const snapshot = await db.collection('matches')
            .where('status', '==', 'finished')
            .orderBy('date', 'desc')
            .get();
        allResults = [];
        snapshot.forEach(doc => allResults.push({ id: doc.id, ...doc.data() }));
    }
    
    let filtered = [...allResults];
    
    if (dateFilter) {
        filtered = filtered.filter(m => m.date === dateFilter);
    }
    
    if (groupFilter !== 'all') {
        filtered = filtered.filter(m => m.group === groupFilter);
    }
    
    if (teamFilter !== 'all') {
        filtered = filtered.filter(m => m.homeTeam === teamFilter || m.awayTeam === teamFilter);
    }
    
    renderResults(filtered);
}

function resetResultFilters() {
    document.getElementById('resultDateFilter').value = '';
    document.getElementById('resultGroupFilter').value = 'all';
    document.getElementById('resultTeamFilter').value = 'all';
    renderResults(allResults);
}

// js/filter.js - THÊM HÀM XỬ LÝ LỖI INDEX

// ============================================
// XỬ LÝ LỖI INDEX CHUNG
// ============================================
function handleIndexError(error, container, title = 'Đang cấu hình cơ sở dữ liệu') {
    console.error('❌ Lỗi:', error);
    
    if (error.message && error.message.includes('index')) {
        const indexLink = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/)?.[0];
        
        container.innerHTML = `
            <div class="no-results" style="padding: 30px; text-align: center;">
                <div class="icon" style="font-size: 48px; margin-bottom: 15px;">🔧</div>
                <h3 style="color: #2d3436; margin-bottom: 10px;">${title}</h3>
                <p style="color: #666; margin-bottom: 15px;">
                    Hệ thống đang tạo chỉ mục để hiển thị dữ liệu. Vui lòng thử lại sau vài phút.
                </p>
                <a href="${indexLink || '#'}" 
                   target="_blank" 
                   style="display: inline-block; padding: 10px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; text-decoration: none; font-weight: 600;">
                    📊 Tạo chỉ mục
                </a>
                <p style="color: #999; font-size: 12px; margin-top: 10px;">
                    Nhấn vào nút trên để tạo chỉ mục, sau đó tải lại trang
                </p>
            </div>
        `;
        return true;
    }
    return false;
}

// Sử dụng trong loadResults và loadMyPredictions
// Ví dụ: trong catch của loadResults
// if (handleIndexError(error, container, 'Đang cấu hình để hiển thị kết quả')) return;

// Export các hàm ra global
window.loadSchedule = loadSchedule;
window.loadResults = loadResults;
window.loadMyPredictions = loadMyPredictions;
window.applyScheduleFilters = applyScheduleFilters;
window.resetScheduleFilters = resetScheduleFilters;
window.applyResultFilters = applyResultFilters;
window.resetResultFilters = resetResultFilters;

console.log('✅ filter.js loaded');