import { NextRequest, NextResponse } from 'next/server';
import { getPublicSupabaseClient } from '@/lib/supabase/anon';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  const supabase = getPublicSupabaseClient();

  const query = supabase
    .from('course_programmes')
    .select('id, name, field, level');
    
  if (q) {
    query.ilike('name', `%${q}%`);
  }

  const { data, error } = await query
    .order('name', { ascending: true })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
    },
  });
}
