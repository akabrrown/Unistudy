import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CourseUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  course_code: z.string().max(50).optional(),
  semester: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2020).max(2100).optional(),
  colour: z.string().max(50).optional(),
  programme_id: z.string().uuid().optional(),
  is_archived: z.boolean().optional(),
});

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('courses')
      .select('*, lectures(id, title, file_url, week, created_at)')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Course not found' }, { status: 404 });

    if (Array.isArray(data.lectures)) {
      data.lectures = data.lectures
        .filter((l: any) => !l.title?.startsWith('[FAILED'))
        .sort((a: any, b: any) => {
          const wA = typeof a.week === 'number' && a.week > 0 ? a.week : 9999;
          const wB = typeof b.week === 'number' && b.week > 0 ? b.week : 9999;
          if (wA !== wB) return wA - wB;
          return (a.title || '').localeCompare(b.title || '', undefined, { numeric: true });
        });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = CourseUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('courses')
      .update(parsed.data)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*, lectures(id)')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
