import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const supabase = supabaseServer();
    const { data, error: dbError } = await supabase
      .from('profiles')
      .select('id, full_name, total_xp, level, university')
      .order('total_xp', { ascending: false })
      .limit(50);

    if (dbError) throw dbError;

    return NextResponse.json({ leaderboard: data || [] });
  } catch (err: any) {
    console.error('Leaderboard Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
