import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/security/adminGuard';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  const supabase = getAdminClient() as any;
  const { data, error: dbError } = await supabase
    .from('platform_quotes')
    .select('*')
    .order('created_at', { ascending: false });

  if (dbError || !data) {
    return NextResponse.json({ quotes: [], error: dbError?.message }, { status: 200 });
  }

  return NextResponse.json({ quotes: data });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const body = await req.json();
    const { quote, author, theme, scheduled_date, is_active } = body;

    if (!quote) {
      return NextResponse.json({ error: 'Quote text is required' }, { status: 400 });
    }

    const supabase = getAdminClient() as any;
    const { data, error: insertError } = await supabase
      .from('platform_quotes')
      .insert({
        quote: quote.trim(),
        author: author?.trim() || 'Unknown',
        theme: theme || 'Excellence',
        scheduled_date: scheduled_date || null,
        is_active: is_active !== false,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, quote: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid request' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const body = await req.json();
    const { id, quote, author, theme, scheduled_date, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Quote id is required' }, { status: 400 });
    }

    const supabase = getAdminClient() as any;
    const updates: Record<string, any> = {};
    if (quote !== undefined) updates.quote = quote.trim();
    if (author !== undefined) updates.author = author.trim();
    if (theme !== undefined) updates.theme = theme;
    if (scheduled_date !== undefined) updates.scheduled_date = scheduled_date;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error: updateError } = await supabase
      .from('platform_quotes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, quote: data });
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
    return NextResponse.json({ error: 'Quote id is required' }, { status: 400 });
  }

  const supabase = getAdminClient() as any;
  const { error: delError } = await supabase.from('platform_quotes').delete().eq('id', id);

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deletedId: id });
}
