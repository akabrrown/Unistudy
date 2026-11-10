import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const limitParam = parseInt(searchParams.get('limit') || '100', 10);
  const limit = isNaN(limitParam) ? 100 : Math.min(Math.max(limitParam, 1), 200);
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const query = supabase
    .from('institutions')
    .select('id, name, abbreviation, city, type');
    
  if (q) {
    query.ilike('name', `%${q}%`);
  }

  const { data, error } = await query
    .order('name', { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
