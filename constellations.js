// ============================================
// Constellation Data - 星座配置
// 12 Zodiac + Famous Constellations
// ============================================

// === 12 黄道星座 + 著名星座 (共17个) ===
export const CONSTELLATIONS = {
    // ===== 黄道十二星座 =====
    aries: {
        name: 'Aries', nameCN: '白羊座', symbol: '♈', color: 0xFF6347, date: '3/21-4/19',
        stars: [
            { x: 0, y: 0, z: 0, size: 1.4 }, { x: 0.5, y: 0.3, z: 0.1, size: 1.2 },
            { x: 1.0, y: 0.2, z: 0, size: 1.3 }, { x: 1.3, y: -0.1, z: 0.1, size: 1.0 },
        ],
        lines: [[0, 1], [1, 2], [2, 3]]
    },
    taurus: {
        name: 'Taurus', nameCN: '金牛座', symbol: '♉', color: 0xCD853F, date: '4/20-5/20',
        stars: [
            { x: 0, y: 0, z: 0, size: 1.6 }, { x: -0.3, y: 0.4, z: 0.1, size: 1.1 },
            { x: -0.6, y: 0.7, z: 0, size: 1.0 }, { x: 0.4, y: 0.3, z: 0.1, size: 1.2 },
            { x: 0.7, y: 0.6, z: 0, size: 1.1 },
        ],
        lines: [[0, 1], [1, 2], [0, 3], [3, 4]]
    },
    gemini: {
        name: 'Gemini', nameCN: '双子座', symbol: '♊', color: 0x00CED1, date: '5/21-6/21',
        stars: [
            { x: 0, y: 0.8, z: 0, size: 1.5 }, { x: 0.3, y: 0.6, z: 0.1, size: 1.5 },
            { x: -0.2, y: 0.3, z: 0, size: 1.0 }, { x: 0.5, y: 0.2, z: 0.1, size: 1.0 },
            { x: -0.3, y: -0.2, z: 0, size: 0.9 }, { x: 0.4, y: -0.3, z: 0.1, size: 0.9 },
        ],
        lines: [[0, 2], [2, 4], [1, 3], [3, 5], [0, 1]]
    },
    cancer: {
        name: 'Cancer', nameCN: '巨蟹座', symbol: '♋', color: 0x708090, date: '6/22-7/22',
        stars: [
            { x: 0, y: 0, z: 0, size: 1.2 }, { x: 0.4, y: 0.3, z: 0.1, size: 1.0 },
            { x: -0.3, y: 0.4, z: 0, size: 1.0 }, { x: 0.2, y: -0.3, z: 0.1, size: 0.9 },
        ],
        lines: [[0, 1], [0, 2], [0, 3]]
    },
    leo: {
        name: 'Leo', nameCN: '狮子座', symbol: '♌', color: 0xFFA500, date: '7/23-8/22',
        stars: [
            { x: 0, y: 0, z: 0, size: 1.6 }, { x: 0.3, y: 0.4, z: 0.1, size: 1.2 },
            { x: 0.7, y: 0.6, z: 0, size: 1.1 }, { x: 1.0, y: 0.4, z: 0.1, size: 1.0 },
            { x: 1.2, y: 0, z: 0, size: 1.3 }, { x: 0.5, y: -0.2, z: 0.1, size: 1.0 },
        ],
        lines: [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 4]]
    },
    virgo: {
        name: 'Virgo', nameCN: '处女座', symbol: '♍', color: 0x9370DB, date: '8/23-9/22',
        stars: [
            { x: 0, y: 0, z: 0, size: 1.5 }, { x: 0.3, y: 0.5, z: 0.1, size: 1.1 },
            { x: 0.6, y: 0.8, z: 0, size: 1.0 }, { x: -0.2, y: 0.4, z: 0.1, size: 1.0 },
            { x: -0.5, y: 0.7, z: 0, size: 0.9 },
        ],
        lines: [[0, 1], [1, 2], [0, 3], [3, 4]]
    },
    libra: {
        name: 'Libra', nameCN: '天秤座', symbol: '♎', color: 0x20B2AA, date: '9/23-10/23',
        stars: [
            { x: 0, y: 0, z: 0, size: 1.3 }, { x: 0.5, y: 0.3, z: 0.1, size: 1.2 },
            { x: -0.5, y: 0.3, z: 0, size: 1.2 }, { x: 0.3, y: -0.4, z: 0.1, size: 1.0 },
            { x: -0.3, y: -0.4, z: 0, size: 1.0 },
        ],
        lines: [[0, 1], [0, 2], [1, 3], [2, 4]]
    },
    scorpio: {
        name: 'Scorpio', nameCN: '天蝎座', symbol: '♏', color: 0xDC143C, date: '10/24-11/22',
        stars: [
            { x: 0, y: 0, z: 0, size: 1.7 }, { x: 0.3, y: 0.3, z: 0.1, size: 1.1 },
            { x: -0.3, y: -0.3, z: 0.1, size: 1.0 }, { x: -0.6, y: -0.5, z: 0, size: 1.0 },
            { x: -0.9, y: -0.6, z: 0.1, size: 1.1 }, { x: -1.1, y: -0.4, z: 0, size: 1.0 },
        ],
        lines: [[0, 1], [0, 2], [2, 3], [3, 4], [4, 5]]
    },
    sagittarius: {
        name: 'Sagittarius', nameCN: '射手座', symbol: '♐', color: 0x9400D3, date: '11/23-12/21',
        stars: [
            { x: 0, y: 0, z: 0, size: 1.3 }, { x: 0.4, y: 0.4, z: 0.1, size: 1.2 },
            { x: 0.7, y: 0.2, z: 0, size: 1.1 }, { x: -0.3, y: 0.3, z: 0.1, size: 1.1 },
            { x: -0.5, y: -0.2, z: 0, size: 1.0 },
        ],
        lines: [[0, 1], [1, 2], [0, 3], [3, 4]]
    },
    capricorn: {
        name: 'Capricorn', nameCN: '摩羯座', symbol: '♑', color: 0x2F4F4F, date: '12/22-1/19',
        stars: [
            { x: 0, y: 0, z: 0, size: 1.3 }, { x: 0.5, y: 0.2, z: 0.1, size: 1.1 },
            { x: 0.8, y: 0, z: 0, size: 1.0 }, { x: 0.6, y: -0.3, z: 0.1, size: 1.0 },
            { x: 0.2, y: -0.4, z: 0, size: 1.1 },
        ],
        lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]]
    },
    aquarius: {
        name: 'Aquarius', nameCN: '水瓶座', symbol: '♒', color: 0x4169E1, date: '1/20-2/18',
        stars: [
            { x: 0, y: 0, z: 0, size: 1.3 }, { x: 0.4, y: 0.3, z: 0.1, size: 1.1 },
            { x: 0.8, y: 0.2, z: 0, size: 1.0 }, { x: -0.3, y: -0.2, z: 0, size: 1.1 },
            { x: -0.6, y: -0.5, z: 0.1, size: 1.0 },
        ],
        lines: [[0, 1], [1, 2], [0, 3], [3, 4]]
    },
    pisces: {
        name: 'Pisces', nameCN: '双鱼座', symbol: '♓', color: 0x48D1CC, date: '2/19-3/20',
        stars: [
            { x: 0, y: 0, z: 0, size: 1.2 }, { x: 0.4, y: 0.3, z: 0.1, size: 1.0 },
            { x: 0.7, y: 0.5, z: 0, size: 1.1 }, { x: -0.3, y: -0.2, z: 0, size: 1.0 },
            { x: -0.5, y: -0.5, z: 0.1, size: 1.1 },
        ],
        lines: [[0, 1], [1, 2], [0, 3], [3, 4]]
    },
    
    // ===== 著名星座 =====
    orion: {
        name: 'Orion', nameCN: '猎户座', symbol: '🏹', color: 0x87CEEB, date: '冬季',
        stars: [
            { x: 0, y: 0.8, z: 0, size: 1.7 }, { x: 0.6, y: 0.7, z: 0.1, size: 1.4 },
            { x: 0.2, y: 0.3, z: 0, size: 1.1 }, { x: 0.3, y: 0.2, z: 0.1, size: 1.2 },
            { x: 0.4, y: 0.1, z: 0, size: 1.1 }, { x: 0, y: -0.4, z: 0.1, size: 1.4 },
            { x: 0.6, y: -0.3, z: 0, size: 1.6 },
        ],
        lines: [[0, 1], [0, 5], [1, 6], [2, 3], [3, 4], [5, 4], [6, 4]]
    },
    ursaMajor: {
        name: 'Ursa Major', nameCN: '大熊座', symbol: '🐻', color: 0xFFD700, date: '全年',
        stars: [
            { x: 0, y: 0, z: 0, size: 1.4 }, { x: 0.4, y: 0.1, z: 0.1, size: 1.3 },
            { x: 0.8, y: 0, z: 0, size: 1.2 }, { x: 1.1, y: 0.2, z: 0.1, size: 1.3 },
            { x: 1.5, y: 0.3, z: 0, size: 1.4 }, { x: 1.9, y: 0.2, z: 0.1, size: 1.3 },
            { x: 2.2, y: 0, z: 0, size: 1.2 },
        ],
        lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]]
    },
    cygnus: {
        name: 'Cygnus', nameCN: '天鹅座', symbol: '🦢', color: 0x98FB98, date: '夏季',
        stars: [
            { x: 0, y: 0.6, z: 0, size: 1.5 }, { x: 0, y: 0.3, z: 0.1, size: 1.2 },
            { x: 0, y: 0, z: 0, size: 1.3 }, { x: -0.4, y: -0.2, z: 0.1, size: 1.1 },
            { x: 0.4, y: -0.2, z: 0, size: 1.1 }, { x: 0, y: -0.5, z: 0.1, size: 1.4 },
        ],
        lines: [[0, 1], [1, 2], [2, 3], [2, 4], [2, 5]]
    },
    cassiopeia: {
        name: 'Cassiopeia', nameCN: '仙后座', symbol: '👑', color: 0xFFB6C1, date: '全年',
        stars: [
            { x: 0, y: 0, z: 0, size: 1.3 }, { x: 0.4, y: 0.3, z: 0.1, size: 1.4 },
            { x: 0.8, y: 0.1, z: 0, size: 1.5 }, { x: 1.2, y: 0.4, z: 0.1, size: 1.3 },
            { x: 1.6, y: 0.2, z: 0, size: 1.4 },
        ],
        lines: [[0, 1], [1, 2], [2, 3], [3, 4]]
    },
    lyra: {
        name: 'Lyra', nameCN: '天琴座', symbol: '🎵', color: 0x00BFFF, date: '夏季',
        stars: [
            { x: 0, y: 0, z: 0, size: 1.9 }, { x: 0.2, y: -0.3, z: 0.1, size: 1.0 },
            { x: 0.4, y: -0.4, z: 0, size: 1.0 }, { x: 0.2, y: -0.6, z: 0.1, size: 0.9 },
            { x: 0.4, y: -0.7, z: 0, size: 0.9 },
        ],
        lines: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4]]
    },
};

// 获取星座总数
export const CONSTELLATION_COUNT = Object.keys(CONSTELLATIONS).length;

// 获取黄道星座
export const ZODIAC_CONSTELLATIONS = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
];

// 获取著名星座
export const FAMOUS_CONSTELLATIONS = [
    'orion', 'ursaMajor', 'cygnus', 'cassiopeia', 'lyra'
];
