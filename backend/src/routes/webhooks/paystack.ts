import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { supabaseAdmin } from '../../lib/supabase';
import { env } from '../../config/env';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  // express.raw() passes req.body as a Buffer
  const payloadBuffer = req.body as Buffer;
  
  const webhookSecret = env.PAYSTACK_WEBHOOK_SECRET || env.PAYSTACK_SECRET_KEY;
  if (!webhookSecret) {
    console.error('Paystack webhook secret is not configured');
    return res.status(500).send('Webhook not configured');
  }

  const hash = crypto.createHmac('sha512', webhookSecret)
    .update(payloadBuffer)
    .digest('hex');
  
  const signature = req.headers['x-paystack-signature'] as string;
  
  if (
    !signature ||
    typeof signature !== 'string' ||
    hash.length !== signature.length ||
    !crypto.timingSafeEqual(Buffer.from(hash, 'utf-8'), Buffer.from(signature, 'utf-8'))
  ) {
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
        await supabaseAdmin
          .from('profiles')
          .update({ plan: plan })
          .eq('id', userId);
          
        // Record the transaction audit
        await supabaseAdmin
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
  } catch (err) {
    console.error('Failed to parse Paystack webhook payload:', err);
    res.status(400).send('Bad Request');
  }
});

export default router;
