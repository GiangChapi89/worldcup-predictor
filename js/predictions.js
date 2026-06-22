class PredictionManager {
    constructor() {
        this.predictions = [];
        this.currentUser = 1; // Tạm thời fix user
    }

    async savePrediction(matchId, homeScore, awayScore) {
        try {
            const prediction = {
                matchId,
                userId: this.currentUser,
                homeScore: parseInt(homeScore),
                awayScore: parseInt(awayScore),
                points: 0
            };

            const response = await fetch('http://localhost:3000/predictions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(prediction)
            });

            if (response.ok) {
                alert('Dự đoán thành công!');
                this.loadPredictions();
            }
        } catch (error) {
            console.error('Lỗi lưu dự đoán:', error);
        }
    }

    async loadPredictions() {
        try {
            const response = await fetch('http://localhost:3000/predictions');
            this.predictions = await response.json();
        } catch (error) {
            console.error('Lỗi tải dự đoán:', error);
        }
    }
}

// Hàm global để gọi từ HTML
function predictMatch(matchId) {
    const homeScore = prompt('Nhập tỷ số đội nhà:');
    const awayScore = prompt('Nhập tỷ số đội khách:');
    
    if (homeScore !== null && awayScore !== null) {
        const predManager = new PredictionManager();
        predManager.savePrediction(matchId, homeScore, awayScore);
    }
}