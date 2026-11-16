import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = session.access_token;
    const searchParams = req.nextUrl.searchParams.toString();
    const targetUrl = `${BACKEND_URL}/api/v1/past-questions/download${searchParams ? `?${searchParams}` : ''}`;

    const res = await fetch(targetUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    const contentType = res.headers.get('content-type') || 'application/json';

    if (contentType.includes('application/pdf')) {
      const arrayBuffer = await res.arrayBuffer();
      const headers = new Headers();
      headers.set('Content-Type', 'application/pdf');
      const disposition = res.headers.get('content-disposition');
      if (disposition) {
        headers.set('Content-Disposition', disposition);
      }
      return new NextResponse(arrayBuffer, { status: 200, headers });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('[API /api/v1/past-questions/download] Proxy Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
  }
}
