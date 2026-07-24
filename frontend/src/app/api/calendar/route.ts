import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { z } from 'zod';

const EventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  type: z.enum(['exam', 'assignment', 'session']),
});

export async function GET(req: NextRequest) {
  try {
    const { error, userId } = await requireAuth();
    if (error) return error;

    const supabase = await createClient();
    const { data, error: dbError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId!)
      .order('date', { ascending: true });

    if (dbError) {
      console.error('Calendar GET DB Error:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ events: data || [] });
  } catch (err: any) {
    console.error('Calendar GET Error Exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const event = EventSchema.parse(body);

    const supabase = await createClient();
    const { data, error: dbError } = await supabase
      .from('calendar_events')
      .insert({ user_id: userId, ...event })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ event: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const supabase = await createClient();
    const { error: dbError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
      .eq('user_id', userId!);

    if (dbError) throw dbError;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
