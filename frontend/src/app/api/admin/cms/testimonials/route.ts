import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/security/adminGuard';
import { getAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

const FALLBACK_TESTIMONIALS = [
  {
    id: 'test-1',
    student_name: 'Kofi Mensah',
    student_role: 'Final Year Student',
    program: 'BSc Information Technology Management',
    content: 'UniStudy turned my exam preparation around. Having past questions verbatim with the AI tutor explaining marking schemes helped me score an A in Systems Analysis.',
    rating: 5,
    is_featured: true,
    is_approved: true,
  },
  {
    id: 'test-2',
    student_name: 'Ama Serwaa',
    student_role: 'Level 300 Scholar',
    program: 'BSc Accounting and Finance',
    content: 'The MixTeX OCR scanner extracts handwritten lecture notes perfectly. Generating custom quiz drills from my actual slides saves hours of study time.',
    rating: 5,
    is_featured: true,
    is_approved: true,
  },
  {
    id: 'test-3',
    student_name: 'Ebenezer Boateng',
    student_role: 'Level 200 Representative',
    program: 'Department of Banking and Finance',
    content: 'Synchronizing directly with our course banks and taking real-time mock examinations with grading feedback gave our entire study group a major advantage.',
    rating: 5,
    is_featured: true,
    is_approved: true,
  },
];

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const supabase = getAdminClient() as any;
  const { data, error: dbError } = await supabase
    .from('public_testimonials')
    .select('*')
    .order('created_at', { ascending: false });

  if (dbError || !data || data.length === 0) {
    return NextResponse.json({ testimonials: FALLBACK_TESTIMONIALS, isFallback: true });
  }

  return NextResponse.json({ testimonials: data, isFallback: false });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const body = await req.json();
    const { student_name, student_role, program, content, rating, is_featured, is_approved } = body;

    if (!student_name || !content) {
      return NextResponse.json({ error: 'Student name and testimonial content are required' }, { status: 400 });
    }

    const supabase = getAdminClient() as any;
    const { data, error: insertError } = await supabase
      .from('public_testimonials')
      .insert({
        student_name: student_name.trim(),
        student_role: student_role || 'UPSA Student',
        program: program || null,
        content: content.trim(),
        rating: typeof rating === 'number' ? Math.min(5, Math.max(1, rating)) : 5,
        is_featured: is_featured !== false,
        is_approved: is_approved !== false,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    try {
      revalidatePath('/', 'layout');
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, testimonial: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid request' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const body = await req.json();
    const { id, student_name, student_role, program, content, rating, is_featured, is_approved } = body;

    if (!id) {
      return NextResponse.json({ error: 'Testimonial id is required' }, { status: 400 });
    }

    const supabase = getAdminClient() as any;
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (student_name !== undefined) updates.student_name = student_name.trim();
    if (student_role !== undefined) updates.student_role = student_role;
    if (program !== undefined) updates.program = program;
    if (content !== undefined) updates.content = content.trim();
    if (rating !== undefined) updates.rating = Math.min(5, Math.max(1, rating));
    if (is_featured !== undefined) updates.is_featured = is_featured;
    if (is_approved !== undefined) updates.is_approved = is_approved;

    const { data, error: updateError } = await supabase
      .from('public_testimonials')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    try {
      revalidatePath('/', 'layout');
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, testimonial: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Update failed' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Testimonial id is required' }, { status: 400 });
  }

  const supabase = getAdminClient() as any;
  const { error: delError } = await supabase.from('public_testimonials').delete().eq('id', id);

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  try {
    revalidatePath('/', 'layout');
  } catch {
    // ignore
  }

  return NextResponse.json({ success: true, deletedId: id });
}
