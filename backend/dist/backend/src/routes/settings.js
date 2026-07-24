"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../config/supabase");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
// GET /api/settings/accessibility
router.get('/accessibility', async (req, res) => {
    try {
        const { data, error } = await supabase_1.supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', req.user.id)
            .single();
        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching settings:', error);
            return res.status(500).json({ error: error.message });
        }
        if (!data) {
            // Create default settings if not exists (should be handled by trigger, but as fallback)
            const { data: newData, error: insertError } = await supabase_1.supabase
                .from('user_settings')
                .insert({ user_id: req.user.id })
                .select('*')
                .single();
            if (insertError) {
                return res.status(500).json({ error: insertError.message });
            }
            return res.json({ settings: newData });
        }
        res.json({ settings: data });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// PATCH /api/settings/accessibility
router.patch('/accessibility', async (req, res) => {
    try {
        const updates = req.body;
        // Ensure we don't update user_id
        delete updates.user_id;
        delete updates.created_at;
        const { data, error } = await supabase_1.supabase
            .from('user_settings')
            .update(updates)
            .eq('user_id', req.user.id)
            .select('*')
            .single();
        if (error) {
            console.error('Error updating settings:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json({ settings: data });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
