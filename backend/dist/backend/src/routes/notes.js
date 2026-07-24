"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
router.get('/:lectureId', async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase.from('slide_notes').select('*').eq('lecture_id', req.params.lectureId);
    if (error)
        return res.status(500).json({ error: error.message });
    res.json(data);
});
exports.default = router;
