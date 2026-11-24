import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const AddSchema = z.object({ fact: z.string().trim().min(3).max(300) });
const MAX_MEMORIES = 60;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('tutor_memories')
    .select('id, fact, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(MAX_MEMORIES);

  if (error) return NextResponse.json({ memories: [], unavailable: true });
  return NextResponse.json({ memories: data || [] });
}

export async function POST(request: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = AddSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid memory' }, { status: 400 });

  const { count } = await supabase
    .from('tutor_memories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);
  if ((count ?? 0) >= MAX_MEMORIES) {
    return NextResponse.json({ error: `Memory is full (${MAX_MEMORIES}). Delete one first.` }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('tutor_memories')
    .insert({ user_id: user.id, fact: parsed.data.fact })
    .select('id, fact, created_at')
    .single();
  if (error) return NextResponse.json({ error: 'Could not save memory' }, { status: 500 });
  return NextResponse.json({ memory: data });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const all = url.searchParams.get('all') === '1';

  if (all) {
    const { error } = await supabase.from('tutor_memories').delete().eq('user_id', user.id);
    if (error) return NextResponse.json({ error: 'Could not clear memory' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  const { error } = await supabase.from('tutor_memories').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'Could not delete memory' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
