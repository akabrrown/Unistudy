import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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

async function fetchKlokPapers(query?: string): Promise<any[]> {
  try {
    const url = new URL('/api/v1/past-questions', KLOK_BASE_URL);
    if (query) {
      url.searchParams.set('q', query);
    }
    const res = await fetch(url.toString(), {
      headers: {
        'x-klok-api-key': KLOK_API_KEY,
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || (Array.isArray(data) ? data : []);
  } catch (err: any) {
    console.warn(`[fetchKlokPapers] failed for query "${query}":`, err.message);
    return [];
  }
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

    // 1. Fetch user's enrolled courses from Supabase
    let userCourses: any[] = [];
    try {
      const { data } = await supabase
        .from('courses')
        .select('id, course_code, title, colour')
        .eq('user_id', user.id);
      if (data) userCourses = data;
    } catch (err: any) {
      console.warn('[API /api/v1/past-questions] courses fetch warning:', err.message);
    }

    // 2. Build search terms tailored to the user's courses
    const searchTerms: string[] = [];
    if (queryParam) {
      searchTerms.push(queryParam);
    } else if (courseIdParam) {
      const targetCourse = userCourses.find((c) => c.id === courseIdParam);
      if (targetCourse?.course_code) searchTerms.push(targetCourse.course_code);
      if (targetCourse?.title) searchTerms.push(targetCourse.title);
    } else if (userCourses.length > 0) {
      for (const c of userCourses) {
        if (c.course_code) {
          const codeClean = c.course_code.trim();
          searchTerms.push(codeClean);
          const noSpace = codeClean.replace(/\s+/g, '');
          if (noSpace !== codeClean && !searchTerms.includes(noSpace)) {
            searchTerms.push(noSpace);
          }
        }
        // Add subject keyword if course code didn't yield enough
        if (c.title) {
          const words = c.title
            .split(/[^a-zA-Z0-9]+/)
            .filter((w: string) => w.length > 4 && !['principles', 'introduction', 'studies', 'management', 'system'].includes(w.toLowerCase()));
          if (words.length > 0) {
            searchTerms.push(words[0]);
          }
        }
      }
    }

    // If no courses exist yet and no query, fetch default catalog
    if (searchTerms.length === 0) {
      searchTerms.push('');
    }

    // 3. Fetch from KLOK for user course terms in parallel (capped to max 6 terms)
    const uniqueTerms = Array.from(new Set(searchTerms)).slice(0, 6);
    const klokResults = await Promise.all(uniqueTerms.map((t) => fetchKlokPapers(t)));

    // Deduplicate KLOK items by ID
    const seenIds = new Set<string>();
    const allKlokItems: any[] = [];
    for (const items of klokResults) {
      for (const item of items) {
        if (item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          allKlokItems.push(item);
        }
      }
    }

    // 4. Map KLOK papers and associate them with matching user courses
    const klokPapers = allKlokItems.map((item: any) => {
      const rawName = item.name || item.filename || 'Past Examination Paper';
      const cleanTitle = rawName.replace(/\.pdf$/i, '');
      const paperCleanText = cleanTitle.toUpperCase().replace(/[^A-Z0-9]/g, '');

      // Find matching user course by course_code or title keywords
      const matchingCourse = userCourses.find((c) => {
        const cCode = (c.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (cCode && (paperCleanText.includes(cCode) || cCode.includes(paperCleanText))) {
          return true;
        }
        // Keyword match on course title (e.g. "Database", "Programming", "Leadership")
        const titleKeywords = (c.title || '')
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((w: string) => w.length > 4);
        const lowerName = cleanTitle.toLowerCase();
        return titleKeywords.some((kw: string) => lowerName.includes(kw));
      });

      const courseCode = matchingCourse?.course_code || extractCourseCode(cleanTitle);
      const isMidterm = cleanTitle.toLowerCase().includes('mid') || cleanTitle.toLowerCase().includes('interim');

      return {
        id: item.id,
        course_id: matchingCourse ? matchingCourse.id : null,
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
        courses: matchingCourse ? {
          id: matchingCourse.id,
          course_code: matchingCourse.course_code,
          title: matchingCourse.title,
          colour: matchingCourse.colour || '#00004E',
        } : {
          id: 'klok-official',
          course_code: courseCode,
          title: cleanTitle,
          colour: '#00004E',
        },
        question_count: 0,
        questions: [],
      };
    });

    // 5. Fetch custom uploaded papers from Supabase (if any)
    let localPapers: any[] = [];
    try {
      if (userCourses.length > 0) {
        const userCourseIds = userCourses.map((c) => c.id);
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
          .in('course_id', userCourseIds)
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
    } catch (dbErr: any) {
      console.warn('[API /api/v1/past-questions] Supabase local fetch warning:', dbErr.message);
    }

    // 6. Merge local custom papers + KLOK papers matched to user's courses
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
