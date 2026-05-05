/**
 * Finding Kepler - Core Business Logic (JS Port)
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


export function getDiversionGroup(q1Choice, q2Choice, bank) {
    const matrix = bank.routing_matrix || {};
    const routeKey = `${q1Choice || ""}${q2Choice || ""}`.toUpperCase();
    return matrix[routeKey];
}

export function calculateResult(configName, answers, bank) {
    const config = bank.configurations?.[configName];
    if (!config) return null;

    const scores = {};
    const questions = config.questions || [];

    for (const q of questions) {
        const choiceId = answers[q.id];
        if (!choiceId) continue;

        const option = q.options?.find(opt => opt.id === choiceId);
        if (!option) continue;

        // 1. Trigger (Hard lock)
        if (option.trigger) return option.trigger;

        // 2. Accumulate scores
        if (option.scores) {
            for (const [song, weight] of Object.entries(option.scores)) {
                const numericWeight = parseFloat(weight);
                if (!isNaN(numericWeight)) {
                    scores[song] = (scores[song] || 0) + numericWeight;
                }
            }
        }
    }

    const entries = Object.entries(scores);
    if (entries.length === 0) return null;

    // Sort by score (desc), then by name (asc) to be deterministic
    entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    return entries[0][0];
}

export async function loadIframeMap() {
    try {
        const res = await fetch('歌曲iframe.md');
        const text = await res.text();
        const map = {};
        const lines = text.split('\n');
        const lineRe = /^(.+?)[:：]\s*(<iframe\b.*?<\/iframe>)\s*$/i;

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
