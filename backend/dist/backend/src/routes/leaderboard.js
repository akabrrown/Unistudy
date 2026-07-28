"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../lib/supabase");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const node_cache_1 = __importDefault(require("node-cache"));
const router = (0, express_1.Router)();
const leaderboardCache = new node_cache_1.default({ stdTTL: 60 }); // 60 seconds TTL
const leaderboardRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many requests to leaderboard, please try again later.'
});
router.get('/', auth_1.authenticateUser, leaderboardRateLimit, async (req, res) => {
    try {
        const cachedData = leaderboardCache.get('leaderboard');
        if (cachedData) {
            return res.json({ data: cachedData, cached: true });
        }
        const { data, error } = await supabase_1.supabaseAdmin
            .from('profiles')
            .select('id, username, full_name, avatar_url, total_xp, study_streak')
            .order('total_xp', { ascending: false })
            .limit(50);
        if (error)
            throw error;
        leaderboardCache.set('leaderboard', data);
        res.json({ data, cached: false });
    }
    catch (err) {
        console.error('Leaderboard fetch error:', err);
        res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
});
exports.default = router;
