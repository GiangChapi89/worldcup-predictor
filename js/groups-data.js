// js/groups-data.js
const GROUPS_DATA = {
    'Group A': {
        teams: ['Mexico', 'South Africa', 'South Korea', 'Czechia']
    },
    'Group B': {
        teams: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland']
    },
    'Group C': {
        teams: ['Brazil', 'Morocco', 'Haiti', 'Scotland']
    },
    'Group D': {
        teams: ['United States', 'Paraguay', 'Australia', 'Turkey']
    },
    'Group E': {
        teams: ['Germany', 'Curacao', 'Ivory Coast', 'Ecuador']
    },
    'Group F': {
        teams: ['Netherlands', 'Japan', 'Sweden', 'Tunisia']
    },
    'Group G': {
        teams: ['Belgium', 'Egypt', 'Iran', 'New Zealand']
    },
    'Group H': {
        teams: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay']
    },
    'Group I': {
        teams: ['France', 'Senegal', 'Iraq', 'Norway']
    },
    'Group J': {
        teams: ['Argentina', 'Algeria', 'Austria', 'Jordan']
    },
    'Group K': {
        teams: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia']
    },
    'Group L': {
        teams: ['England', 'Croatia', 'Ghana', 'Panama']
    }
};

// Tạo danh sách tất cả đội bóng
const ALL_TEAMS = [];
Object.values(GROUPS_DATA).forEach(group => {
    group.teams.forEach(team => {
        if (!ALL_TEAMS.includes(team)) {
            ALL_TEAMS.push(team);
        }
    });
});
ALL_TEAMS.sort();

console.log('✅ Groups data loaded:', Object.keys(GROUPS_DATA).length, 'groups');
console.log('✅ Teams loaded:', ALL_TEAMS.length, 'teams');