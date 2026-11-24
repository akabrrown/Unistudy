import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensurePaperIngested } from '@/lib/past-papers/ingestion';
import {
  normalizePastPaperTitle,
  isUidString,
  extractCourseCode,
  resolveDisplayCourseCode,
} from '@/lib/past-papers/titleNormalizer';

export const dynamic = 'force-dynamic';

const KLOK_BASE_URL = process.env.KLOK_BASE_URL || 'https://kloksearch.vercel.app';
const KLOK_API_KEY = process.env.KLOK_API_KEY || 'klok_live_ddbeef2ccb5ed98dd45873c1d35060c4';

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

  // 2. Strict prefix boundary match (e.g. BCPC207_FINAL matches BCPC207, but BCPC201 NEVER matches BCPC207)
  for (const c of userCourses) {
    const cCode = (c.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cCode) continue;
    // Check if clean text contains the exact course code without other trailing digits
    const idx = clean.indexOf(cCode);
    if (idx !== -1) {
      // Ensure the character right after the course code is not a digit (prevents BCPC201 matching BCPC20)
      const nextChar = clean[idx + cCode.length];
      if (!nextChar || !/[0-9]/.test(nextChar)) {
        return c;
      }
    }
  }

  return null;
}

const klokCache = new Map<string, { data: any[]; expiresAt: number }>();
const KLOK_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes in-memory TTL

