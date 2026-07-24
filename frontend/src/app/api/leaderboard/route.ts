import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error: dbError } = await adminSupabase
      .from('profiles')
      .select('id, full_name, username, total_xp, university, year_of_study, degree_programme, institutions(name)')
      .order('total_xp', { ascending: false })
      .limit(50);

    if (dbError) throw dbError;

    const mappedData = data?.map((user: any) => ({
      ...user,
      university: user.institutions?.name || user.university
    })) || [];

    return NextResponse.json({ leaderboard: mappedData });
  } catch (err: any) {
    console.error('Leaderboard Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
