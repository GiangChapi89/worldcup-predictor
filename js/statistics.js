// js/statistics.js
class StatisticsManager {
    async loadRanking() {
        try {
            const usersSnapshot = await db.collection('users')
                .orderBy('totalPoints', 'desc')
                .get();

            const ranking = [];
            usersSnapshot.forEach(doc => {
                const data = doc.data();
                ranking.push({
                    id: doc.id,
                    name: data.name || data.email,
                    totalPoints: data.totalPoints || 0,
                    correctPredictions: data.correctPredictions || 0,
                    totalPredictions: data.totalPredictions || 0
                });
            });

            this.renderRanking(ranking);
            await this.renderDailyStats();
        } catch (error) {
            console.error('Lỗi tải thống kê:', error);
        }
    }

    renderRanking(ranking) {
        const rankingTable = document.getElementById('rankingTable');
        if (!ranking.length) {
            rankingTable.innerHTML = '<p>Chưa có dữ liệu thống kê</p>';
            return;
        }

        rankingTable.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>🏆 Hạng</th>
                        <th>👤 Tên</th>
                        <th>⭐ Điểm</th>
                        <th>✅ Đúng</th>
                        <th>📊 Tổng</th>
                        <th>🎯 Tỷ lệ</th>
                    </tr>
                </thead>
                <tbody>
                    ${ranking.map((user, index) => {
                        const accuracy = user.totalPredictions > 0 ? 
                            Math.round((user.correctPredictions / user.totalPredictions) * 100) : 0;
                        return `
                            <tr ${index === 0 ? 'class="winner"' : ''}>
                                <td>${index + 1}</td>
                                <td>${user.name}</td>
                                <td>⭐ ${user.totalPoints}</td>
                                <td>${user.correctPredictions}</td>
                                <td>${user.totalPredictions}</td>
                                <td>${accuracy}%</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    async renderDailyStats() {
        const dailyStats = document.getElementById('dailyStats');
        
        try {
            const matchesSnapshot = await db.collection('matches')
                .orderBy('date')
                .get();
            
            const dailyData = {};
            matchesSnapshot.forEach(doc => {
                const match = doc.data();
                if (match.status === 'finished') {
                    if (!dailyData[match.date]) {
                        dailyData[match.date] = {
                            totalPredictions: 0,
                            correctPredictions: 0
                        };
                    }
                }
            });

            // Lấy tất cả dự đoán để thống kê
            const predictionsSnapshot = await db.collection('predictions').get();
            predictionsSnapshot.forEach(doc => {
                const pred = doc.data();
                const matchRef = db.collection('matches').doc(pred.matchId);
                // Cần xử lý match để lấy ngày
            });

            let html = '<h3>📊 Thống Kê Theo Ngày</h3><div class="daily-stats">';
            
            for (const [date, data] of Object.entries(dailyData)) {
                const accuracy = data.totalPredictions > 0 ? 
                    Math.round((data.correctPredictions / data.totalPredictions) * 100) : 0;
                
                html += `
                    <div class="day-stat">
                        <h4>📅 ${date}</h4>
                        <p>📝 Tổng dự đoán: ${data.totalPredictions}</p>
                        <p>✅ Dự đoán đúng: ${data.correctPredictions}</p>
                        <p>🎯 Tỷ lệ: ${accuracy}%</p>
                        <div class="progress-bar">
                            <div class="progress" style="width: ${accuracy}%"></div>
                        </div>
                    </div>
                `;
            }
            
            html += '</div>';
            dailyStats.innerHTML = html;
        } catch (error) {
            console.error('Lỗi tải thống kê ngày:', error);
        }
    }
}