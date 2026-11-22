"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const quota_1 = require("../lib/ai/quota");
const quota_2 = require("@unistudy/shared/constants/quota");
const cpuOptimization_1 = require("../../../shared/lib/cpuOptimization");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
const quotaStatusCache = new cpuOptimization_1.TTLCache(5_000, 500);
router.get('/status', async (req, res) => {
    try {
        const userId = req.user.id;
        const cached = quotaStatusCache.get(userId);
        if (cached) {
            res.setHeader('Cache-Control', 'private, max-age=5');
            return res.json(cached);
        }
        const now = new Date();
        const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        const [quota, walletBalance, logsRes] = await Promise.all([
            (0, quota_1.getUserQuota)(userId),
            (0, quota_1.getCreditBalance)(userId),
            supabase_1.supabaseAdmin
                .from('ai_request_log')
                .select('requests_cost, called_at, feature, provider, pool_type')
                .eq('user_id', userId)
                .order('called_at', { ascending: false })
                .limit(300),
        ]);
        const logs = logsRes.data || [];
        let totalLifetimePoints = 0;
        let totalTodayPoints = 0;
        const featureBreakdown = {};
        for (const log of logs) {
            const cost = Number(log.requests_cost || 0);
            totalLifetimePoints += cost;
            const calledAt = new Date(log.called_at);
            if (calledAt >= todayStart) {
                totalTodayPoints += cost;
            }
            const feat = log.feature || 'other';
            if (!featureBreakdown[feat]) {
                featureBreakdown[feat] = { count: 0, points: 0, credits: 0 };
            }
            featureBreakdown[feat].count += 1;
            featureBreakdown[feat].points += cost;
            featureBreakdown[feat].credits = Number((featureBreakdown[feat].points / 100).toFixed(2));
        }
        // Feature status map
        const featuresStatus = {};
        Object.keys(quota_2.FEATURE_COSTS).forEach((key) => {
            const f = key;
            featuresStatus[f] = {
                provider: quota_2.FEATURE_PROVIDER_MAP[f],
                cost: quota_2.FEATURE_COSTS[f],
                locked: false,
                available: true,
            };
        });
        const response = {
            wallet_balance: walletBalance,
            wallet_credits: Number((walletBalance / 100).toFixed(2)),
            plan: 'credit_system',
            paid_expires_at: null,
            usage_summary: {
                points_used_today: totalTodayPoints,
                credits_used_today: Number((totalTodayPoints / 100).toFixed(2)),
                points_used_lifetime: totalLifetimePoints,
                credits_used_lifetime: Number((totalLifetimePoints / 100).toFixed(2)),
                total_operations_recorded: logs.length,
            },
            features_breakdown: featureBreakdown,
            features: featuresStatus,
        };
        const relevantProviders = ['gemini', 'groq_70b', 'groq_8b', 'cohere', 'youtube'];
        for (const p of relevantProviders) {
            let prefix = p.replace('_', '').replace('70b', '70').replace('8b', '8');
            if (p === 'gemini')
                prefix = 'gemini';
            const dailyLimit = quota_2.FREE_DAILY_ALLOWANCES[prefix] || 0;
            const rawUsed = Number(quota?.[`${prefix}_daily_used`] || 0);
            const rawReset = quota?.[`${prefix}_daily_reset`];
            let isNewPeriod = true;
            let resetsAtDate = null;
            if (rawReset) {
                resetsAtDate = new Date(rawReset);
                resetsAtDate.setUTCDate(resetsAtDate.getUTCDate() + 1);
                resetsAtDate.setUTCHours(0, 0, 0, 0);
                isNewPeriod = now > resetsAtDate;
            }
            const actualUsed = isNewPeriod ? 0 : rawUsed;
            const remaining = Math.max(0, dailyLimit - actualUsed);
            const percentage = dailyLimit > 0 ? Math.min(100, Math.round((actualUsed / dailyLimit) * 100)) : 100;
            response[p] = {
                daily_used: actualUsed,
                daily_limit: dailyLimit,
                daily_remaining: remaining,
                percentage_used: percentage,
                daily_resets_at: resetsAtDate ? resetsAtDate.toISOString() : null,
                locked: false,
                platform_unavailable: false,
            };
        }
        quotaStatusCache.set(userId, response);
        res.setHeader('Cache-Control', 'private, max-age=5');
        res.json(response);
    }
    catch (error) {
        console.error('Quota status error:', error);
        res.status(500).json({ error: 'Failed to fetch quota status' });
    }
});
exports.default = router;
