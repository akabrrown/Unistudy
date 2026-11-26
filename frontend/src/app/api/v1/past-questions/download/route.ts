import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const KLOK_BASE_URL = process.env.KLOK_BASE_URL || 'https://kloksearch.vercel.app';
const KLOK_API_KEY = process.env.KLOK_API_KEY || 'klok_live_ddbeef2ccb5ed98dd45873c1d35060c4';

function extractCourseCode(name: string): string {
  if (!name) return 'EXAM';
  const m = name.match(/([A-Z]{3,4}\s*\d{3})/i);
  return m ? m[1].toUpperCase().replace(/\s+/, '') : 'EXAM';
}

function parseYear(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return new Date().getFullYear();
  const m = String(val).match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : new Date().getFullYear();
}

export async function GET(req: NextRequest) {
  try {
    const paperId = req.nextUrl.searchParams.get('id') || req.nextUrl.searchParams.get('paperId');

    if (!paperId) {
      return NextResponse.json({ error: 'Missing past question paper id (?id=...)' }, { status: 400 });
    }

    const supabase = await createClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paperId);
    let candidatePdfUrl: string | null = null;
    let paperTitle = 'past-question';
    let courseCodeHint = 'EXAM';
    let paperYear = new Date().getFullYear();

    // 1. If valid UUID, check Supabase past_papers and past_paper_pages
    if (isUuid) {
      try {
        const { data: paper } = await supabase
          .from('past_papers')
          .select('id, course_id, course_code, title, year, exam_type, status, past_paper_pages(image_url)')
          .eq('id', paperId)
          .maybeSingle();

        if (paper) {
          paperTitle = paper.title || paper.course_code || 'past-question';
          courseCodeHint = paper.course_code || extractCourseCode(paperTitle);
          paperYear = paper.year || parseYear(paperTitle);

          const pages = (paper as any).past_paper_pages;
          if (Array.isArray(pages) && pages.length > 0 && pages[0]?.image_url) {
            candidatePdfUrl = pages[0].image_url;
          }
        }
      } catch (dbErr: any) {
        console.warn('[download] Supabase lookup notice:', dbErr.message);
      }
    } else {
      // Decode potential base64 or raw slug
      let decoded = paperId;
      try {
        decoded = Buffer.from(paperId, 'base64').toString('utf-8');
      } catch (_) {}
      courseCodeHint = extractCourseCode(decoded);
      paperTitle = decoded.replace(/\.pdf$/i, '').trim();
      paperYear = parseYear(decoded);
    }

    // 2. If direct Cloudinary / Storage URL resolved, stream or redirect
    if (candidatePdfUrl) {
      try {
        const fileRes = await fetch(candidatePdfUrl);
        if (fileRes.ok) {
          const contentType = fileRes.headers.get('content-type') || 'application/pdf';
          const buffer = await fileRes.arrayBuffer();
          const headers = new Headers();
          headers.set('Content-Type', contentType);
          headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
          headers.set(
            'Content-Disposition',
            `inline; filename="${encodeURIComponent(paperTitle)}.pdf"`
          );
          return new NextResponse(buffer, { status: 200, headers });
        }
      } catch (streamErr: any) {
        console.warn('[download] Direct stream notice, redirecting:', streamErr.message);
      }
      return NextResponse.redirect(candidatePdfUrl);
    }

    // 3. Try KLOK Gateway using paperId directly (works for KLOK string IDs)
    if (!isUuid) {
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
          headers.set(
            'Content-Disposition',
            `inline; filename="${encodeURIComponent(paperTitle || 'past-question')}.pdf"`
          );
          return new NextResponse(arrayBuffer, { status: 200, headers });
        }
      } catch (klokErr: any) {
        console.warn('[download] KLOK direct download notice:', klokErr.message);
      }
    }

    // 4. Secondary fallback: Search KLOK by course code (e.g. BCPC201) and year (e.g. 2024)
    const searchTerms = [
      courseCodeHint !== 'EXAM' ? courseCodeHint : null,
      paperTitle !== 'past-question' ? paperTitle : null,
    ].filter(Boolean) as string[];

    for (const term of searchTerms) {
      try {
        const searchUrl = `${KLOK_BASE_URL}/api/v1/past-questions?q=${encodeURIComponent(term)}`;
        const sRes = await fetch(searchUrl, {
          headers: { 'x-klok-api-key': KLOK_API_KEY },
        });

        if (sRes.ok) {
          const sData = await sRes.json();
          const items: any[] = sData.items || (Array.isArray(sData) ? sData : []);
          if (items.length > 0) {
            // Find item matching the year if possible
            const matchingYear = items.find((it: any) => {
              const itYear = parseYear(it.name || it.year || '');
              return itYear === paperYear;
            });
            const bestItem = matchingYear || items[0];

            if (bestItem?.id) {
              const klokItemDownloadUrl = `${KLOK_BASE_URL}/api/v1/past-questions/download?id=${encodeURIComponent(bestItem.id)}&download=1`;
              const dRes = await fetch(klokItemDownloadUrl, {
                headers: { 'x-klok-api-key': KLOK_API_KEY },
              });

              if (dRes.ok) {
                const contentType = dRes.headers.get('content-type') || 'application/pdf';
                const arrayBuffer = await dRes.arrayBuffer();
                const headers = new Headers();
                headers.set('Content-Type', contentType);
                headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
                headers.set(
                  'Content-Disposition',
                  `inline; filename="${encodeURIComponent(paperTitle || bestItem.name || 'past-question')}.pdf"`
                );
                return new NextResponse(arrayBuffer, { status: 200, headers });
              }
            }
          }
        }
      } catch (searchErr: any) {
        console.warn('[download] KLOK search fallback notice:', searchErr.message);
      }
    }

    return NextResponse.json(
      { error: 'Past question paper document is currently unavailable for direct streaming.' },
      { status: 404 }
    );
  } catch (err: any) {
    console.error('[API /api/v1/past-questions/download] Fatal error:', err);
    return NextResponse.json({ error: 'Server error retrieving past question PDF' }, { status: 500 });
  }
}
