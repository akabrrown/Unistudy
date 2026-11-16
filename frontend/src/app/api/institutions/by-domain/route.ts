import { NextResponse } from 'next/server';
import { UPSA_INSTITUTION, isUPSAEmail } from '@/lib/constants/upsa';

/**
 * GET /api/institutions/by-domain?domain=upsamail.edu.gh
 * In UniStudy, the single dedicated institution is UPSA.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain')?.toLowerCase() || '';

  const isUpsa = domain.includes('upsa') || domain.includes('upsamail') || domain.endsWith('.upsa.edu.gh');

  return NextResponse.json({
    found: true,
    isUpsaVerified: isUpsa,
    institution: {
      id: UPSA_INSTITUTION.id,
      name: UPSA_INSTITUTION.name,
      abbreviation: UPSA_INSTITUTION.abbreviation,
      domain: UPSA_INSTITUTION.domains[0]
    }
  });
}