async function fetchKlokPapers(query?: string): Promise<any[]> {
  const cacheKey = (query || '').toLowerCase().trim();
  const cached = klokCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

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
    const items = data.items || (Array.isArray(data) ? data : []);

    klokCache.set(cacheKey, {
      data: items,
      expiresAt: Date.now() + KLOK_CACHE_TTL_MS,
    });
    return items;
  } catch (err: any) {
    console.warn(`[fetchKlokPapers] failed for query "${query}":`, err.message);
    return cached ? cached.data : [];
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
    const queryParam = (searchParams.get('q') || searchParams.get('search') || '').trim();
    const courseIdParam = searchParams.get('courseId');
    const isGlobalSearch = Boolean(queryParam);

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

    // 2. Build search terms: if queryParam is given, search that globally; otherwise search user's courses
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
    }

    // 3. Fetch from KLOK in parallel
    const uniqueTerms = Array.from(new Set(searchTerms)).slice(0, 12);
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

    // 4. Map external KLOK papers
    const klokPapers: any[] = [];
    for (const item of allKlokItems) {
      const rawName = item.name || item.filename || item.title || item.id || 'Past Examination Paper';
      const cleanTitle = normalizePastPaperTitle(rawName);
      const detectedCode = extractCourseCode(cleanTitle);

      // Check if this paper matches any of the user's enrolled courses
      const matchingCourse = findMatchingCourse(userCourses, detectedCode || '') || findMatchingCourse(userCourses, cleanTitle);

      // In non-global default mode, skip papers that don't match the student's courses
      if (!isGlobalSearch && !matchingCourse && userCourses.length > 0) {
        continue;
      }

      // If matching course exists, ingest so it gets cached locally with Cloudinary URL
      let effectiveId = item.id;
      let effectiveFileUrl: string | null = null;
      if (matchingCourse) {
        try {
          const ingested = await ensurePaperIngested(item, matchingCourse, user.id);
          effectiveId = ingested.id;
          effectiveFileUrl = ingested.file_url;
        } catch (ingestErr) {
          console.warn('[ensurePaperIngested] Notice:', ingestErr);
        }
      }

      const courseCode = resolveDisplayCourseCode({
        courseCode: matchingCourse?.course_code,
        joinedCourseCode: matchingCourse?.course_code,
        paperTitle: cleanTitle,
        fallback: detectedCode || 'EXAM',
      });
      const isMidterm = cleanTitle.toLowerCase().includes('mid') || cleanTitle.toLowerCase().includes('interim');

      klokPapers.push({
        id: effectiveId,
        course_id: matchingCourse ? matchingCourse.id : null,
        course_code: courseCode,
        normalized_course_code: courseCode.replace(/[^A-Z0-9]/g, ''),
        title: cleanTitle,
        year: parseYear(item.year || cleanTitle),
        exam_type: isMidterm ? 'mid-semester' : 'end-semester',
        status: 'ready',
        created_at: new Date(item.timemodified ? item.timemodified * 1000 : Date.now()).toISOString(),
        download_url: effectiveFileUrl || `/api/v1/past-questions/download?id=${encodeURIComponent(item.id)}`,
        filesize: item.filesize,
        source: 'klok',
        courses: matchingCourse ? {
          id: matchingCourse.id,
          course_code: courseCode,
          title: matchingCourse.title,
          colour: matchingCourse.colour || '#00004E',
        } : {
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

    // 5. Fetch papers from Supabase (Global search or User's course bank)
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
          past_paper_questions(id, question_number, text_content, extracted_topic, marks_available)
        `);

      if (isGlobalSearch) {
        // GLOBAL SEARCH across all papers in the university repository
        const cleanQ = queryParam.replace(/[^a-zA-Z0-9\s]/g, '').trim();
        const normQ = cleanQ.replace(/\s+/g, '').toUpperCase();
        query = query.or(
          `title.ilike.%${cleanQ}%,course_code.ilike.%${cleanQ}%,normalized_course_code.ilike.%${normQ}%`
        );
      } else if (courseIdParam) {
        query = query.eq('course_id', courseIdParam);
      } else if (userCourses.length > 0) {
        const userCourseIds = userCourses.map((c) => c.id);
        // Include user's registered course papers + any unassigned papers owned by user
        query = query.or(`course_id.in.(${userCourseIds.join(',')}),user_id.eq.${user.id}`);
      }

      const { data: rawPapers, error: dbError } = await query.order('created_at', { ascending: false });

      if (dbError) {
        console.warn('[API /api/v1/past-questions] Supabase query notice:', dbError.message);
      }

      if (rawPapers) {
        // Collect any course IDs that couldn't be loaded via user's private courses or RLS join
        const missingCourseIds = Array.from(
          new Set(
            rawPapers
              .map((p: any) => p.course_id)
              .filter((id: any) => Boolean(id) && !userCourses.some((c: any) => c.id === id))
          )
        );

        let extraCoursesMap = new Map<string, any>();
        if (missingCourseIds.length > 0) {
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
          if (serviceKey && supaUrl) {
            try {
              const { createClient: createServiceClient } = await import('@supabase/supabase-js');
              const adminSupa = createServiceClient(supaUrl, serviceKey);
              const { data: extraCourses } = await adminSupa
                .from('courses')
                .select('id, course_code, title, colour')
                .in('id', missingCourseIds);
              if (extraCourses) {
                for (const ec of extraCourses) {
                  extraCoursesMap.set(ec.id, ec);
                }
              }
            } catch (adminErr) {
              console.warn('[API /api/v1/past-questions] Admin courses fetch notice:', adminErr);
            }
          }
        }

        localPapers = rawPapers.map((p: any) => {
          const courseJoin = Array.isArray(p.courses) ? p.courses[0] : p.courses;
          const matchingCourse = userCourses.find((c) => c.id === p.course_id) || extraCoursesMap.get(p.course_id);
          const resolvedCourse = matchingCourse || courseJoin;
          const questions = p.past_paper_questions || [];

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
            void supabase.from('past_papers').update({
              course_code: safeCode,
              normalized_course_code: safeCode.replace(/[^A-Z0-9]/g, ''),
            }).eq('id', p.id);
          }

          return {
            id: p.id,
            course_id: resolvedCourse?.id || p.course_id,
            course_code: safeCode,
            normalized_course_code: safeCode.replace(/[^A-Z0-9]/g, ''),
            title: p.title || `${p.year || ''} ${p.exam_type === 'end-semester' ? 'Final Exam' : 'Midterm Exam'}`,
            year: p.year || new Date().getFullYear(),
            exam_type: p.exam_type || 'end-semester',
            status: p.status || 'ready',
            created_at: p.created_at,
            download_url: `/api/v1/past-questions/download?id=${p.id}`,
            courses: resolvedCourse ? {
              id: resolvedCourse.id,
              course_code: safeCode,
              title: resolvedCourse.title,
              colour: resolvedCourse.colour || '#00004E',
            } : {
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
            source: 'supabase',
          };
        });
      }
    } catch (dbErr: any) {
      console.warn('[API /api/v1/past-questions] Supabase local fetch warning:', dbErr.message);
    }

    // 6. Merge local Supabase papers + KLOK papers with deduplication per course
    const paperMap = new Map<string, any>();

    // Process local Supabase papers first (so native papers with extracted questions take precedence)
    for (const p of localPapers) {
      const courseKey = (p.normalized_course_code || p.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const cleanTitle = (p.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const dedupKey = `${courseKey}_${p.year}_${p.exam_type || 'end-semester'}_${cleanTitle}`;
      if (!paperMap.has(dedupKey) && !paperMap.has(p.id)) {
        paperMap.set(dedupKey, p);
        paperMap.set(p.id, p);
      }
    }

    // Merge external KLOK papers
    for (const p of klokPapers) {
      const courseKey = (p.normalized_course_code || p.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const cleanTitle = (p.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const dedupKey = `${courseKey}_${p.year}_${p.exam_type || 'end-semester'}_${cleanTitle}`;
      if (!paperMap.has(dedupKey) && !paperMap.has(p.id)) {
        paperMap.set(dedupKey, p);
        paperMap.set(p.id, p);
      }
    }

    // Unique paper records array
    const seenPaperIds = new Set<string>();
    const combined: any[] = [];
    for (const p of paperMap.values()) {
      if (p.id && !seenPaperIds.has(p.id)) {
        seenPaperIds.add(p.id);
        combined.push(p);
      }
    }

    return NextResponse.json(combined, {
      headers: {
        'Cache-Control': isGlobalSearch ? 'no-store' : 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err: any) {
    console.error('[API /api/v1/past-questions] Error:', err);
    return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
  }
}
