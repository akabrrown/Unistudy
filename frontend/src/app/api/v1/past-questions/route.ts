import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchKlokPapers, getServiceSupabase } from '@/lib/past-papers/ingestion';
import {
  normalizePastPaperTitle,
  isUidString,
  extractCourseCode,
  resolveDisplayCourseCode,
} from '@/lib/past-papers/titleNormalizer';

export const dynamic = 'force-dynamic';

function parseYear(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return new Date().getFullYear();
  const m = String(val).match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : new Date().getFullYear();
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const queryParam = (searchParams.get('q') || searchParams.get('search') || '').trim();
    const courseIdParam = searchParams.get('courseId');
    const isGlobalSearch = Boolean(queryParam);

    // 1. Fetch user's registered courses from Supabase
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

    const userCourseIds = userCourses.map((c) => c.id).filter(Boolean);
    const userNormalizedCodes = userCourses
      .map((c) => (c.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''))
      .filter(Boolean);

    // 2. Query Central Past Question Bank from Supabase (Fast DB-First: <40ms)
    let localPapers: any[] = [];
    try {
      let query = supabase
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
          past_paper_questions(id, question_number, text_content, extracted_topic, marks_available),
          past_paper_pages(id, image_url)
        `);

      if (isGlobalSearch) {
        // GLOBAL SEARCH across all papers in the university repository
        const cleanQ = queryParam.replace(/[^a-zA-Z0-9\s]/g, '').trim();
        const normQ = cleanQ.replace(/\s+/g, '').toUpperCase();
        query = query.or(
          `title.ilike.%${cleanQ}%,course_code.ilike.%${cleanQ}%,normalized_course_code.ilike.%${normQ}%`
        );
      } else if (courseIdParam) {
        const targetCourse = userCourses.find((c) => c.id === courseIdParam);
        const targetNorm = targetCourse?.course_code
          ? targetCourse.course_code.toUpperCase().replace(/[^A-Z0-9]/g, '')
          : null;
        if (targetNorm) {
          query = query.or(`course_id.eq.${courseIdParam},normalized_course_code.eq.${targetNorm}`);
        } else {
          query = query.eq('course_id', courseIdParam);
        }
      } else if (userCourses.length > 0) {
        // Include user's enrolled courses by ID, by normalized code, or papers uploaded by user
        const filters: string[] = [];
        if (userCourseIds.length > 0) {
          filters.push(`course_id.in.(${userCourseIds.join(',')})`);
        }
        if (userNormalizedCodes.length > 0) {
          filters.push(`normalized_course_code.in.(${userNormalizedCodes.join(',')})`);
        }
        filters.push(`user_id.eq.${user.id}`);
        query = query.or(filters.join(','));
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data: rawPapers, error: dbError } = await query
        .order('year', { ascending: false })
        .order('created_at', { ascending: false });

      if (dbError) {
        console.warn('[API /api/v1/past-questions] Supabase query notice:', dbError.message);
      }

      if (rawPapers && rawPapers.length > 0) {
        // Fetch any missing course records via service client if unjoined
        const missingCourseIds = Array.from(
          new Set(
            rawPapers
              .map((p: any) => p.course_id)
              .filter((id: any) => Boolean(id) && !userCourses.some((c: any) => c.id === id))
          )
        );

        let extraCoursesMap = new Map<string, any>();
        if (missingCourseIds.length > 0) {
          const serviceSupabase = getServiceSupabase();
          if (serviceSupabase) {
            try {
              const { data: extraCourses } = await serviceSupabase
                .from('courses')
                .select('id, course_code, title, colour')
                .in('id', missingCourseIds);
              if (extraCourses) {
                for (const ec of extraCourses) {
                  extraCoursesMap.set(ec.id, ec);
                }
              }
            } catch (adminErr) {
              console.warn('[API /api/v1/past-questions] Service courses fetch notice:', adminErr);
            }
          }
        }

        localPapers = rawPapers.map((p: any) => {
          const courseJoin = Array.isArray(p.courses) ? p.courses[0] : p.courses;
          const matchingCourse =
            userCourses.find((c) => c.id === p.course_id) || extraCoursesMap.get(p.course_id);
          const resolvedCourse = matchingCourse || courseJoin;
          const questions = p.past_paper_questions || [];
          const pages = p.past_paper_pages || [];
          const primaryFileUrl = pages.length > 0 ? pages[0]?.image_url : null;

          const safeCode = resolveDisplayCourseCode({
            courseCode: p.course_code,
            joinedCourseCode: resolvedCourse?.course_code,
            normalizedCode: p.normalized_course_code,
            paperTitle: p.title,
            courseTitle: resolvedCourse?.title,
            fallback: 'EXAM',
          });

          // Self-heal background update if the record was previously stored with a raw UUID in course_code
          if (isUidString(p.course_code) && safeCode !== 'EXAM') {
            void supabase
              .from('past_papers')
              .update({
                course_code: safeCode,
                normalized_course_code: safeCode.replace(/[^A-Z0-9]/g, ''),
              })
              .eq('id', p.id);
          }

          return {
            id: p.id,
            course_id: resolvedCourse?.id || p.course_id,
            course_code: safeCode,
            normalized_course_code: safeCode.replace(/[^A-Z0-9]/g, ''),
            title:
              p.title ||
              `${p.year || ''} ${p.exam_type === 'end-semester' ? 'Final Exam' : 'Midterm Exam'}`,
            year: p.year || new Date().getFullYear(),
            exam_type: p.exam_type || 'end-semester',
            status: p.status || 'ready',
            created_at: p.created_at,
            download_url: `/api/v1/past-questions/download?id=${p.id}`,
            file_url: primaryFileUrl,
            courses: resolvedCourse
              ? {
                  id: resolvedCourse.id,
                  course_code: safeCode,
                  title: resolvedCourse.title,
                  colour: resolvedCourse.colour || '#00004E',
                }
              : {
                  id: p.course_id || null,
                  course_code: safeCode,
                  title: p.title || 'Past Examination Paper',
                  colour: '#00004E',
                  isCentral: true,
                },
            question_count: questions.length,
            questions: questions.map((q: any) => ({
              id: q.id,
              question: q.text_content,
              topic: q.extracted_topic,
              marks: q.marks_available,
            })),
            source: 'bank',
          };
        });
      }
    } catch (dbErr: any) {
      console.warn('[API /api/v1/past-questions] Supabase local fetch warning:', dbErr.message);
    }

    // 3. Fallback Discovery ONLY for Global Search with 0 local matches
    // In normal course browsing, we NEVER query KLOK synchronously.
    let externalDiscoveredPapers: any[] = [];
    if (isGlobalSearch && localPapers.length === 0) {
      try {
        const klokItems = await fetchKlokPapers(queryParam);
        for (const item of klokItems.slice(0, 10)) {
          const rawName =
            item.name || item.filename || item.title || item.id || 'Past Examination Paper';
          const cleanTitle = normalizePastPaperTitle(rawName);
          const detectedCode = extractCourseCode(cleanTitle) || 'EXAM';
          const isMidterm =
            cleanTitle.toLowerCase().includes('mid') || cleanTitle.toLowerCase().includes('interim');

          externalDiscoveredPapers.push({
            id: item.id,
            course_id: null,
            course_code: detectedCode,
            normalized_course_code: detectedCode.replace(/[^A-Z0-9]/g, ''),
            title: cleanTitle,
            year: parseYear(item.year || cleanTitle),
            exam_type: isMidterm ? 'mid-semester' : 'end-semester',
            status: 'ready',
            created_at: new Date(
              item.timemodified ? item.timemodified * 1000 : Date.now()
            ).toISOString(),
            download_url: `/api/v1/past-questions/download?id=${encodeURIComponent(item.id)}`,
            filesize: item.filesize,
            source: 'klok',
            courses: {
              id: null,
              course_code: detectedCode,
              title: cleanTitle,
              colour: '#00004E',
              isCentral: true,
            },
            question_count: 0,
            questions: [],
          });
        }
      } catch (externalErr: any) {
        console.warn('[API /api/v1/past-questions] External fallback search notice:', externalErr.message);
      }
    }

    // 4. Strict Deduplication per Course across academic year & exam type
    const paperMap = new Map<string, any>();

    for (const p of localPapers) {
      const courseKey = (p.normalized_course_code || p.course_code || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      const cleanTitle = (p.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const dedupKey = `${courseKey}_${p.year}_${p.exam_type || 'end-semester'}_${cleanTitle}`;
      if (!paperMap.has(dedupKey) && !paperMap.has(p.id)) {
        paperMap.set(dedupKey, p);
        paperMap.set(p.id, p);
      }
    }

    for (const p of externalDiscoveredPapers) {
      const courseKey = (p.normalized_course_code || p.course_code || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      const cleanTitle = (p.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const dedupKey = `${courseKey}_${p.year}_${p.exam_type || 'end-semester'}_${cleanTitle}`;
      if (!paperMap.has(dedupKey) && !paperMap.has(p.id)) {
        paperMap.set(dedupKey, p);
        paperMap.set(p.id, p);
      }
    }

    const seenIds = new Set<string>();
    const finalPapers: any[] = [];
    for (const p of paperMap.values()) {
      if (p.id && !seenIds.has(p.id)) {
        seenIds.add(p.id);
        finalPapers.push(p);
      }
    }

    return NextResponse.json(finalPapers, {
      headers: {
        'Cache-Control': isGlobalSearch
          ? 'no-store'
          : 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err: any) {
    console.error('[API /api/v1/past-questions] Error:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', message: err.message },
      { status: 500 }
    );
  }
}
