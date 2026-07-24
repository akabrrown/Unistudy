import { createClient } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/security/adminGuard';
import { NextRequest, NextResponse } from 'next/server';

// GET: List all lectures with uploader email
export async function GET(req: NextRequest) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lectures')
    .select('id, title, created_at, profiles(email)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE: Remove a lecture by id
export async function DELETE(req: NextRequest) {
  const { error: authError } = await requireAdminApi();
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from('lectures').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
