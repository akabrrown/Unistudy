import { NextRequest, NextResponse } from 'next/server';
import { getPublicSupabaseClient } from '@/lib/supabase/anon';
import { UPSA_INSTITUTION } from '@/lib/constants/upsa';

const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
};

export async function GET(req: NextRequest) {
  try {
    const supabase = getPublicSupabaseClient();

    const { data, error } = await supabase
      .from('institutions')
      .select('id, name, abbreviation, city, type')
      .or('abbreviation.eq.UPSA,name.ilike.%Professional Studies%')
      .limit(10);

    if (error || !data || data.length === 0) {
      return NextResponse.json([
        {
          id: UPSA_INSTITUTION.id,
          name: UPSA_INSTITUTION.name,
          abbreviation: UPSA_INSTITUTION.abbreviation,
          city: 'Accra',
          type: 'university'
        }
      ], { headers: PUBLIC_CACHE_HEADERS });
    }

    return NextResponse.json(data, { headers: PUBLIC_CACHE_HEADERS });
  } catch (err) {
    return NextResponse.json([
      {
        id: UPSA_INSTITUTION.id,
        name: UPSA_INSTITUTION.name,
        abbreviation: UPSA_INSTITUTION.abbreviation,
        city: 'Accra',
        type: 'university'
      }
    ], { headers: PUBLIC_CACHE_HEADERS });
  }
}
