class StatisticsManager {
    async loadRanking() {
        try {
            const response = await fetch('http://localhost:3000/users');
            const users = await response.json();
            const predictions = await fetch('http://localhost:3000/predictions')
                .then(res => res.json());

            const ranking = users.map(user => {
                const userPredictions = predictions.filter(p => p.userId === user.id);
                const totalPoints = userPredictions.reduce((sum, p) => sum + p.points, 0);
                const correctPredictions = userPredictions.filter(p => p.points > 0).length;
                
                return {
                    ...user,
                    totalPoints,
                    correctPredictions,
                    totalPredictions: userPredictions.length
                };
            }).sort((a, b) => b.totalPoints - a.totalPoints);

            this.renderRanking(ranking);
            this.renderDailyStats(ranking, predictions);
        } catch (error) {
            console.error('Lỗi tải thống kê:', error);
        }
    }

    renderRanking(ranking) {
        const rankingTable = document.getElementById('rankingTable');
        rankingTable.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Hạng</th>
                        <th>Tên</th>
                        <th>Điểm</th>
                        <th>Dự đoán đúng</th>
                        <th>Tổng dự đoán</th>
                    </tr>
                </thead>
                <tbody>
                    ${ranking.map((user, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${user.name}</td>
                            <td>⭐ ${user.totalPoints}</td>
                            <td>${user.correctPredictions}</td>
                            <td>${user.totalPredictions}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    async renderDailyStats(ranking, predictions) {
        const dailyStats = document.getElementById('dailyStats');
        // Group predictions by date
        const matches = await fetch('http://localhost:3000/matches')
            .then(res => res.json());

        const dailyData = {};
        matches.forEach(match => {
            if (!dailyData[match.date]) {
                dailyData[match.date] = { predictions: [] };
            }
            const matchPredictions = predictions.filter(p => p.matchId === match.id);
            dailyData[match.date].predictions.push(...matchPredictions);
        });

        let html = '<h3>Thống Kê Theo Ngày</h3><div class="daily-stats">';
        for (const [date, data] of Object.entries(dailyData)) {
            const totalPredictions = data.predictions.length;
            const correctPredictions = data.predictions.filter(p => p.points > 0).length;
            
            html += `
                <div class="day-stat">
                    <h4>📅 ${date}</h4>
                    <p>Tổng dự đoán: ${totalPredictions}</p>
                    <p>Dự đoán đúng: ${correctPredictions}</p>
                    <p>Tỷ lệ: ${totalPredictions > 0 ? 
                        Math.round((correctPredictions/totalPredictions)*100) : 0}%</p>
                </div>
            `;
        }
        html += '</div>';
        dailyStats.innerHTML = html;
    }
}