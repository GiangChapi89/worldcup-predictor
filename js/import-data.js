// Chạy trong Console của trình duyệt (sau khi đã đăng nhập)
async function importSampleData() {
    const matches = [
        { homeTeam: "Brazil", awayTeam: "Argentina", date: "2026-06-22", time: "20:00", status: "upcoming", homeScore: null, awayScore: null },
        { homeTeam: "Germany", awayTeam: "France", date: "2026-06-23", time: "17:00", status: "upcoming", homeScore: null, awayScore: null },
        { homeTeam: "England", awayTeam: "Spain", date: "2026-06-24", time: "15:00", status: "upcoming", homeScore: null, awayScore: null }
    ];

    const batch = db.batch();
    matches.forEach(match => {
        const ref = db.collection('matches').doc(); // tự tạo ID
        batch.set(ref, match);
    });
    await batch.commit();
    console.log('✅ Đã thêm dữ liệu mẫu!');
}

importSampleData();