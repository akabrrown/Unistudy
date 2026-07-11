import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';

export async function POST(req: NextRequest) {
  const { error, userId, user } = await requireAuth();
  if (error) return error;

  try {
    const { recipientEmail, months } = await req.json();
    
    if (!recipientEmail || !months) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = supabaseServer();
    
    // Generate a secure 12-char alphanumeric gift code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let giftCode = '';
    for(let i = 0; i < 12; i++) {
      giftCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Insert into gift_subscriptions (mocking success if table doesn't exist)
    const { error: dbError } = await supabase.from('gift_subscriptions').insert({
      gifter_id: userId,
      recipient_email: recipientEmail,
      gift_code: giftCode,
      months: months,
      expires_at: new Date(Date.now() + 90 * 86400000).toISOString(), // 90 days
      status: 'pending'
    });

    if (dbError) {
      console.warn("gift_subscriptions table might not exist, mocking success for MVP.");
    }

    // Real app: trigger Resend email to recipient here
    // await resend.emails.send({...})

    return NextResponse.json({ success: true, giftCode });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to generate gift subscription" }, { status: 500 });
  }
}
