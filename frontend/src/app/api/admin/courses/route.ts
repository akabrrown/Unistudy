import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/security/adminGuard';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('q')?.toLowerCase() || '';

  const supabase = getAdminClient() as any;

  // Fetch courses with counts
  const { data: courses, error: dbError } = await supabase
    .from('courses')
    .select(`
      id,
      course_code,
      title,
      department_id,
      semester,
      academic_year,
      colour,
      is_archived,
      created_at,
      lectures(id),
      past_papers(id)
    `)
    .order('course_code', { ascending: true });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Aggregate stats and detect duplicates
  const codeGroups = new Map<string, string[]>();
  const formatted = (courses || []).map((c: any) => {
    const norm = (c.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (norm) {
      const list = codeGroups.get(norm) || [];
      list.push(c.id);
      codeGroups.set(norm, list);
    }

    return {
      id: c.id,
      course_code: c.course_code,
      normalized_code: norm,
      title: c.title,
      department_id: c.department_id,
      semester: c.semester,
      academic_year: c.academic_year,
      colour: c.colour || '#00004E',
      is_archived: Boolean(c.is_archived),
      created_at: c.created_at,
      lecture_count: Array.isArray(c.lectures) ? c.lectures.length : 0,
      paper_count: Array.isArray(c.past_papers) ? c.past_papers.length : 0,
      has_duplicate: false,
    };
  });

  // Flag duplicate normalized course codes
  formatted.forEach((c: any) => {
    if (c.normalized_code && (codeGroups.get(c.normalized_code)?.length || 0) > 1) {
      c.has_duplicate = true;
    }
  });

  const filtered = search
    ? formatted.filter(
        (c: any) =>
          c.course_code?.toLowerCase().includes(search) ||
          c.title?.toLowerCase().includes(search) ||
          c.normalized_code?.toLowerCase().includes(search)
      )
    : formatted;

  return NextResponse.json({
    courses: filtered,
    stats: {
      total: formatted.length,
      active: formatted.filter((c: any) => !c.is_archived).length,
      archived: formatted.filter((c: any) => c.is_archived).length,
      with_duplicates: formatted.filter((c: any) => c.has_duplicate).length,
    },
  });
}

export async function POST(req: NextRequest) {
  const { error, user } = await requireAdminApi();
  if (error) return error;

  try {
    const body = await req.json();
    const { action, source_course_id, target_course_id, course_id, updates } = body;
    const supabase = getAdminClient() as any;

    // ACTION 1: Atomic Course Merge
    if (action === 'merge') {
      if (!source_course_id || !target_course_id) {
        return NextResponse.json({ error: 'Source and target course IDs are required' }, { status: 400 });
      }

      if (source_course_id === target_course_id) {
        return NextResponse.json({ error: 'Cannot merge a course into itself' }, { status: 400 });
      }

      // Try calling RPC if exists
      try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('admin_merge_courses', {
          source_course_id,
          target_course_id,
        });

        if (!rpcError && rpcResult) {
          return NextResponse.json({ success: true, result: rpcResult });
        }
      } catch {
        // Fallback to manual execution
      }

      // Direct execution fallback
      const { data: targetCourse } = await supabase
        .from('courses')
        .select('course_code, title')
        .eq('id', target_course_id)
        .single();

      if (!targetCourse) {
        return NextResponse.json({ error: 'Target course not found' }, { status: 404 });
      }

      const { data: sourceCourse } = await supabase
        .from('courses')
        .select('course_code, title')
        .eq('id', source_course_id)
        .single();

      const normTarget = (targetCourse.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

      // Reassign lectures
      await supabase.from('lectures').update({ course_id: target_course_id }).eq('course_id', source_course_id);

      // Reassign past papers
      await supabase
        .from('past_papers')
        .update({
          course_id: target_course_id,
          course_code: targetCourse.course_code,
          normalized_course_code: normTarget,
        })
        .eq('course_id', source_course_id);

      // Archive source
      await supabase.from('courses').update({ is_archived: true }).eq('id', source_course_id);

      // Log in audit table
      await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        action_type: 'COURSE_MERGE',
        target_id: target_course_id,
        target_type: 'courses',
        details: {
          source_course_id,
          source_code: sourceCourse?.course_code,
          target_course_id,
          target_code: targetCourse.course_code,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully merged ${sourceCourse?.course_code || 'source'} into ${targetCourse.course_code}`,
      });
    }

    // ACTION 2: Edit Course Metadata
    if (action === 'update') {
      if (!course_id || !updates) {
        return NextResponse.json({ error: 'course_id and updates are required' }, { status: 400 });
      }

      const { data, error: updateError } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', course_id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, course: data });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
