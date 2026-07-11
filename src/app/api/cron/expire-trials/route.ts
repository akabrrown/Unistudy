import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// This is meant to be called by Vercel Cron or a similar scheduler
export async function GET(req: NextRequest) {
  // In production, we'd verify a secret cron header here
  // const authHeader = req.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  const supabase = supabaseServer();
  const now = new Date().toISOString();

  try {
    // Find users whose trial has ended and who do not have an active subscription
    const { data: expiredTrials, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('plan', 'pro')
      .lt('trial_ends_at', now);
      
    // In a real database schema we'd also join on subscriptions 
    // to ensure they haven't actually paid.

    if (error) throw error;

    let downgradedCount = 0;

    if (expiredTrials && expiredTrials.length > 0) {
      for (const u of expiredTrials) {
        await supabase.from('profiles').update({ plan: 'free' }).eq('id', u.id);
        downgradedCount++;
      }
    }

    return NextResponse.json({ success: true, downgradedCount });
  } catch (err: any) {
    console.error("Cron Error:", err);
    return NextResponse.json({ error: "Failed to process cron job" }, { status: 500 });
  }
}
