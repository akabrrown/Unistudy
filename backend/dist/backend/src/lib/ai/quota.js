"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCreditBalance = getCreditBalance;
exports.getUserQuota = getUserQuota;
exports.checkUserQuota = checkUserQuota;
exports.consumeUserQuota = consumeUserQuota;
const redis_1 = require("../redis");
const supabase_1 = require("../supabase");
const quota_1 = require("@unistudy/shared/constants/quota");
async function getCreditBalance(userId) {
    const { data, error } = await supabase_1.supabaseAdmin.from('credit_wallets').select('balance').eq('user_id', userId).single();
    if (!data) {
        const { data: inserted } = await supabase_1.supabaseAdmin.from('credit_wallets').insert({ user_id: userId, balance: 0 }).select('balance').single();
        return inserted?.balance || 0;
    }
    return data.balance;
}
async function getUserQuota(userId) {
    if (redis_1.redis) {
        const cached = await redis_1.redis.get(`user_quota:${userId}`);
        if (cached)
            return cached;
    }
    const { data } = await supabase_1.supabaseAdmin.from('user_quota').select('*').eq('user_id', userId).single();
    let result = data;
    if (!result) {
        const { data: insertedData, error: insertErr } = await supabase_1.supabaseAdmin
            .from('user_quota')
            .insert({ user_id: userId })
            .select('*')
            .single();
        if (insertErr) {
            console.error("Failed to auto-create user_quota row:", insertErr);
        }
        else {
            result = insertedData;
        }
    }
    if (redis_1.redis && result) {
        try {
            await redis_1.redis.set(`user_quota:${userId}`, result, { ex: 30 });
        }
        catch (e) {
            console.warn("Redis write failed:", e);
        }
    }
    return result;
}
async function checkUserQuota(userId, feature) {
    const provider = quota_1.FEATURE_PROVIDER_MAP[feature];
    const cost = quota_1.FEATURE_COSTS[feature];
    const config = quota_1.PROVIDER_CONFIG[provider];
    if (!config.has_user_quota || !config.user_quota_column) {
        return { allowed: true, cost: 0, daily_used: 0, daily_limit: 9999, wallet_balance: 9999 };
    }
    const colPrefix = config.user_quota_column;
    const dailyLimit = quota_1.FREE_DAILY_ALLOWANCES[colPrefix] || 0;
    const quota = await getUserQuota(userId);
    if (!quota)
        return { allowed: false, cost, daily_used: 0, daily_limit: dailyLimit, wallet_balance: 0 };
    const walletBalance = await getCreditBalance(userId);
    let used = quota[`${colPrefix}_daily_used`] || 0;
    let resetsAt = new Date(quota[`${colPrefix}_daily_reset`] || new Date());
    resetsAt.setUTCDate(resetsAt.getUTCDate() + 1);
    resetsAt.setUTCHours(0, 0, 0, 0);
    const isNewPeriod = new Date() > resetsAt;
    const actualUsed = isNewPeriod ? 0 : used;
    const dailyRemaining = dailyLimit - actualUsed;
    const isAllowed = dailyRemaining >= cost || walletBalance >= cost;
    return {
        allowed: isAllowed,
        reason: isAllowed ? undefined : 'limit_reached',
        cost,
        daily_used: actualUsed,
        daily_limit: dailyLimit,
        wallet_balance: walletBalance
    };
}
async function consumeUserQuota(userId, feature) {
    const provider = quota_1.FEATURE_PROVIDER_MAP[feature];
    const cost = quota_1.FEATURE_COSTS[feature];
    if (cost <= 0)
        return true;
    const config = quota_1.PROVIDER_CONFIG[provider];
    if (!config.has_user_quota || !config.user_quota_column) {
        return true;
    }
    const colPrefix = config.user_quota_column;
    const dailyLimit = quota_1.FREE_DAILY_ALLOWANCES[colPrefix] || 0;
    const quota = await getUserQuota(userId);
    const walletBalance = await getCreditBalance(userId);
    let used = quota[`${colPrefix}_daily_used`] || 0;
    let resetsAt = new Date(quota[`${colPrefix}_daily_reset`] || new Date());
    resetsAt.setUTCDate(resetsAt.getUTCDate() + 1);
    resetsAt.setUTCHours(0, 0, 0, 0);
    const isNewPeriod = new Date() > resetsAt;
    const actualUsed = isNewPeriod ? 0 : used;
    const dailyRemaining = dailyLimit - actualUsed;
    if (dailyRemaining >= cost) {
        const rpcName = `increment_user_${colPrefix}_daily`;
        await supabase_1.supabaseAdmin.rpc(rpcName, { p_user_id: userId, p_amount: cost });
    }
    else if (walletBalance >= cost) {
        await supabase_1.supabaseAdmin.rpc('decrement_credit_wallet', { p_user_id: userId, p_amount: cost });
    }
    else {
        throw new Error('quota_exhausted');
    }
    await supabase_1.supabaseAdmin.from('ai_request_log').insert({
        user_id: userId,
        provider,
        feature,
        pool_type: config.pool_type,
        requests_cost: cost,
        was_cached: false,
        drew_from_pool: false,
        user_plan: 'credit_system'
    });
    if (redis_1.redis) {
        try {
            await redis_1.redis.del(`user_quota:${userId}`);
        }
        catch (e) {
            console.warn("Redis delete failed:", e);
        }
    }
    return true;
}
