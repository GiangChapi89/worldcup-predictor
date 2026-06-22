class StatisticsManager {
    async loadRanking() {
        console.log('📊 Đang tải bảng xếp hạng...');
        try {
            const usersSnapshot = await db.collection('users')
                .orderBy('totalPoints', 'desc')
                .get();
            if (usersSnapshot.empty) {
                document.getElementById('rankingTable').innerHTML = '<p>⚠️ Chưa có người dùng nào.</p>';
                return;
            }
            const ranking = [];
            usersSnapshot.forEach(doc => {
                const data = doc.data();
                ranking.push({
                    id: doc.id,
                    name: data.name || data.email || 'Anonymous',
                    totalPoints: data.totalPoints || 0,
                    correctPredictions: data.correctPredictions || 0,
                    totalPredictions: data.totalPredictions || 0
                });
            });
            this.renderRanking(ranking);
            await this.renderDailyStats();
        } catch (error) {
            console.error('❌ Lỗi tải ranking:', error);
            document.getElementById('rankingTable').innerHTML = `<p style="color:red;">❌ Lỗi: ${error.message}</p>`;
        }
    }

    renderRanking(ranking) {
        const container = document.getElementById('rankingTable');
        if (!container) return;
        if (!ranking.length) {
            container.innerHTML = '<p>⚠️ Chưa có dữ liệu xếp hạng.</p>';
            return;
        }
        let html = `<table>
            <thead><tr><th>🏆 Hạng</th><th>👤 Tên</th><th>⭐ Điểm</th><th>✅ Đúng</th><th>📊 Tổng</th></tr></thead>
            <tbody>`;
        ranking.forEach((user, index) => {
            html += `<tr><td>${index+1}</td><td>${user.name}</td><td>${user.totalPoints}</td><td>${user.correctPredictions}</td><td>${user.totalPredictions}</td></tr>`;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;
    }

    async renderDailyStats() {
        // Tương tự, thêm log và xử lý lỗi
        const container = document.getElementById('dailyStats');
        if (!container) return;
        try {
            const matchesSnapshot = await db.collection('matches').where('status', '==', 'finished').get();
            if (matchesSnapshot.empty) {
                container.innerHTML = '<p>⚠️ Chưa có trận đấu đã kết thúc.</p>';
                return;
            }
            // ... tính toán thống kê theo ngày
            container.innerHTML = '<p>✅ Thống kê theo ngày sẽ hiển thị ở đây.</p>';
        } catch (error) {
            container.innerHTML = `<p style="color:red;">❌ Lỗi: ${error.message}</p>`;
        }
    }
}