import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CourseInsertSchema = z.object({
  title: z.string().min(1).max(255),
  course_code: z.string().max(50).optional(),
  semester: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2020).max(2100).optional(),
  colour: z.string().max(50).optional(),
  programme_id: z.string().uuid().optional(),
  is_archived: z.boolean().optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let { data, error } = await supabase
      .from('courses')
      .select('*, lectures(id, title, week, slide_count, created_at, processing), past_papers(id, title, year, exam_type, status)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Next API Courses] Join query failed, falling back to direct select:', error.message);
      const fallback = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 500 });
      }
      data = fallback.data || [];
    }

    if (Array.isArray(data)) {
      data.forEach((c: any) => {
        if (Array.isArray(c.lectures)) {
          c.lectures = c.lectures
            .filter((l: any) => !l.title?.startsWith('[FAILED'))
            .map((l: any) => ({
              ...l,
              processing: Boolean(l.processing && (!l.slide_count || l.slide_count === 0)),
            }));
        } else {
          c.lectures = [];
        }
        if (!Array.isArray(c.past_papers)) {
          c.past_papers = [];
        }
      });

      // Fetch cover thumbnails: first slide image_url per lecture
      const allLectureIds = data.flatMap((c: any) =>
        (c.lectures as any[]).map((l: any) => l.id as string)
      );
      if (allLectureIds.length > 0) {
        // Supabase doesn't support DISTINCT ON via PostgREST, so fetch
        // slide_number=1 for all lectures in one query (one row per lecture).
        const { data: covers } = await supabase
          .from('slides')
          .select('lecture_id, image_url, slide_number')
          .in('lecture_id', allLectureIds)
          .in('slide_number', [0, 1])
          .order('slide_number', { ascending: true });

        if (covers && covers.length > 0) {
          const coverMap = new Map<string, string>();
          for (const row of covers) {
            if (row.lecture_id && row.image_url && !coverMap.has(row.lecture_id)) {
              coverMap.set(row.lecture_id, row.image_url);
            }
          }
          for (const c of data as any[]) {
            for (const lec of c.lectures as any[]) {
              lec.cover_image_url = coverMap.get(lec.id) || null;
            }
          }
        }
      }

      // Arrange courses in ascending alphanumeric order by course code and title
      data.sort((a: any, b: any) => {
        const codeA = (a.course_code || a.title || '').trim();
        const codeB = (b.course_code || b.title || '').trim();
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      });
    }

    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (err: any) {
    console.error('API /courses GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CourseInsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('courses')
      .insert({ ...parsed.data, user_id: user.id })
      .select('*, lectures(id)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('API /courses POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
