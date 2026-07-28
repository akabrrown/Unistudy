"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
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
        const { data, error } = await supabase_1.supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }).limit(100);
        if (error)
            throw error;
        res.json({ users: data });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/:userId/quota', async (req, res) => {
    try {
        const { data, error } = await supabase_1.supabaseAdmin.from('user_quota').select('*').eq('user_id', req.params.userId).single();
        if (error)
            throw error;
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
