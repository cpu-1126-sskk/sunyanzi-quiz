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
    "天黑黑": { sincerity: 97, lucidity: 58, autonomy: 37, persistence: 52, fortitude: 48, detachment: 41 },
    "逆光": { sincerity: 72, lucidity: 49, autonomy: 63, persistence: 38, fortitude: 97, detachment: 41 },
    "我怀念的": { sincerity: 53, lucidity: 27, autonomy: 42, persistence: 96, fortitude: 58, detachment: 31 },
    "遇见": { sincerity: 87, lucidity: 62, autonomy: 73, persistence: 49, fortitude: 51, detachment: 39 },
    "爱情证书": { sincerity: 72, lucidity: 37, autonomy: 39, persistence: 83, fortitude: 52, detachment: 41 },
    "我不难过": { sincerity: 27, lucidity: 63, autonomy: 58, persistence: 82, fortitude: 71, detachment: 54 },
    "开始懂了": { sincerity: 39, lucidity: 97, autonomy: 52, persistence: 27, fortitude: 63, detachment: 81 },
    "当冬夜渐暖": { sincerity: 61, lucidity: 92, autonomy: 49, persistence: 37, fortitude: 58, detachment: 86 },
    "风衣": { sincerity: 78, lucidity: 51, autonomy: 39, persistence: 63, fortitude: 82, detachment: 53 },
    "直来直往": { sincerity: 62, lucidity: 59, autonomy: 93, persistence: 27, fortitude: 74, detachment: 81 },
    "第一天": { sincerity: 96, lucidity: 47, autonomy: 43, persistence: 39, fortitude: 62, detachment: 71 },
    "雨天": { sincerity: 39, lucidity: 17, autonomy: 49, persistence: 92, fortitude: 29, detachment: 19 },
    "天天年年": { sincerity: 91, lucidity: 52, autonomy: 37, persistence: 74, fortitude: 49, detachment: 43 },
    "平日快乐": { sincerity: 57, lucidity: 97, autonomy: 43, persistence: 29, fortitude: 39, detachment: 92 },
    "极美": { sincerity: 92, lucidity: 71, autonomy: 86, persistence: 39, fortitude: 51, detachment: 64 },
    "克卜勒": { sincerity: 93, lucidity: 62, autonomy: 87, persistence: 53, fortitude: 39, detachment: 41 },
    "完美的一天": { sincerity: 92, lucidity: 49, autonomy: 27, persistence: 43, fortitude: 41, detachment: 84 },
    "同类": { sincerity: 71, lucidity: 53, autonomy: 86, persistence: 64, fortitude: 51, detachment: 37 },
    "尚好的青春": { sincerity: 96, lucidity: 63, autonomy: 39, persistence: 88, fortitude: 47, detachment: 41 },
    "我要的幸福": { sincerity: 88, lucidity: 62, autonomy: 57, persistence: 51, fortitude: 83, detachment: 54 },
    "飘着": { sincerity: 54, lucidity: 27, autonomy: 41, persistence: 93, fortitude: 29, detachment: 19 },
    "漩涡": { sincerity: 39, lucidity: 43, autonomy: 51, persistence: 86, fortitude: 37, detachment: 29 },
    "超快感": { sincerity: 91, lucidity: 53, autonomy: 64, persistence: 37, fortitude: 77, detachment: 62 },
    "累赘": { sincerity: 51, lucidity: 49, autonomy: 81, persistence: 37, fortitude: 47, detachment: 64 },
    "风筝": { sincerity: 84, lucidity: 57, autonomy: 71, persistence: 39, fortitude: 53, detachment: 93 },
    "逃亡": { sincerity: 62, lucidity: 37, autonomy: 91, persistence: 29, fortitude: 74, detachment: 49 },
    "The Moment": { sincerity: 81, lucidity: 77, autonomy: 51, persistence: 39, fortitude: 62, detachment: 86 },
    "梦不落": { sincerity: 83, lucidity: 53, autonomy: 37, persistence: 51, fortitude: 92, detachment: 64 },
    "奔": { sincerity: 77, lucidity: 49, autonomy: 62, persistence: 39, fortitude: 96, detachment: 51 },
    "我也很想他": { sincerity: 84, lucidity: 37, autonomy: 41, persistence: 88, fortitude: 51, detachment: 27 },
    "绿光": { sincerity: 97, lucidity: 47, autonomy: 43, persistence: 41, fortitude: 96, detachment: 63 },
    "神奇": { sincerity: 71, lucidity: 64, autonomy: 97, persistence: 53, fortitude: 51, detachment: 82 },
    "我的爱": { sincerity: 86, lucidity: 39, autonomy: 51, persistence: 93, fortitude: 37, detachment: 27 }
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

        if (q.type === 'sort' && Array.isArray(choiceScore)) {
            const weights = [10, 6.5, 3.5, 1.5, 0.5, 0];
            choiceScore.forEach((optId, index) => {
                const opt = q.options.find(o => o.id === optId);
                if (opt && opt.dim && dimensions.hasOwnProperty(opt.dim)) {
                    dimensions[opt.dim] += weights[index] || 0;
                    maxPossible[opt.dim] += 10;
                }
            });
            continue;
        }

        const score = parseInt(choiceScore);
        const weights = q.dimension_weights || {};

    for (const dim of allDims) {
        // AG Logic: If a dimension isn't mentioned, give it a tiny 'Shadow Weight' of 0.01
        // This prevents the 'shrunken radar' without diluting the real test results.
        const isExplicit = weights[dim] !== undefined;
        const weight = isExplicit ? weights[dim] : 0.01;
        
        if (dimensions.hasOwnProperty(dim)) {
            const absWeight = Math.abs(weight);
            
            const getPowerScore = (s) => {
                const map = [0, 0, 1.5, 3, 6, 10];
                return map[s] || 0;
            };
            const getInvPowerScore = (s) => {
                const map = [0, 10, 6, 3, 1.5, 0];
                return map[s] || 0;
            };

            maxPossible[dim] += 10 * absWeight;

            if (isExplicit) {
                if (weight > 0) {
                    dimensions[dim] += getPowerScore(score) * weight;
                } else {
                    dimensions[dim] += getInvPowerScore(score) * absWeight;
                }
            } else {
                // Shadow weight contributes a static 'Neutral' baseline (3 points)
                // Using 0.01 weight means it won't dilute the real 1.0-2.0 weights.
                dimensions[dim] += getPowerScore(3) * absWeight;
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
        
        // Deterministic Tie-Breaker: 使用歌曲名称的字符编码之和产生微小的确定性偏移
        // 彻底干掉随机数，保证重测信度 (Test-Retest Reliability) 绝对严密。
        const deterministicNoise = song.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 0.00001;
        const distance = Math.sqrt(distanceSq) + deterministicNoise;

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
