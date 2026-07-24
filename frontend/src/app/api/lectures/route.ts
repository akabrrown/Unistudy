import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const supabase = await createClient();

    const { data: lectures, error: fetchErr } = await supabase
      .from('lectures')
      .select('id, title, created_at')
      .eq('user_id', userId!)
      .order('created_at', { ascending: false });

    if (fetchErr) throw fetchErr;

    return NextResponse.json({ lectures: lectures || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
