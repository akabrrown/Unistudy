import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizePastPaperTitle } from '@/lib/past-papers/titleNormalizer';

export const dynamic = 'force-dynamic';

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

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const paperId = params.id;

    if (!paperId) {
      return NextResponse.json({ error: 'Missing past question id' }, { status: 400 });
    }

    const supabase = await createClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paperId);

    // 1. If valid UUID, look up in Supabase past_papers database
    if (isUuid) {
      try {
        const { data: paper, error: dbError } = await supabase
          .from('past_papers')
          .select(`
            *,
            courses(id, course_code, title, colour),
            past_paper_questions(id, question_number, text_content, extracted_topic, marks_available)
          `)
          .eq('id', paperId)
          .maybeSingle();

        if (paper) {
          const courseData = Array.isArray(paper.courses) ? paper.courses[0] : paper.courses;
          const questions = paper.past_paper_questions || [];
          
          let directPdfUrl: string | null = null;
          try {
            const { data: pageRows } = await supabase
              .from('past_paper_pages')
              .select('image_url')
              .eq('past_paper_id', paper.id)
              .limit(1);
            if (pageRows && pageRows.length > 0 && pageRows[0].image_url) {
              directPdfUrl = pageRows[0].image_url;
            }
          } catch (_) {}

          return NextResponse.json({
            ...paper,
            courses: courseData,
            past_paper_questions: questions,
            download_url: directPdfUrl || `/api/v1/past-questions/download?id=${paper.id}`,
          });
        }
      } catch (uuidErr: any) {
        console.warn('[API /api/v1/past-questions/[id]] DB lookup notice:', uuidErr.message);
      }
    }

    // 2. KLOK / External Past Question Resolution
    try {
      let decodedPath = '';
      try {
        decodedPath = Buffer.from(paperId, 'base64').toString('utf-8');
      } catch (_) {
        decodedPath = paperId;
      }

      const cleanTitle = normalizePastPaperTitle(decodedPath || paperId);
      const detectedCode = extractCourseCode(cleanTitle);

      // Attempt to link to user's registered courses if session exists
      let matchingCourse: any = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userCourses } = await supabase
            .from('courses')
            .select('id, course_code, title, colour')
            .eq('user_id', user.id);

          const cleanCodeOnly = detectedCode.replace(/\s+/g, '').toUpperCase();
          matchingCourse = (userCourses || []).find((c) => {
            const cCodeClean = (c.course_code || '').replace(/\s+/g, '').toUpperCase();
            return cCodeClean && (cCodeClean === cleanCodeOnly || cleanTitle.toUpperCase().includes(cCodeClean));
          });
        }
      } catch (_) {}

      const isMidterm = cleanTitle.toLowerCase().includes('mid') || cleanTitle.toLowerCase().includes('interim');
      const courseCode = matchingCourse?.course_code || detectedCode;

      return NextResponse.json({
        id: paperId,
        course_id: matchingCourse ? matchingCourse.id : null,
        course_code: courseCode,
        normalized_course_code: courseCode.replace(/[^A-Z0-9]/g, ''),
        title: cleanTitle,
        year: parseYear(cleanTitle),
        exam_type: isMidterm ? 'mid-semester' : 'end-semester',
        status: 'ready',
        created_at: new Date().toISOString(),
        download_url: `/api/v1/past-questions/download?id=${encodeURIComponent(paperId)}`,
        source: 'klok',
        courses: matchingCourse ? {
          id: matchingCourse.id,
          course_code: matchingCourse.course_code,
          title: matchingCourse.title,
          colour: matchingCourse.colour || '#00004E',
        } : {
          id: 'official',
          course_code: courseCode,
          title: cleanTitle,
          colour: '#00004E',
        },
        past_paper_questions: [],
      });
    } catch (parseErr: any) {
      console.error('[API /api/v1/past-questions/[id]] Parsing error:', parseErr);
      return NextResponse.json({ error: 'Past question paper not found' }, { status: 404 });
    }
  } catch (err: any) {
    console.error('[API /api/v1/past-questions/[id]] Fatal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const paperId = params.id;
    if (!paperId) {
      return NextResponse.json({ error: 'Missing past question id' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const targetCourseId = body.courseId;
    const customTitle = body.title ? String(body.title).trim() : null;

    if (!targetCourseId) {
      return NextResponse.json({ error: 'Target courseId is required' }, { status: 400 });
    }

    // Verify that the user owns the destination course
    const { data: targetCourse, error: courseErr } = await supabase
      .from('courses')
      .select('id, course_code, title, colour')
      .eq('id', targetCourseId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (courseErr || !targetCourse) {
      return NextResponse.json({ error: 'Course not found or unauthorized' }, { status: 404 });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paperId);
    const normalizedCode = (targetCourse.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (isUuid) {
      const updatePayload: Record<string, any> = {
        course_id: targetCourse.id,
        course_code: targetCourse.course_code,
        normalized_course_code: normalizedCode,
        user_id: user.id,
      };
      if (customTitle) {
        updatePayload.title = customTitle;
      }

      // First attempt update with user client
      const { data: updatedPaper, error: updateErr } = await supabase
        .from('past_papers')
        .update(updatePayload)
        .eq('id', paperId)
        .select(`
          *,
          courses(id, course_code, title, colour)
        `)
        .maybeSingle();

      if (updateErr || !updatedPaper) {
        // Fall back to service role client in case paper was unassigned or uploaded by another user
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (url && key) {
          const { createClient: createServiceClient } = await import('@supabase/supabase-js');
          const serviceSupabase = createServiceClient(url, key);
          const { data: serviceUpdated, error: serviceErr } = await serviceSupabase
            .from('past_papers')
            .update(updatePayload)
            .eq('id', paperId)
            .select(`
              *,
              courses(id, course_code, title, colour)
            `)
            .maybeSingle();

          if (!serviceErr && serviceUpdated) {
            return NextResponse.json({
              ok: true,
              paper: serviceUpdated,
              message: `Paper successfully moved to ${targetCourse.course_code}: ${targetCourse.title}`,
            });
          }
        }
        return NextResponse.json(
          { error: updateErr?.message || 'Failed to reassign paper course' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        paper: updatedPaper,
        message: `Paper successfully moved to ${targetCourse.course_code}: ${targetCourse.title}`,
      });
    } else {
      // Paper is from KLOK external repository -> Ingest directly into target course!
      const { ensurePaperIngested } = await import('@/lib/past-papers/ingestion');
      let decodedPath = '';
      try {
        decodedPath = Buffer.from(paperId, 'base64').toString('utf-8');
      } catch (_) {
        decodedPath = paperId;
      }
      const rawName = decodedPath.split(/[\/\\]/).pop() || paperId;
      const cleanTitle = customTitle || rawName.replace(/\.pdf$/i, '').trim();

      const item = {
        id: paperId,
        name: cleanTitle,
        filename: rawName,
      };

      const ingested = await ensurePaperIngested(item, targetCourse, user.id);
      return NextResponse.json({
        ok: true,
        paperId: ingested.id,
        message: `External paper successfully imported and moved to ${targetCourse.course_code}: ${targetCourse.title}`,
      });
    }
  } catch (err: any) {
    console.error('[API /api/v1/past-questions/[id] PATCH] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
