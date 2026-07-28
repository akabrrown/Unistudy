"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const supabase_1 = require("../../lib/supabase");
const env_1 = require("../../config/env");
const router = (0, express_1.Router)();
router.post('/', async (req, res) => {
    // express.raw() passes req.body as a Buffer
    const payloadBuffer = req.body;
    const hash = crypto_1.default.createHmac('sha512', env_1.env.PAYSTACK_WEBHOOK_SECRET || 'sk_test_mock_key')
        .update(payloadBuffer)
        .digest('hex');
    if (hash !== req.headers['x-paystack-signature']) {
        return res.status(401).send('Invalid signature');
    }
    const event = JSON.parse(payloadBuffer.toString('utf8'));
    if (event.event === 'charge.success') {
        const { reference, customer, metadata, amount } = event.data;
        // In metadata we expect to find the userId
        if (metadata && metadata.userId) {
            const plan = metadata.plan || 'pro';
            // Update profile
            await supabase_1.supabaseAdmin
                .from('profiles')
                .update({ plan: plan })
                .eq('id', metadata.userId);
            // Record the transaction audit
            await supabase_1.supabaseAdmin
                .from('payment_transactions')
                .insert({
                user_id: metadata.userId,
                amount: amount,
                status: 'success',
                reference: reference
            });
        }
    }
    res.sendStatus(200);
});
exports.default = router;
