"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCache = checkCache;
exports.setCache = setCache;
exports.isCached = isCached;
const supabase_1 = require("../supabase");
const redis_1 = require("../redis");
async function checkCache(feature, userId, ...identifiers) {
    try {
        switch (feature) {
            case 'slide_explanation': {
                const slideId = identifiers[0];
                const { data } = await supabase_1.supabaseAdmin.from('slides').select('explanation').eq('id', slideId).single();
                if (data?.explanation) {
                    await logCacheHit(feature, userId);
                    return data.explanation;
                }
                return null;
            }
            case 'daily_brief':
            case 'motivational_quote':
            case 'break_suggestion':
                // These are cached per day per user
                if (redis_1.redis) {
                    // identifiers[0] should be date YYYY-MM-DD
                    const date = identifiers[0];
                    const val = await redis_1.redis.get(`cache:${feature}:${userId}:${date}`);
                    if (val) {
                        await logCacheHit(feature, userId);
                        return val;
                    }
                }
                return null;
            default:
                return null;
        }
    }
    catch (error) {
        console.error("Cache lookup failed", error);
        return null;
    }
}
async function setCache(feature, userId, result, ...identifiers) {
    try {
        switch (feature) {
            case 'slide_explanation': {
                const slideId = identifiers[0];
                await supabase_1.supabaseAdmin.from('slides').update({ explanation: result }).eq('id', slideId);
                break;
            }
            case 'daily_brief':
            case 'motivational_quote':
            case 'break_suggestion':
                if (redis_1.redis) {
                    const date = identifiers[0];
                    try {
                        await redis_1.redis.set(`cache:${feature}:${userId}:${date}`, result, { ex: 86400 });
                    }
                    catch (e) {
                        console.warn("Redis write failed:", e);
                    }
                }
                break;
        }
    }
    catch (error) {
        console.error("Cache set failed", error);
    }
}
async function isCached(feature, userId, ...identifiers) {
    const result = await checkCache(feature, userId, ...identifiers);
    return result !== null;
}
async function logCacheHit(feature, userId) {
    if (userId) {
        await supabase_1.supabaseAdmin.from('ai_request_log').insert({
            user_id: userId,
            provider: 'cache',
            feature,
            pool_type: 'none',
            requests_cost: 0,
            was_cached: true,
            drew_from_pool: false,
        });
    }
}
