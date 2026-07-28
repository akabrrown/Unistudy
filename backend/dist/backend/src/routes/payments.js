"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const env_1 = require("../config/env");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
const CheckoutSchema = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    credits: zod_1.z.number().positive(),
    type: zod_1.z.literal('credit_topup').optional().default('credit_topup')
});
router.post('/checkout', auth_1.authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const email = req.user.email;
        const parseResult = CheckoutSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: 'Invalid payload', details: parseResult.error.format() });
        }
        const { amount, credits, type } = parseResult.data;
        const amountInPesewas = amount * 100; // Convert GHS to pesewas
        // Ensure we have a valid site URL for callback
        const baseUrl = env_1.env.FRONTEND_URL || 'http://localhost:3000';
        const params = {
            email,
            amount: amountInPesewas,
            currency: 'GHS',
            callback_url: `${baseUrl}/dashboard?payment=success`,
            metadata: {
                userId,
                type,
                credits: credits.toString()
            }
        };
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env_1.env.PAYSTACK_SECRET_KEY || 'sk_test_mock_key'}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to initialize Paystack transaction');
        }
        res.json({ url: data.data.authorization_url });
    }
    catch (error) {
        console.error('Checkout Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
router.post('/cancel', auth_1.authenticateUser, async (req, res) => {
    try {
        const userId = req.user.id;
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Missing token' });
        }
        const supabase = (0, supabase_1.supabaseAsUser)(token);
        // Simulating cancellation natively in our app
        const { error: dbError } = await supabase
            .from('profiles')
            .update({ plan: 'free' })
            .eq('id', userId);
        if (dbError)
            throw dbError;
        res.json({ success: true, message: 'Subscription cancelled successfully' });
    }
    catch (error) {
        console.error('Cancel Subscription Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
router.post('/portal', auth_1.authenticateUser, async (req, res) => {
    try {
        // Paystack doesn't have a direct "billing portal" like Stripe.
        // Return to dashboard for now, or redirect to a native manage-subscription page.
        const baseUrl = env_1.env.FRONTEND_URL || 'http://localhost:3000';
        res.json({ url: `${baseUrl}/dashboard/settings/billing` });
    }
    catch (error) {
        console.error('Portal Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
// Placeholder for upgrading subscription (future implementation)
router.post('/upgrade', auth_1.authenticateUser, async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token)
            return res.status(401).json({ error: 'Missing token' });
        const supabase = (0, supabase_1.supabaseAsUser)(token);
        const UpgradeSchema = zod_1.z.object({
            plan: zod_1.z.enum(['pro', 'ultra', 'starter']).default('pro')
        });
        const result = UpgradeSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: 'Invalid payload', details: result.error.format() });
        }
        const { plan } = result.data;
        const { error: dbError } = await supabase
            .from('profiles')
            .update({ plan })
            .eq('id', req.user.id);
        if (dbError)
            throw dbError;
        res.json({ success: true, message: `Plan upgraded to ${plan}` });
    }
    catch (error) {
        console.error('Upgrade Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
// Placeholder for referral rewards endpoint
router.post('/referral', auth_1.authenticateUser, async (req, res) => {
    try {
        // Generate a 8‑character alphanumeric referral code
        const code = crypto_1.default.randomBytes(4).toString('hex');
        const { error: dbError } = await supabase_1.supabaseAdmin
            .from('referrals')
            .insert({ user_id: req.user.id, code, created_at: new Date().toISOString() });
        if (dbError)
            throw dbError;
        res.json({ success: true, referralCode: code });
    }
    catch (error) {
        console.error('Referral Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
// Placeholder for gifting a subscription to another user
router.post('/gift', auth_1.authenticateUser, async (req, res) => {
    try {
        const GiftSchema = zod_1.z.object({
            recipientEmail: zod_1.z.string().email(),
            plan: zod_1.z.enum(['pro', 'ultra', 'starter']).default('pro')
        });
        const result = GiftSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: 'Invalid payload', details: result.error.format() });
        }
        const { recipientEmail, plan } = result.data;
        // Find recipient user id via admin client
        const { data: userData, error: userError } = await supabase_1.supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', recipientEmail)
            .single();
        if (userError || !userData) {
            return res.status(404).json({ error: 'Recipient not found' });
        }
        const recipientId = userData.id;
        // Update recipient's plan
        const { error: updateError } = await supabase_1.supabaseAdmin
            .from('profiles')
            .update({ plan })
            .eq('id', recipientId);
        if (updateError)
            throw updateError;
        // Record transaction as a gift
        await supabase_1.supabaseAdmin.from('payment_transactions').insert({
            user_id: recipientId,
            amount: 0,
            status: 'gift',
            reference: `gift-${req.user.id}-${Date.now()}`
        });
        // Optionally notify recipient (placeholder)
        res.json({ success: true, message: `Gifted ${plan} plan to ${recipientEmail}` });
    }
    catch (error) {
        console.error('Gift Error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});
exports.default = router;
