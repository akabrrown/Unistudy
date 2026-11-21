import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

      const pathParts = decodedPath.split(/[\/\\]/);
      const filename = pathParts[pathParts.length - 1] || 'Past Examination Paper';
      const cleanTitle = filename.replace(/\.pdf$/i, '').trim();
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
