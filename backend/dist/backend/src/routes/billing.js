"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
router.get('/subscription', auth_1.authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Missing token' });
        }
        const supabase = (0, supabase_1.supabaseAsUser)(token);
        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select('plan_id, status, current_period_end, cancel_at')
            .eq('user_id', userId)
            .single();
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        res.json({
            subscription: subscription || {
                plan_id: 'free',
                status: 'active',
                current_period_end: null
            }
        });
    }
    catch (error) {
        console.error('Get Subscription Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
exports.default = router;
