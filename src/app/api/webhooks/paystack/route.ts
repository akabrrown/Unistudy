import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing Paystack Signature' }, { status: 400 });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY || 'sk_test_mock_key';
    const expectedSignature = crypto
      .createHmac('sha512', secret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      // In development mode with mock keys, we might bypass strict signature checking if we are just testing
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Invalid Paystack Signature' }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);

    if (event.event === 'charge.success') {
      const { metadata } = event.data;
      const userId = metadata?.userId;
      
      if (userId) {
        const supabase = supabaseServer();
        // Upgrade user to pro
        const { error: dbError } = await supabase
          .from('profiles')
          .update({ plan: 'pro' })
          .eq('id', userId);
          
        if (dbError) throw dbError;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Paystack webhook error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
