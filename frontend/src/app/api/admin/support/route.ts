import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/security/adminGuard';
import { getAdminClient } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  const { error } = await requireAdminApi();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status') || 'all';

  const supabase = getAdminClient() as any;
  let query = supabase
    .from('contact_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error: dbError } = await query;

  if (dbError) {
    return NextResponse.json({ submissions: [], stats: { unread: 0, total: 0 } });
  }

  const items: any[] = data || [];
  const unreadCount = items.filter((s) => s.status === 'unread').length;
  return NextResponse.json({
    submissions: items,
    stats: {
      total: items.length,
      unread: unreadCount,
      in_progress: items.filter((s) => s.status === 'in_progress').length,
      resolved: items.filter((s) => s.status === 'resolved').length,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const { error, user } = await requireAdminApi();
  if (error) return error;

  try {
    const body = await req.json();
    const { id, status, admin_notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'Submission id is required' }, { status: 400 });
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (status !== undefined) {
      updates.status = status;
      if (status === 'resolved') {
        updates.resolved_by = user.id;
      }
    }
    if (admin_notes !== undefined) updates.admin_notes = admin_notes;

    const supabase = getAdminClient() as any;
    const { data, error: updateError } = await supabase
      .from('contact_submissions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, submission: data });
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
    return NextResponse.json({ error: 'Submission id is required' }, { status: 400 });
  }

  const supabase = getAdminClient() as any;
  const { error: delError } = await supabase.from('contact_submissions').delete().eq('id', id);

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deletedId: id });
}
