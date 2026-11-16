import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const paperId = req.nextUrl.searchParams.get('id') || req.nextUrl.searchParams.get('paperId');

    if (!paperId) {
      return NextResponse.json({ error: 'Missing past question paper id (?id=...)' }, { status: 400 });
    }

    // 1. Try proxying to backend if available
    if (token) {
      try {
        const searchParams = req.nextUrl.searchParams.toString();
        const targetUrl = `${BACKEND_URL}/api/v1/past-questions/download${searchParams ? `?${searchParams}` : ''}`;
        const res = await fetch(targetUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(2000),
        });

        if (res.ok) {
          const contentType = res.headers.get('content-type') || 'application/json';
          if (contentType.includes('application/pdf')) {
            const arrayBuffer = await res.arrayBuffer();
            const headers = new Headers();
            headers.set('Content-Type', 'application/pdf');
            const disposition = res.headers.get('content-disposition');
            if (disposition) headers.set('Content-Disposition', disposition);
            return new NextResponse(arrayBuffer, { status: 200, headers });
          }
          const data = await res.json();
          return NextResponse.json(data);
        }
      } catch {
        // Fallback to Supabase
      }
    }

    // 2. Resilient Native Supabase fallback
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
        file_url,
        past_paper_questions(id, question_number, text_content, extracted_topic, marks_available)
      `)
      .eq('id', paperId)
      .maybeSingle();

    if (error || !paper) {
      return NextResponse.json({ error: 'Past question paper not found' }, { status: 404 });
    }

    const questions = paper.past_paper_questions || [];

    // Return structured downloadable exam paper
    return NextResponse.json({
      id: paper.id,
      title: paper.title,
      course_code: paper.course_code,
      year: paper.year,
      exam_type: paper.exam_type,
      file_url: paper.file_url,
      total_questions: questions.length,
      download_url: `/api/v1/past-questions/download?id=${paper.id}`,
      questions: questions.map((q: any) => ({
        question_number: q.question_number,
        topic: q.extracted_topic,
        marks: q.marks_available,
        text: q.text_content,
      })),
      formatted_content: questions
        .map((q: any) => `Question ${q.question_number} [${q.marks_available || 10} marks]\n${q.text_content}`)
        .join('\n\n----------------------------------------\n\n'),
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(paper.title || 'past-question')}.json"`,
      },
    });
  } catch (err: any) {
    console.error('[API /api/v1/past-questions/download] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
  }
}
