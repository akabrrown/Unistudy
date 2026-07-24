import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { z } from 'zod';

export async function POST(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const { mood, sleepHours } = z.object({
      mood: z.number().int().min(1).max(5),
      sleepHours: z.number().min(0).max(24).optional(),
    }).parse(await req.json());
    
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];
    
    await supabase.from('mood_checkins').upsert({
      user_id: userId, 
      mood, 
      sleep_hours: sleepHours, 
      noted_at: today,
    }, { onConflict: 'user_id,noted_at' });
    
    // Burnout check: mood <= 2 for 3+ consecutive days
    const { data: recent } = await supabase.from('mood_checkins')
      .select('mood')
      .eq('user_id', userId!)
      .order('noted_at', { ascending: false })
      .limit(3);
      
    const burnoutRisk = (recent || []).length >= 3 && (recent || []).every(r => r.mood <= 2);
    
    return NextResponse.json({ ok: true, burnoutRisk });
  } catch (e) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;
  
  const supabase = await createClient();
  const { data } = await supabase.from('mood_checkins')
    .select('mood, sleep_hours, noted_at')
    .eq('user_id', userId!)
    .order('noted_at', { ascending: false })
    .limit(14);
    
  return NextResponse.json({ checkins: data || [] });
}
