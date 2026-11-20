import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005';
const KLOK_BASE_URL = process.env.KLOK_BASE_URL || 'https://kloksearch.vercel.app';
const KLOK_API_KEY = process.env.KLOK_API_KEY || 'klok_live_ddbeef2ccb5ed98dd45873c1d35060c4';

function extractCourseCode(name: string): string {
  if (!name) return 'EXAM';
  const m = name.match(/([A-Z]{3,4}\s*\d{3})/i);
  return m ? m[1].toUpperCase().replace(/\s+/, ' ') : 'EXAM';
}

function parseYear(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return new Date().getFullYear();
  const m = String(val).match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : new Date().getFullYear();
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const queryParam = searchParams.get('q') || searchParams.get('search') || '';
    const courseIdParam = searchParams.get('courseId');

    // 1. Fetch live official past papers from KLOK API
    let klokPapers: any[] = [];
    try {
      const klokUrl = new URL('/api/v1/past-questions', KLOK_BASE_URL);
      if (queryParam) {
        klokUrl.searchParams.set('q', queryParam);
      }

      const klokRes = await fetch(klokUrl.toString(), {
        headers: {
          'x-klok-api-key': KLOK_API_KEY,
        },
        next: { revalidate: 300 }, // Cache 5 min
      });

      if (klokRes.ok) {
        const klokData = await klokRes.json();
        const items = klokData.items || (Array.isArray(klokData) ? klokData : []);

        klokPapers = items.map((item: any) => {
          const rawName = item.name || item.filename || 'Past Examination Paper';
          const cleanTitle = rawName.replace(/\.pdf$/i, '');
          const courseCode = extractCourseCode(cleanTitle);
          const isMidterm = cleanTitle.toLowerCase().includes('mid') || cleanTitle.toLowerCase().includes('interim');

          return {
            id: item.id,
            course_id: null,
            course_code: courseCode,
            normalized_course_code: courseCode.replace(/[^A-Z0-9]/g, ''),
            title: cleanTitle,
            year: parseYear(item.year || cleanTitle),
            exam_type: isMidterm ? 'mid-semester' : 'end-semester',
            status: 'ready',
            created_at: new Date(item.timemodified ? item.timemodified * 1000 : Date.now()).toISOString(),
            download_url: `/api/v1/past-questions/download?id=${encodeURIComponent(item.id)}`,
            filesize: item.filesize,
            source: 'klok',
            courses: {
              id: 'klok-official',
              course_code: courseCode,
              title: cleanTitle,
              colour: '#00004E', // UPSA Deep Navy
            },
            question_count: 0,
            questions: [],
          };
        });
      }
    } catch (klokErr: any) {
      console.warn('[API /api/v1/past-questions] KLOK fetch notice:', klokErr.message);
    }

    // 2. Fetch user's local courses & custom uploaded papers from Supabase
    let localPapers: any[] = [];
    try {
      const { data: userCourses } = await supabase
        .from('courses')
        .select('id, course_code, title, colour')
        .eq('user_id', user.id);

      if (userCourses && userCourses.length > 0) {
        const userCourseIds = userCourses.map((c) => c.id);
        const userNormalizedCodes = userCourses.map((c) =>
          (c.course_code || c.title || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
        ).filter(Boolean);

        const targetCourseIds = courseIdParam
          ? userCourseIds.filter((id) => id === courseIdParam)
          : userCourseIds;

        if (targetCourseIds.length > 0) {
          const { data: rawPapers } = await supabase
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
            .in('course_id', targetCourseIds)
            .order('created_at', { ascending: false });

          if (rawPapers) {
            localPapers = rawPapers.map((p: any) => {
              const courseJoin = Array.isArray(p.courses) ? p.courses[0] : p.courses;
              const matchingCourse = userCourses.find((c) => c.id === p.course_id);
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
                source: 'supabase',
              };
            });
          }
        }
      }
    } catch (dbErr: any) {
      console.warn('[API /api/v1/past-questions] Supabase fetch notice:', dbErr.message);
    }

    // 3. Merge: Local user papers first, followed by KLOK campus library papers
    const combined = [...localPapers, ...klokPapers];

    return NextResponse.json(combined, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err: any) {
    console.error('[API /api/v1/past-questions] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
  }
}
