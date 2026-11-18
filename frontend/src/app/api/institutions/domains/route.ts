import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export async function GET() {
  const domains = [
    'upsamail.edu.gh',
    'st.ug.edu.gh',
    'knust.edu.gh',
    'ucc.edu.gh',
    'ashesi.edu.gh',
    'gimpa.edu.gh',
  ];

  return NextResponse.json(
    { domains },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
      },
    }
  );
}
