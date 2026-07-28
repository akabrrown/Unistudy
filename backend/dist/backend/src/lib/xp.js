"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEVELS = void 0;
exports.getCurrentLevel = getCurrentLevel;
exports.getNextLevel = getNextLevel;
exports.getLevel = getLevel;
exports.syncLevel = syncLevel;
exports.awardXP = awardXP;
const supabase_1 = require("./supabase");
exports.LEVELS = [
    { level: 1, title: 'Beginner', xpRequired: 0, badge: 'gray' },
    { level: 2, title: 'Elite', xpRequired: 2500, badge: 'bronze' },
    { level: 3, title: 'Pro', xpRequired: 5000, badge: 'silver' },
    { level: 4, title: 'Master', xpRequired: 7500, badge: 'gold' },
    { level: 5, title: 'Grand Master', xpRequired: 10000, badge: 'purple' },
    { level: 6, title: 'Legendary', xpRequired: 12500, badge: 'purple' }
];
function getCurrentLevel(xp) {
    for (let i = exports.LEVELS.length - 1; i >= 0; i--) {
        if (xp >= exports.LEVELS[i].xpRequired) {
            return exports.LEVELS[i];
        }
    }
    return exports.LEVELS[0];
}
function getNextLevel(xp) {
    const currentLevel = getCurrentLevel(xp);
    const nextLevelIndex = exports.LEVELS.findIndex(l => l.level === currentLevel.level) + 1;
    return exports.LEVELS[nextLevelIndex] || null;
}
function getLevel(xp) {
    const current = getCurrentLevel(xp);
    const nextLevel = getNextLevel(xp);
    const xpToNext = nextLevel ? nextLevel.xpRequired - xp : 0;
    let progress = 100;
    if (nextLevel) {
        progress = ((xp - current.xpRequired) / (nextLevel.xpRequired - current.xpRequired)) * 100;
    }
    return {
        ...current,
        xpToNext,
        progress: Math.min(100, Math.max(0, Math.round(progress)))
    };
}
async function syncLevel(userId, xp) {
    const { title } = getLevel(xp);
    await supabase_1.supabaseAdmin.from('profiles').update({ level: title }).eq('id', userId);
}
async function awardXP(userId, amount) {
    const { data } = await supabase_1.supabaseAdmin.from('profiles').select('total_xp').eq('id', userId).single();
    if (data) {
        const newXp = (data.total_xp || 0) + amount;
        await supabase_1.supabaseAdmin.from('profiles').update({ total_xp: newXp }).eq('id', userId);
        await syncLevel(userId, newXp);
    }
}
