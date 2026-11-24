"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDualTierWallet = getDualTierWallet;
exports.getCreditBalance = getCreditBalance;
exports.getUserQuota = getUserQuota;
exports.checkUserQuota = checkUserQuota;
exports.consumeUserQuota = consumeUserQuota;
const redis_1 = require("../redis");
const supabase_1 = require("../supabase");
const quota_1 = require("@unistudy/shared/constants/quota");
async function getDualTierWallet(userId) {
    try {
        const { data: rpcData, error: rpcErr } = await supabase_1.supabaseAdmin.rpc('get_or_refill_wallet', { p_user_id: userId });
        if (!rpcErr && rpcData && typeof rpcData === 'object') {
            const d = rpcData;
            return {
                freePasses: Number(d.free_passes ?? 8),
                freePassesLimit: Number(d.free_passes_limit ?? 8),
                paidCredits: Number(d.paid_credits ?? 20),
                totalAvailable: Number(d.total_available ?? 28),
                tier: String(d.tier ?? 'free'),
                nextRefillAt: String(d.next_refill_at ?? new Date(Date.now() + quota_1.DUAL_TIER_CONFIG.REFRESH_INTERVAL_MS).toISOString()),
                secondsUntilRefill: Number(d.seconds_until_refill ?? 6 * 3600),
            };
        }
        const { data: walletRow } = await supabase_1.supabaseAdmin
            .from('credit_wallets')
            .select('balance, free_passes, free_passes_refreshed_at, tier')
            .eq('user_id', userId)
            .maybeSingle();
        const now = Date.now();
        const tier = walletRow?.tier === 'pro' ? 'pro' : 'free';
        const maxFree = tier === 'pro' ? quota_1.DUAL_TIER_CONFIG.PRO_PASSES_LIMIT : quota_1.DUAL_TIER_CONFIG.FREE_PASSES_LIMIT;
        if (!walletRow) {
            await supabase_1.supabaseAdmin.from('credit_wallets').upsert({
                user_id: userId,
                balance: 20,
                free_passes: maxFree,
                free_passes_refreshed_at: new Date(now).toISOString(),
                tier,
                updated_at: new Date(now).toISOString(),
            }, { onConflict: 'user_id' });
            return {
                freePasses: maxFree,
                freePassesLimit: maxFree,
                paidCredits: 20,
                totalAvailable: maxFree + 20,
                tier,
                nextRefillAt: new Date(now + quota_1.DUAL_TIER_CONFIG.REFRESH_INTERVAL_MS).toISOString(),
                secondsUntilRefill: 6 * 3600,
            };
        }
        let freePasses = typeof walletRow.free_passes === 'number' ? walletRow.free_passes : maxFree;
        let refreshedAt = walletRow.free_passes_refreshed_at
            ? new Date(walletRow.free_passes_refreshed_at).getTime()
            : 0;
        if (now - refreshedAt >= quota_1.DUAL_TIER_CONFIG.REFRESH_INTERVAL_MS) {
            freePasses = maxFree;
            refreshedAt = now;
            await supabase_1.supabaseAdmin.from('credit_wallets').update({
                free_passes: maxFree,
                free_passes_refreshed_at: new Date(now).toISOString(),
                updated_at: new Date(now).toISOString(),
            }).eq('user_id', userId);
        }
        const paidCredits = typeof walletRow.balance === 'number' ? walletRow.balance : 0;
        const nextRefill = refreshedAt + quota_1.DUAL_TIER_CONFIG.REFRESH_INTERVAL_MS;
        const secondsUntilRefill = Math.max(0, Math.floor((nextRefill - now) / 1000));
        return {
            freePasses,
            freePassesLimit: maxFree,
            paidCredits,
            totalAvailable: freePasses + paidCredits,
            tier,
            nextRefillAt: new Date(nextRefill).toISOString(),
            secondsUntilRefill,
        };
    }
    catch (err) {
        console.warn('[Backend getDualTierWallet] Fallback notice:', err);
        return {
            freePasses: 8,
            freePassesLimit: 8,
            paidCredits: 20,
            totalAvailable: 28,
            tier: 'free',
            nextRefillAt: new Date(Date.now() + quota_1.DUAL_TIER_CONFIG.REFRESH_INTERVAL_MS).toISOString(),
            secondsUntilRefill: 6 * 3600,
        };
    }
}
async function getCreditBalance(userId) {
    const wallet = await getDualTierWallet(userId);
    return wallet.totalAvailable;
}
async function getUserQuota(userId) {
    if (redis_1.redis) {
        try {
            const cached = await redis_1.redis.get(`user_quota:${userId}`);
            if (cached)
                return cached;
        }
        catch (e) {
            console.warn("Redis read failed:", e);
        }
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
async function checkUserQuota(userId, feature, model_tier = 'default') {
    const cost = 1;
    const walletBalance = await getCreditBalance(userId);
    const isAllowed = walletBalance >= cost;
    return {
        allowed: isAllowed,
        reason: isAllowed ? undefined : 'limit_reached',
        cost,
        daily_used: 0,
        daily_limit: 0,
        wallet_balance: walletBalance
    };
}
async function consumeUserQuota(userId, feature, model_tier = 'default') {
    const cost = 1;
    const provider = quota_1.FEATURE_PROVIDER_MAP[feature] || 'gemini';
    try {
        const { data: rpcRes, error: rpcErr } = await supabase_1.supabaseAdmin.rpc('consume_ai_credit_dual_tier', {
            p_user_id: userId,
            p_amount: cost,
        });
        if (!rpcErr && rpcRes && typeof rpcRes === 'object') {
            const d = rpcRes;
            if (d.allowed === false) {
                throw new Error('quota_exhausted');
            }
            try {
                await supabase_1.supabaseAdmin.from('ai_request_log').insert({
                    user_id: userId,
                    provider,
                    feature,
                    pool_type: d.deducted_from === 'free' ? 'free_daily' : 'credit_funded',
                    requests_cost: cost,
                    was_cached: false,
                    drew_from_pool: d.deducted_from === 'free',
                    user_plan: 'credit_system',
                });
            }
            catch (logErr) {
                console.warn('[Backend Quota] Log insert notice:', logErr);
            }
            if (redis_1.redis) {
                await redis_1.redis.del(`user_quota:${userId}`).catch(() => { });
            }
            return { success: true, remainingCredits: Number(d.total_available ?? 0) };
        }
    }
    catch (rpcErr) {
        if (rpcErr instanceof Error && rpcErr.message === 'quota_exhausted') {
            throw rpcErr;
        }
        console.warn('[Backend Quota] RPC fallback notice:', rpcErr);
    }
    // Fallback JS deduction
    const wallet = await getDualTierWallet(userId);
    if (wallet.totalAvailable < cost) {
        throw new Error('quota_exhausted');
    }
    let newFree = wallet.freePasses;
    let newPaid = wallet.paidCredits;
    let deductedFrom = 'free';
    if (newFree >= cost) {
        newFree -= cost;
    }
    else if (newFree > 0) {
        const rem = cost - newFree;
        newFree = 0;
        newPaid = Math.max(0, newPaid - rem);
        deductedFrom = 'mixed';
    }
    else {
        newPaid = Math.max(0, newPaid - cost);
        deductedFrom = 'paid';
    }
    await supabase_1.supabaseAdmin
        .from('credit_wallets')
        .update({
        free_passes: newFree,
        balance: newPaid,
        updated_at: new Date().toISOString(),
    })
        .eq('user_id', userId);
    try {
        await supabase_1.supabaseAdmin.from('ai_request_log').insert({
            user_id: userId,
            provider,
            feature,
            pool_type: deductedFrom === 'free' ? 'free_daily' : 'credit_funded',
            requests_cost: cost,
            was_cached: false,
            drew_from_pool: deductedFrom === 'free',
            user_plan: 'credit_system',
        });
    }
    catch (logErr) {
        console.warn('[Backend Quota] Log insert notice:', logErr);
    }
    if (redis_1.redis) {
        try {
            await redis_1.redis.del(`user_quota:${userId}`);
        }
        catch (e) {
            console.warn("Redis delete failed:", e);
        }
    }
    return { success: true, remainingCredits: newFree + newPaid };
}
