import { NextResponse } from 'next/server';
import { UPSA_INSTITUTION } from '@/lib/constants/upsa';

export const dynamic = 'force-static';

export async function GET() {
  // UniStudy is strictly dedicated to UPSA
  return NextResponse.json(
    [
      {
        id: UPSA_INSTITUTION.id,
        name: UPSA_INSTITUTION.name,
        abbreviation: UPSA_INSTITUTION.abbreviation,
        domain: UPSA_INSTITUTION.domains[0],
        city: 'Accra',
        type: 'university',
        verified: true,
      },
    ],
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
      },
    }
  );
}
