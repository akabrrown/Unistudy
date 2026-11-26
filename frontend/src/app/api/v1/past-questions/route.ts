import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  fetchKlokPapers,
  ensurePaperIngested,
  getServiceSupabase,
} from '@/lib/past-papers/ingestion';
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

function findMatchingCourse(userCourses: any[], codeOrTitle: string): any | null {
  if (!codeOrTitle || !userCourses || userCourses.length === 0) return null;
  const clean = codeOrTitle.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!clean) return null;

  // 1. Exact match on normalized code (e.g. BCPC207 === BCPC207)
  for (const c of userCourses) {
    const cCode = (c.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cCode && cCode === clean) return c;
  }

  // 2. Strict prefix boundary match (e.g. BCPC207_FINAL matches BCPC207, BCPC201 matches BCPC 201)
  for (const c of userCourses) {
    const cCode = (c.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cCode) continue;
    const idx = clean.indexOf(cCode);
    if (idx !== -1) {
      const nextChar = clean[idx + cCode.length];
      if (!nextChar || !/[0-9]/.test(nextChar)) {
        return c;
      }
    }
  }

  return null;
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
          user_id,
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
          past_paper_pages!past_paper_pages_past_paper_id_fkey(id, image_url)
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
          query = query.or(`course_id.eq.${courseIdParam},normalized_course_code.eq.${targetNorm},user_id.eq.${user.id}`);
        } else {
          query = query.or(`course_id.eq.${courseIdParam},user_id.eq.${user.id}`);
        }
      } else if (userCourses.length > 0) {
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
            user_id: p.user_id,
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

    // 3. Seamless Endpoint (KLOK) Fetch & Non-Blocking Auto-Ingest
    // We check KLOK for:
    // a) Search queries
    // b) User enrolled courses
    const searchTerms: string[] = [];
    if (queryParam) {
      searchTerms.push(queryParam);
    } else if (courseIdParam) {
      const targetCourse = userCourses.find((c) => c.id === courseIdParam);
      if (targetCourse?.course_code) {
        searchTerms.push(targetCourse.course_code.trim());
        const noSpace = targetCourse.course_code.replace(/\s+/g, '').trim();
        if (noSpace !== targetCourse.course_code.trim()) {
          searchTerms.push(noSpace);
        }
      }
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
      }
    } else {
      // General fallback terms for students with no courses yet
      searchTerms.push('BCPC', 'BINF', 'BBA');
    }

    const uniqueTerms = Array.from(new Set(searchTerms)).slice(0, 10);
    const klokResults = await Promise.all(uniqueTerms.map((t) => fetchKlokPapers(t)));

    // Deduplicate KLOK items by ID
    const seenKlokIds = new Set<string>();
    const allKlokItems: any[] = [];
    for (const items of klokResults) {
      for (const item of items) {
        if (item.id && !seenKlokIds.has(item.id)) {
          seenKlokIds.add(item.id);
          allKlokItems.push(item);
        }
      }
    }

    const klokPapers: any[] = [];
    for (const item of allKlokItems) {
      const rawName =
        item.name || item.filename || item.title || item.id || 'Past Examination Paper';
      const cleanTitle = normalizePastPaperTitle(rawName);
      const detectedCode = extractCourseCode(cleanTitle);

      // Check if this paper matches any of the user's enrolled courses
      const matchingCourse =
        findMatchingCourse(userCourses, detectedCode || '') ||
        findMatchingCourse(userCourses, cleanTitle);

      // In non-global default mode, filter to user courses if user has enrolled courses
      if (!isGlobalSearch && !matchingCourse && userCourses.length > 0) {
        continue;
      }

      // Fast non-blocking auto-ingest into Central Bank in background (NO await to keep response <300ms)
      if (matchingCourse) {
        void ensurePaperIngested(item, matchingCourse, user.id);
      }

      const courseCode = resolveDisplayCourseCode({
        courseCode: matchingCourse?.course_code,
        joinedCourseCode: matchingCourse?.course_code,
        paperTitle: cleanTitle,
        fallback: detectedCode || 'EXAM',
      });
      const isMidterm =
        cleanTitle.toLowerCase().includes('mid') || cleanTitle.toLowerCase().includes('interim');

      klokPapers.push({
        id: item.id,
        course_id: matchingCourse ? matchingCourse.id : null,
        course_code: courseCode,
        normalized_course_code: courseCode.replace(/[^A-Z0-9]/g, ''),
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
        courses: matchingCourse
          ? {
              id: matchingCourse.id,
              course_code: courseCode,
              title: matchingCourse.title,
              colour: matchingCourse.colour || '#00004E',
            }
          : {
              id: null,
              course_code: courseCode,
              title: cleanTitle,
              colour: '#00004E',
              isCentral: true,
            },
        question_count: 0,
        questions: [],
      });
    }

    // 4. Merge local Bank papers + external Endpoint papers with Deduplication
    const seenKeys = new Set<string>();
    const finalPapers: any[] = [];

    // Bank papers take precedence (they have extracted questions and permanent Cloudinary URLs)
    for (const p of localPapers) {
      if (!p.id || seenKeys.has(p.id)) continue;
      const courseKey = (p.normalized_course_code || p.course_code || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      const cleanTitle = (p.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const dedupKey = `${courseKey}_${p.year}_${p.exam_type || 'end-semester'}_${cleanTitle}`;
      if (cleanTitle && seenKeys.has(dedupKey)) continue;

      seenKeys.add(p.id);
      if (cleanTitle) seenKeys.add(dedupKey);
      finalPapers.push(p);
    }

    // Merge external KLOK papers for any papers not yet in the local bank
    for (const p of klokPapers) {
      if (!p.id || seenKeys.has(p.id)) continue;
      const courseKey = (p.normalized_course_code || p.course_code || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      const cleanTitle = (p.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const dedupKey = `${courseKey}_${p.year}_${p.exam_type || 'end-semester'}_${cleanTitle}`;
      if (cleanTitle && seenKeys.has(dedupKey)) continue;

      seenKeys.add(p.id);
      if (cleanTitle) seenKeys.add(dedupKey);
      finalPapers.push(p);
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
