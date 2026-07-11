import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    // Note: To fully integrate with Paystack's Subscription Disable API,
    // we would need to store the Paystack `subscription_code` and `email_token` in our database.
    // For this demonstration, we are simulating the cancellation natively in our app
    // by immediately reverting the user's plan to 'free'.
    // If you add subscriptions API to Paystack later, you would fetch it here:
    // https://api.paystack.co/subscription/disable

    const supabase = supabaseServer();
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ plan: 'free' })
      .eq('id', userId!);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, message: 'Subscription cancelled successfully' });
  } catch (err: any) {
    console.error('Cancel Subscription Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
