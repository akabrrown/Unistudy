"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../../lib/supabase");
const router = (0, express_1.Router)();
router.post('/', async (req, res) => {
    // Add Mux webhook signature verification here using Mux SDK if needed
    const event = req.body;
    if (event.type === 'video.asset.ready') {
        const assetId = event.data.id;
        const playbackId = event.data.playback_ids[0].id;
        // Update lecture with Mux playback ID
        await supabase_1.supabaseAdmin
            .from('lectures')
            .update({
            mux_playback_id: playbackId,
            status: 'ready'
        })
            .eq('mux_asset_id', assetId);
    }
    res.sendStatus(200);
});
exports.default = router;
