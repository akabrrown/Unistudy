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
      .select('*, lectures(id, title), past_papers(id, title, year, exam_type, status)')
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
          c.lectures = c.lectures.filter((l: any) => !l.title?.startsWith('[FAILED'));
        } else {
          c.lectures = [];
        }
        if (!Array.isArray(c.past_papers)) {
          c.past_papers = [];
        }
      });
    }

    return NextResponse.json(data || []);
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
