import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/security/adminGuard';
import { getAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

const FALLBACK_FAQS = [
  {
    id: 'faq-1',
    category: 'General',
    question: 'How does UniStudy work with official UPSA course materials?',
    answer: 'UniStudy organizes past examination papers, lecture slides, and notes directly by faculty and course codes. The integrated AI Study Tutor uses retrieval-augmented grounding to answer questions using your exact course syllabi.',
    display_order: 1,
    is_published: true,
  },
  {
    id: 'faq-2',
    category: 'Billing & Credits',
    question: 'How do AI Compute Credits and Free Daily Allowances work?',
    answer: 'Every registered student receives 30 Free Daily Compute Points every midnight. For intensive exam preparation, additional credit bundles can be purchased securely through Mobile Money (MTN MoMo, Telecel Cash, AT) or Card via Paystack.',
    display_order: 2,
    is_published: true,
  },
  {
    id: 'faq-3',
    category: 'Past Papers',
    question: 'Can I practice past exam questions under timed conditions?',
    answer: 'Yes! UniStudy features interactive mock exams with simulated timers, verbatim questions, and an examiner report detailing your performance across all topics.',
    display_order: 3,
    is_published: true,
  },
  {
    id: 'faq-4',
    category: 'Mobile & Offline',
    question: 'Can I access UniStudy on my mobile device?',
    answer: 'Yes, UniStudy is fully responsive and installs as a progressive web application on both Android and iOS devices, with offline caching for downloaded lecture slides.',
    display_order: 4,
    is_published: true,
  },
];

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const supabase = getAdminClient() as any;
  const { data, error: dbError } = await supabase
    .from('public_faqs')
    .select('*')
    .order('display_order', { ascending: true });

  if (dbError || !data || data.length === 0) {
    return NextResponse.json({ faqs: FALLBACK_FAQS, isFallback: true });
  }

  return NextResponse.json({ faqs: data, isFallback: false });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const body = await req.json();
    const { category, question, answer, display_order, is_published } = body;

    if (!question || !answer) {
      return NextResponse.json({ error: 'Question and answer are required' }, { status: 400 });
    }

    const supabase = getAdminClient() as any;
    const { data, error: insertError } = await supabase
      .from('public_faqs')
      .insert({
        category: category || 'General',
        question: question.trim(),
        answer: answer.trim(),
        display_order: typeof display_order === 'number' ? display_order : 0,
        is_published: is_published !== false,
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

    return NextResponse.json({ success: true, faq: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid request' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const body = await req.json();
    const { id, category, question, answer, display_order, is_published } = body;

    if (!id) {
      return NextResponse.json({ error: 'FAQ id is required' }, { status: 400 });
    }

    const supabase = getAdminClient() as any;
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (category !== undefined) updates.category = category;
    if (question !== undefined) updates.question = question.trim();
    if (answer !== undefined) updates.answer = answer.trim();
    if (display_order !== undefined) updates.display_order = display_order;
    if (is_published !== undefined) updates.is_published = is_published;

    const { data, error: updateError } = await supabase
      .from('public_faqs')
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

    return NextResponse.json({ success: true, faq: data });
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
    return NextResponse.json({ error: 'FAQ id is required' }, { status: 400 });
  }

  const supabase = getAdminClient() as any;
  const { error: delError } = await supabase.from('public_faqs').delete().eq('id', id);

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
