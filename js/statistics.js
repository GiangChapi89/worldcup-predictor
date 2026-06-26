// js/statistics.js - CẬP NHẬT HÀM renderDailyStats

class StatisticsManager {
    async loadRanking() {
        console.log('📊 Đang tải bảng xếp hạng...');
        try {
            const usersSnapshot = await db.collection('users')
                .orderBy('totalPoints', 'desc')
                .get();

            const ranking = [];
            usersSnapshot.forEach(doc => {
                const data = doc.data();
                ranking.push({
                    id: doc.id,
                    name: data.nickname || data.name || data.email || 'Anonymous',
                    totalPoints: data.totalPoints || 0,
                    correctPredictions: data.correctPredictions || 0,
                    totalPredictions: data.totalPredictions || 0,
                    balance: data.balance || 0
                });
            });

            this.renderRanking(ranking);
            await this.renderDailyStats();
        } catch (error) {
            console.error('❌ Lỗi tải bảng xếp hạng:', error);
            document.getElementById('rankingTable').innerHTML = 
                `<p style="color:red;">❌ Lỗi tải dữ liệu: ${error.message}</p>`;
        }
    }

    renderRanking(ranking) {
        const container = document.getElementById('rankingTable');
        if (!container) return;

        if (!ranking.length) {
            container.innerHTML = '<p style="text-align:center;padding:20px;color:#888;">📭 Chưa có người dùng nào</p>';
            return;
        }

        let html = `
            <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr>
                            <th>🏆 Hạng</th>
                            <th>👤 Tên</th>
                            <th>⭐ Điểm</th>
                            <th>✅ Đúng</th>
                            <th>📊 Tổng</th>
                            <th>🎯 Tỷ lệ</th>
                            <th>💰 Số dư</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        ranking.forEach((user, index) => {
            const accuracy = user.totalPredictions > 0 ? 
                Math.round((user.correctPredictions / user.totalPredictions) * 100) : 0;
            const isTop3 = index < 3;
            const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : ''));
            
            html += `
                <tr class="${isTop3 ? 'winner' : ''}" style="${isTop3 ? `border-left: 4px solid ${index === 0 ? '#ffd700' : (index === 1 ? '#c0c0c0' : '#cd7f32')};` : ''}">
                    <td style="font-weight:${isTop3 ? 'bold' : 'normal'};color:${isTop3 ? '#2d3436' : '#666'};">
                        ${medal} ${index + 1}
                    </td>
                    <td style="font-weight:${isTop3 ? 'bold' : 'normal'};">${user.name}</td>
                    <td style="font-weight:bold;color:#667eea;">${user.totalPoints}</td>
                    <td>${user.correctPredictions}</td>
                    <td>${user.totalPredictions}</td>
                    <td>${accuracy}%</td>
                    <td style="font-weight:bold;color:#00b894;">${user.balance}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    async renderDailyStats() {
        const container = document.getElementById('dailyStats');
        if (!container) return;

        try {
            const db = firebase.firestore();
            
            // Lấy tất cả trận đã kết thúc, sắp xếp theo ngày giảm dần (mới nhất trước)
            const matchesSnapshot = await db.collection('matches')
                .where('status', '==', 'finished')
                .orderBy('date', 'desc')
                .get();

            if (matchesSnapshot.empty) {
                container.innerHTML = `
                    <div style="text-align:center;padding:20px;color:#888;">
                        <p>📭 Chưa có trận đấu đã kết thúc</p>
                    </div>
                `;
                return;
            }

            const dailyData = {};
            const predictionsSnap = await db.collection('predictions').get();

            // Thu thập dữ liệu theo ngày
            for (const matchDoc of matchesSnapshot.docs) {
                const match = matchDoc.data();
                const date = match.date || 'Chưa có ngày';
                
                if (!dailyData[date]) {
                    dailyData[date] = {
                        totalPredictions: 0,
                        correctPredictions: 0,
                        totalPoints: 0,
                        matchCount: 0
                    };
                }
                
                // Đếm số trận trong ngày
                dailyData[date].matchCount++;

                // Lấy dự đoán cho trận này
                const matchPredictions = predictionsSnap.docs.filter(doc => {
                    return doc.data().matchId === matchDoc.id;
                });

                matchPredictions.forEach(doc => {
                    const pred = doc.data();
                    dailyData[date].totalPredictions++;
                    if (pred.isCorrect) {
                        dailyData[date].correctPredictions++;
                        dailyData[date].totalPoints += (pred.points || 0);
                    }
                });
            }

            // Lấy danh sách các ngày và sắp xếp từ mới nhất đến cũ nhất
            const sortedDates = Object.keys(dailyData).sort((a, b) => {
                if (a === 'Chưa có ngày') return 1;
                if (b === 'Chưa có ngày') return -1;
                return b.localeCompare(a);
            });

            let html = '<h3>📊 Thống Kê Theo Ngày</h3><div class="daily-stats">';
            
            for (const date of sortedDates) {
                const data = dailyData[date];
                const accuracy = data.totalPredictions > 0 ? 
                    Math.round((data.correctPredictions / data.totalPredictions) * 100) : 0;
                
                html += `
                    <div class="day-stat">
                        <h4>📅 ${date}</h4>
                        <p>⚽ Số trận: ${data.matchCount}</p>
                        <p>📝 Tổng dự đoán: ${data.totalPredictions}</p>
                        <p>✅ Dự đoán đúng: ${data.correctPredictions}</p>
                        <p>💰 Tổng điểm: ${data.totalPoints}</p>
                        <p>🎯 Tỷ lệ đúng: ${accuracy}%</p>
                        <div class="progress-bar">
                            <div class="progress" style="width: ${accuracy}%"></div>
                        </div>
                    </div>
                `;
            }
            
            html += '</div>';
            container.innerHTML = html;

        } catch (error) {
            console.error('❌ Lỗi tải thống kê ngày:', error);
            container.innerHTML = `<p style="color:red;">❌ Lỗi: ${error.message}</p>`;
        }
    }
}