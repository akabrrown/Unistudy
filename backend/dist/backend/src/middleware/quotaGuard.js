"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAIQuota = withAIQuota;
const quota_1 = require("../lib/ai/quota");
function withAIQuota(feature) {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            // Extract model_tier from body or headers if present
            const modelTier = req.body?.model_tier || req.headers['x-model-tier'] || 'default';
            // We need user plan, we can fetch it, but better, quota check fetches it
            const quotaStatus = await (0, quota_1.checkUserQuota)(req.user.id, feature, modelTier);
            if (!quotaStatus.allowed) {
                return res.status(403).json({
                    error: 'quota_exceeded',
                    feature,
                    plan: 'payg',
                    used: quotaStatus.daily_used,
                    limit: quotaStatus.daily_limit,
                    balance: quotaStatus.wallet_balance,
                    cost: quotaStatus.cost,
                    message: quotaStatus.reason === 'limit_reached'
                        ? `Insufficient funds or daily limit reached for ${feature}.`
                        : `Feature currently unavailable: ${quotaStatus.reason}`
                });
            }
            // Attach quota info to request so route handlers know it passed
            req.quota = quotaStatus;
            next();
        }
        catch (error) {
            console.error('Quota check failed:', error);
            try {
                const fs = require('fs');
                fs.writeFileSync('quota_error.txt', `${new Date().toISOString()}\n${error.stack || error.message}`);
            }
            catch (_) { }
            res.status(500).json({
                error: 'Internal server error during quota validation',
                message: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
            });
        }
    };
}
