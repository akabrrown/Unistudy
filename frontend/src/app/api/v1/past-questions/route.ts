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
    const searchParams = req.nextUrl.searchParams.toString();

    // 1. Attempt proxy fetch from Express backend if available
    if (token) {
      try {
        const targetUrl = `${BACKEND_URL}/api/v1/past-questions${searchParams ? `?${searchParams}` : ''}`;
        const res = await fetch(targetUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
          signal: AbortSignal.timeout(2000), // Quick timeout so fallback runs immediately
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            return NextResponse.json(data, {
              headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
              },
            });
          }
        }
      } catch {
        // Express backend unavailable, proceed to resilient native Supabase query
      }
    }

    // 2. Resilient Native Supabase Query:
    // Strictly retrieve courses created on this user's system to prevent course leaking
    const { data: userCourses, error: coursesError } = await supabase
      .from('courses')
      .select('id, course_code, title, colour')
      .eq('user_id', user.id);

    if (coursesError || !userCourses || userCourses.length === 0) {
      return NextResponse.json([]);
    }

    const userCourseIds = userCourses.map((c) => c.id);
    const userNormalizedCodes = userCourses.map((c) =>
      (c.course_code || c.title || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
    ).filter(Boolean);

    // Filter by specific courseId if query param supplied
    const queryCourseId = req.nextUrl.searchParams.get('courseId');
    const targetCourseIds = queryCourseId
      ? userCourseIds.filter((id) => id === queryCourseId)
      : userCourseIds;

    if (queryCourseId && targetCourseIds.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch past questions for the user's courses
    let papersQuery = supabase
      .from('past_papers')
      .select(`
        id,
        course_id,
        course_code,
        normalized_course_code,
        title,
        year,
        exam_type,
        status,
        created_at,
        courses(id, course_code, title, colour),
        past_paper_questions(id, question_number, text_content, extracted_topic, marks_available)
      `)
      .order('created_at', { ascending: false });

    if (targetCourseIds.length > 0) {
      papersQuery = papersQuery.in('course_id', targetCourseIds);
    }

    const { data: rawPapers, error: papersError } = await papersQuery;

    if (papersError) {
      console.error('[API /api/v1/past-questions] Query error:', papersError.message);
      return NextResponse.json({ error: papersError.message }, { status: 500 });
    }

    const formatted = (rawPapers || [])
      .filter((p: any) => {
        // Strictly ensure only papers matching user's created courses are returned
        if (p.course_id && targetCourseIds.includes(p.course_id)) return true;
        const pCode = (p.normalized_course_code || p.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        return pCode && userNormalizedCodes.includes(pCode);
      })
      .map((p: any) => {
        const courseJoin = Array.isArray(p.courses) ? p.courses[0] : p.courses;
        const matchingCourse = userCourses.find((c) => {
          if (p.course_id && p.course_id === c.id) return true;
          const pCode = (p.normalized_course_code || p.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          const cCode = (c.course_code || c.title || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          return pCode && cCode && (pCode === cCode || pCode.includes(cCode) || cCode.includes(pCode));
        });

        const resolvedCourse = matchingCourse || courseJoin;
        const questions = p.past_paper_questions || [];

        return {
          id: p.id,
          course_id: resolvedCourse?.id || p.course_id,
          course_code: p.course_code || resolvedCourse?.course_code || 'EXAM',
          normalized_course_code: p.normalized_course_code || (p.course_code || resolvedCourse?.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
          title: p.title || `${p.year || ''} ${p.exam_type === 'end-semester' ? 'Final Exam' : 'Midterm Exam'}`,
          year: p.year || new Date().getFullYear(),
          exam_type: p.exam_type || 'end-semester',
          status: p.status || 'ready',
          created_at: p.created_at,
          download_url: `/api/v1/past-questions/download?id=${p.id}`,
          courses: resolvedCourse ? {
            id: resolvedCourse.id,
            course_code: resolvedCourse.course_code,
            title: resolvedCourse.title,
            colour: resolvedCourse.colour,
          } : null,
          question_count: questions.length,
          questions: questions.map((q: any) => ({
            id: q.id,
            question: q.text_content,
            topic: q.extracted_topic,
            marks: q.marks_available,
          })),
        };
      });

    return NextResponse.json(formatted, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[API /api/v1/past-questions] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
  }
}
