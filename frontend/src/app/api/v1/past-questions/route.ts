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
    const targetUrl = `${BACKEND_URL}/api/v1/past-questions${searchParams ? `?${searchParams}` : ''}`;

    const res = await fetch(targetUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('[API /api/v1/past-questions] Proxy Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
  }
}
