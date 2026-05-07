/**
 * Finding Kepler - Core Business Logic 2.0 (Linear Master Pool Edition)
 */

export async function loadQuestionBank() {
    try {
        const res = await fetch('questionbank.json');
        if (!res.ok) throw new Error("Failed to fetch question bank");
        return await res.json();
    } catch (e) {
        console.error("Failed to load question bank:", e);
        return null;
    }
}

// 歌曲精神坐标数据库 (Song Archetypes) - 全量 33 首
const SONG_ARCHETYPES = {
    "天黑黑": { sincerity: 95, lucidity: 60, autonomy: 40, persistence: 50, fortitude: 50, detachment: 40 },
    "逆光": { sincerity: 70, lucidity: 50, autonomy: 60, persistence: 40, fortitude: 95, detachment: 40 },
    "我怀念的": { sincerity: 50, lucidity: 30, autonomy: 40, persistence: 95, fortitude: 60, detachment: 30 },
    "遇见": { sincerity: 85, lucidity: 60, autonomy: 70, persistence: 50, fortitude: 50, detachment: 40 },
    "爱情证书": { sincerity: 70, lucidity: 40, autonomy: 40, persistence: 80, fortitude: 50, detachment: 40 },
    "我不难过": { sincerity: 30, lucidity: 60, autonomy: 60, persistence: 80, fortitude: 70, detachment: 50 },
    "开始懂了": { sincerity: 40, lucidity: 95, autonomy: 50, persistence: 30, fortitude: 60, detachment: 80 },
    "当冬夜渐暖": { sincerity: 60, lucidity: 90, autonomy: 50, persistence: 40, fortitude: 60, detachment: 85 },
    "风衣": { sincerity: 75, lucidity: 50, autonomy: 40, persistence: 60, fortitude: 80, detachment: 50 },
    "直来直往": { sincerity: 60, lucidity: 60, autonomy: 90, persistence: 30, fortitude: 70, detachment: 80 },
    "第一天": { sincerity: 95, lucidity: 50, autonomy: 40, persistence: 40, fortitude: 60, detachment: 70 },
    "雨天": { sincerity: 40, lucidity: 20, autonomy: 50, persistence: 90, fortitude: 30, detachment: 20 },
    "天天年年": { sincerity: 90, lucidity: 50, autonomy: 40, persistence: 70, fortitude: 50, detachment: 40 },
    "平日快乐": { sincerity: 60, lucidity: 95, autonomy: 40, persistence: 30, fortitude: 40, detachment: 90 },
    "极美": { sincerity: 90, lucidity: 70, autonomy: 85, persistence: 40, fortitude: 50, detachment: 60 },
    "克卜勒": { sincerity: 90, lucidity: 60, autonomy: 85, persistence: 50, fortitude: 40, detachment: 40 },
    "完美的一天": { sincerity: 90, lucidity: 50, autonomy: 30, persistence: 40, fortitude: 40, detachment: 80 },
    "同类": { sincerity: 70, lucidity: 50, autonomy: 85, persistence: 60, fortitude: 50, detachment: 40 },
    "尚好的青春": { sincerity: 95, lucidity: 60, autonomy: 40, persistence: 85, fortitude: 50, detachment: 40 },
    "我要的幸福": { sincerity: 85, lucidity: 60, autonomy: 60, persistence: 50, fortitude: 80, detachment: 50 },
    "飘着": { sincerity: 50, lucidity: 30, autonomy: 40, persistence: 90, fortitude: 30, detachment: 20 },
    "漩涡": { sincerity: 40, lucidity: 40, autonomy: 50, persistence: 85, fortitude: 40, detachment: 30 },
    "超快感": { sincerity: 90, lucidity: 50, autonomy: 60, persistence: 40, fortitude: 75, detachment: 60 },
    "累赘": { sincerity: 50, lucidity: 50, autonomy: 80, persistence: 40, fortitude: 50, detachment: 60 },
    "风筝": { sincerity: 80, lucidity: 60, autonomy: 70, persistence: 40, fortitude: 50, detachment: 90 },
    "逃亡": { sincerity: 60, lucidity: 40, autonomy: 90, persistence: 30, fortitude: 70, detachment: 50 },
    "The Moment": { sincerity: 80, lucidity: 75, autonomy: 50, persistence: 40, fortitude: 60, detachment: 85 },
    "梦不落": { sincerity: 80, lucidity: 50, autonomy: 40, persistence: 50, fortitude: 90, detachment: 60 },
    "奔": { sincerity: 75, lucidity: 50, autonomy: 60, persistence: 40, fortitude: 95, detachment: 50 },
    "我也很想他": { sincerity: 80, lucidity: 40, autonomy: 40, persistence: 85, fortitude: 50, detachment: 30 },
    "绿光": { sincerity: 95, lucidity: 50, autonomy: 40, persistence: 40, fortitude: 95, detachment: 60 },
    "神奇": { sincerity: 70, lucidity: 60, autonomy: 95, persistence: 50, fortitude: 50, detachment: 80 },
    "我的爱": { sincerity: 85, lucidity: 40, autonomy: 50, persistence: 90, fortitude: 40, detachment: 30 }
};

