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
    const webhookSecret = env_1.env.PAYSTACK_WEBHOOK_SECRET || env_1.env.PAYSTACK_SECRET_KEY;
    if (!webhookSecret) {
        console.error('Paystack webhook secret is not configured');
        return res.status(500).send('Webhook not configured');
    }
    const hash = crypto_1.default.createHmac('sha512', webhookSecret)
        .update(payloadBuffer)
        .digest('hex');
    const signature = req.headers['x-paystack-signature'];
    if (!signature ||
        typeof signature !== 'string' ||
        hash.length !== signature.length ||
        !crypto_1.default.timingSafeEqual(Buffer.from(hash, 'utf-8'), Buffer.from(signature, 'utf-8'))) {
        return res.status(401).send('Invalid signature');
    }
    try {
        const event = JSON.parse(payloadBuffer.toString('utf8'));
        if (event.event === 'charge.success') {
            const { reference, customer, metadata, amount } = event.data;
            if (metadata && (metadata.userId || metadata.user_id)) {
                const userId = metadata.userId || metadata.user_id;
                const plan = metadata.plan || 'pro';
                // Update profile
                await supabase_1.supabaseAdmin
                    .from('profiles')
                    .update({ plan: plan })
                    .eq('id', userId);
                // Record the transaction audit
                await supabase_1.supabaseAdmin
                    .from('payment_transactions')
                    .insert({
                    user_id: userId,
                    amount: amount,
                    status: 'success',
                    reference: reference
                });
            }
        }
        res.sendStatus(200);
    }
    catch (err) {
        console.error('Failed to parse Paystack webhook payload:', err);
        res.status(400).send('Bad Request');
    }
});
exports.default = router;
