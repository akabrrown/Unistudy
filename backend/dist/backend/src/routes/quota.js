"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const quota_1 = require("../lib/ai/quota");
const quota_2 = require("@unistudy/shared/constants/quota");
const cpuOptimization_1 = require("../../../shared/lib/cpuOptimization");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
const quotaStatusCache = new cpuOptimization_1.TTLCache(10_000, 500);
router.get('/status', async (req, res) => {
    try {
        const userId = req.user.id;
        const cached = quotaStatusCache.get(userId);
        if (cached) {
            res.setHeader('Cache-Control', 'private, max-age=10');
            return res.json(cached);
        }
        const [quota, walletBalance] = await Promise.all([
            (0, quota_1.getUserQuota)(userId),
            (0, quota_1.getCreditBalance)(userId),
        ]);
        // Feature status map
        const featuresStatus = {};
        Object.keys(quota_2.FEATURE_COSTS).forEach((key) => {
            const f = key;
            featuresStatus[f] = {
                provider: quota_2.FEATURE_PROVIDER_MAP[f],
                cost: quota_2.FEATURE_COSTS[f],
                locked: false,
                available: true
            };
        });
        const response = { features: featuresStatus, wallet_balance: walletBalance };
        const relevantProviders = ['gemini', 'groq_70b', 'groq_8b', 'cohere', 'youtube'];
        for (const p of relevantProviders) {
            let prefix = p.replace('_', '').replace('70b', '70').replace('8b', '8');
            if (p === 'gemini')
                prefix = 'gemini';
            const dailyLimit = quota_2.FREE_DAILY_ALLOWANCES[prefix] || 0;
            response[p] = {
                daily_used: quota?.[`${prefix}_daily_used`] || 0,
                daily_limit: dailyLimit,
                daily_resets_at: quota?.[`${prefix}_daily_reset`],
                locked: false,
                platform_unavailable: false
            };
        }
        response.plan = 'credit_system';
        response.paid_expires_at = null;
        quotaStatusCache.set(userId, response);
        res.setHeader('Cache-Control', 'private, max-age=10');
        res.json(response);
    }
    catch (error) {
        console.error('Quota status error:', error);
        res.status(500).json({ error: 'Failed to fetch quota status' });
    }
});
exports.default = router;
