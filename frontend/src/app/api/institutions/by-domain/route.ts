import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/institutions/by-domain?domain=example.edu.gh
 * Returns the institution that matches the given email domain.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain')?.toLowerCase();

  if (!domain) {
    return NextResponse.json({ error: 'Domain query parameter is required' }, { status: 400 });
  }

  const supabase = await createClient();
  let { data, error } = await supabase
    .from('institutions')
    .select('id, name, domain')
    .eq('domain', domain)
    .maybeSingle();

  // If exact match fails, try fuzzy matching based on common student email patterns
  if (!data && !error) {
    let prefix = domain.split('.')[0];
    if (prefix === 'st' || prefix === 'student' || prefix === 'students') {
      prefix = domain.split('.')[1]; // e.g. st.knust.edu.gh -> knust
    } else if (prefix === 'upsamail') {
      prefix = 'upsa';
    }

    if (prefix) {
      const { data: fuzzyData, error: fuzzyError } = await supabase
        .from('institutions')
        .select('id, name, domain')
        .ilike('abbreviation', prefix)
        .limit(1)
        .maybeSingle();
      
      data = fuzzyData;
      error = fuzzyError;
    }
  }

  if (error) {
    console.error('Error fetching institution by domain', error);
    return NextResponse.json({ error: 'Failed to fetch institution' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ found: false }, { status: 200 });
  }

  return NextResponse.json({ found: true, institution: data }, { status: 200 });
}