export function calculateResult(answers, bank, sessionQuestions = []) {
    const dimensions = {
        sincerity: 0, lucidity: 0, autonomy: 0,
        persistence: 0, fortitude: 0, detachment: 0
    };
    
    // To solve the "shrunken radar" issue, we calculate the max possible score 
    // for each dimension BASED ON THE CURRENT SESSION.
    const maxPossible = {
        sincerity: 0, lucidity: 0, autonomy: 0,
        persistence: 0, fortitude: 0, detachment: 0
    };

    const targetQuestions = sessionQuestions.length > 0 ? sessionQuestions : (bank.questions || []);

    // Calculate actual scores and track potential max scores
    const allDims = ['sincerity', 'lucidity', 'autonomy', 'persistence', 'fortitude', 'detachment'];

    for (const [qId, choiceScore] of Object.entries(answers)) {
        const q = targetQuestions.find(item => item.id === qId);
        if (!q) continue;

        const score = parseInt(choiceScore);
        const weights = q.dimension_weights || {};

    for (const dim of allDims) {
        // AG Logic: If a dimension isn't mentioned, give it a 'Shadow Weight' of 0.1
        const weight = weights[dim] !== undefined ? weights[dim] : 0.1;
        
        if (dimensions.hasOwnProperty(dim)) {
            const absWeight = Math.abs(weight);
            
            // AG Balanced Accelerated Scoring: 
            // 1:0, 2:1.5, 3:3, 4:6, 5:10
            const getPowerScore = (s) => {
                const map = [0, 0, 1.5, 3, 6, 10];
                return map[s] || 0;
            };
            const getInvPowerScore = (s) => {
                const map = [0, 10, 6, 3, 1.5, 0];
                return map[s] || 0;
            };

            maxPossible[dim] += 10 * absWeight;

            if (weight > 0) {
                dimensions[dim] += getPowerScore(score) * weight;
            } else {
                dimensions[dim] += getInvPowerScore(score) * absWeight;
            }
        }
    }
}

// Normalize User Profile (0-100)
// GLOBAL_FLOOR 20 = ~2 Strongly Agree answers
const userProfile = {};
const GLOBAL_FLOOR = 20; 

for (const dim in dimensions) {
    const actual = dimensions[dim];
    const max = Math.max(maxPossible[dim], GLOBAL_FLOOR);
    userProfile[dim] = Math.round((actual / max) * 100);
}

    // Profile Matching Engine (Euclidean Distance)
    let bestMatch = null;
    let minDistance = Infinity;

    for (const [song, archetype] of Object.entries(SONG_ARCHETYPES)) {
        let distanceSq = 0;
        for (const dim in userProfile) {
            const userVal = userProfile[dim];
            const archVal = archetype[dim] || 0;
            distanceSq += Math.pow(userVal - archVal, 2);
        }
        
        // Add a tiny bit of random 'noise' (0.0001) to the distance 
        // to break mathematical ties and make it feel like 'fate'.
        const distance = Math.sqrt(distanceSq) + (Math.random() * 0.01);

        if (distance < minDistance) {
            minDistance = distance;
            bestMatch = song;
        }
    }

    return { song: bestMatch, dimensions: userProfile };
}

export async function loadIframeMap() {
    try {
        const res = await fetch('歌曲iframe.md');
        const text = await res.text();
        const map = {};
        const lines = text.split('\n');
        const lineRe = /^(.+?)[:：]\s*`?(<iframe\b.*?<\/iframe>)`?\s*$/i;

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith('注释') || line.startsWith('#')) continue;
            const m = line.match(lineRe);
            if (m) {
                map[m[1].trim()] = m[2].trim();
            }
        }
        return map;
    } catch (e) {
        return {};
    }
}
