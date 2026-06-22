class MatchManager {
    constructor() {
        this.matches = [];
        this.apiUrl = 'http://localhost:3000';
    }

    async loadMatches() {
        try {
            const response = await fetch(`${this.apiUrl}/matches`);
            this.matches = await response.json();
            this.renderMatches();
        } catch (error) {
            console.error('Lỗi tải dữ liệu:', error);
        }
    }

    renderMatches() {
        const matchList = document.getElementById('matchList');
        matchList.innerHTML = this.matches.map(match => `
            <div class="match-card">
                <div class="match-info">
                    <span class="team">${match.homeTeam}</span>
                    <span class="vs">vs</span>
                    <span class="team">${match.awayTeam}</span>
                </div>
                <div class="match-details">
                    <span>📅 ${match.date}</span>
                    <span>⏰ ${match.time}</span>
                </div>
                <div class="match-score">
                    ${match.homeScore !== null ? 
                        `${match.homeScore} - ${match.awayScore}` : 
                        'Chưa diễn ra'}
                </div>
                <button onclick="predictMatch(${match.id})" 
                        ${match.status === 'finished' ? 'disabled' : ''}>
                    Dự Đoán
                </button>
            </div>
        `).join('');
    }

    async updateMatchResult(matchId, homeScore, awayScore) {
        try {
            const response = await fetch(`${this.apiUrl}/matches/${matchId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    homeScore, 
                    awayScore, 
                    status: 'finished' 
                })
            });
            
            if (response.ok) {
                await this.calculatePoints(matchId);
                this.loadMatches();
                this.updateStatistics();
            }
        } catch (error) {
            console.error('Lỗi cập nhật kết quả:', error);
        }
    }

    async calculatePoints(matchId) {
        const match = this.matches.find(m => m.id === matchId);
        if (!match) return;

        const predictions = await this.getPredictions(matchId);
        predictions.forEach(async pred => {
            if (pred.homeScore === match.homeScore && 
                pred.awayScore === match.awayScore) {
                await this.updateUserPoints(pred.userId, 1);
            }
        });
    }
}