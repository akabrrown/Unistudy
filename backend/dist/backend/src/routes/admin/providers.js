"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const balance_1 = require("../../lib/ai/balance");
const supabase_1 = require("../../lib/supabase");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
router.use(async (req, res, next) => {
    try {
        const { data: profile } = await supabase_1.supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', req.user.id)
            .single();
        if (!profile || profile.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    }
    catch (err) {
        return res.status(403).json({ error: 'Admin access required' });
    }
});
router.get('/', async (req, res) => {
    try {
        const statuses = await (0, balance_1.getAllProviderStatuses)();
        res.json(statuses);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.patch('/:provider', async (req, res) => {
    const { provider } = req.params;
    const updates = req.body;
    try {
        const { data, error } = await supabase_1.supabaseAdmin
            .from('platform_ai_balance')
            .update(updates)
            .eq('provider', provider)
            .select()
            .single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
