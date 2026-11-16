import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UPSA_INSTITUTION } from '@/lib/constants/upsa';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

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
      ]);
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json([
      {
        id: UPSA_INSTITUTION.id,
        name: UPSA_INSTITUTION.name,
        abbreviation: UPSA_INSTITUTION.abbreviation,
        city: 'Accra',
        type: 'university'
      }
    ]);
  }
}
