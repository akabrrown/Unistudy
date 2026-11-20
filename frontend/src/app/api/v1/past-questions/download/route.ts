import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const KLOK_BASE_URL = process.env.KLOK_BASE_URL || 'https://kloksearch.vercel.app';
const KLOK_API_KEY = process.env.KLOK_API_KEY || 'klok_live_ddbeef2ccb5ed98dd45873c1d35060c4';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const paperId = req.nextUrl.searchParams.get('id') || req.nextUrl.searchParams.get('paperId');

    if (!paperId) {
      return NextResponse.json({ error: 'Missing past question paper id (?id=...)' }, { status: 400 });
    }

    // 1. Check if this is a KLOK paper ID (base64 encoded string from KLOK)
    const isKlokId = paperId.startsWith('L0') || !paperId.includes('-') || paperId.length > 50;

    if (isKlokId) {
      try {
        const klokDownloadUrl = `${KLOK_BASE_URL}/api/v1/past-questions/download?id=${encodeURIComponent(paperId)}&download=1`;
        const klokRes = await fetch(klokDownloadUrl, {
          headers: {
            'x-klok-api-key': KLOK_API_KEY,
          },
        });

        if (klokRes.ok) {
          const contentType = klokRes.headers.get('content-type') || 'application/pdf';
          const arrayBuffer = await klokRes.arrayBuffer();
          const headers = new Headers();
          headers.set('Content-Type', contentType);
          headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

          const disposition = klokRes.headers.get('content-disposition') || `inline; filename="past-question-${encodeURIComponent(paperId)}.pdf"`;
          headers.set('Content-Disposition', disposition);

          return new NextResponse(arrayBuffer, { status: 200, headers });
        }
      } catch (klokErr: any) {
        console.warn('[API /api/v1/past-questions/download] KLOK download notice:', klokErr.message);
      }
    }

    // 2. Fallback to Supabase past_papers database
    const { data: paper, error } = await supabase
      .from('past_papers')
      .select(`
        id,
        course_id,
        course_code,
        title,
        year,
        exam_type,
        status,
        file_url
      `)
      .eq('id', paperId)
      .maybeSingle();

    if (paper?.file_url) {
      const fileRes = await fetch(paper.file_url);
      if (fileRes.ok) {
        const buffer = await fileRes.arrayBuffer();
        const headers = new Headers();
        headers.set('Content-Type', 'application/pdf');
        headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(paper.title || 'past-question')}.pdf"`);
        return new NextResponse(buffer, { status: 200, headers });
      }
    }

    // 3. If still not found and not tried KLOK yet, attempt KLOK as fallback
    if (!isKlokId) {
      try {
        const klokDownloadUrl = `${KLOK_BASE_URL}/api/v1/past-questions/download?id=${encodeURIComponent(paperId)}&download=1`;
        const klokRes = await fetch(klokDownloadUrl, {
          headers: {
            'x-klok-api-key': KLOK_API_KEY,
          },
        });

        if (klokRes.ok) {
          const contentType = klokRes.headers.get('content-type') || 'application/pdf';
          const arrayBuffer = await klokRes.arrayBuffer();
          const headers = new Headers();
          headers.set('Content-Type', contentType);
          const disposition = klokRes.headers.get('content-disposition') || `inline; filename="past-question-${encodeURIComponent(paperId)}.pdf"`;
          headers.set('Content-Disposition', disposition);
          return new NextResponse(arrayBuffer, { status: 200, headers });
        }
      } catch (_) {}
    }

    return NextResponse.json({ error: 'Past question paper not found' }, { status: 404 });
  } catch (err: any) {
    console.error('[API /api/v1/past-questions/download] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
  }
}
