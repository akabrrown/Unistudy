import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/adminGuard';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { error, userId, user } = await requireAuth();
  if (error) return error;

  try {
    const { plan } = await req.json();

    if (!plan || plan !== 'pro') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Amount in pesewas (e.g. 50 GHS = 5000 pesewas)
    const amount = 5000; 
    
    // Hardcode a default URL for development if NEXT_PUBLIC_SITE_URL is missing
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    const params = {
      email: user.email,
      amount: amount,
      currency: 'GHS',
      callback_url: `${baseUrl}/dashboard?payment=success`,
      metadata: {
        userId: userId,
        plan: plan
      }
    };

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY || 'sk_test_mock_key'}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to initialize Paystack transaction');
    }

    // Return the checkout URL from Paystack
    return NextResponse.json({ url: data.data.authorization_url });

  } catch (err: any) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
