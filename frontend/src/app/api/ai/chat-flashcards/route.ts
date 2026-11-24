import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  lectureId: z.string().uuid().optional(),
  cards: z
    .array(
      z.object({
        front: z.string().trim().min(1).max(600),
        back: z.string().trim().min(1).max(1500),
      })
    )
    .min(1)
    .max(20),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid flashcards' }, { status: 400 });

  let lectureId: string | null = null;
  if (parsed.data.lectureId) {
    const { data: lecture } = await supabase
      .from('lectures')
      .select('id')
      .eq('id', parsed.data.lectureId)
      .eq('user_id', user.id)
      .maybeSingle();
    lectureId = lecture?.id ?? null;
  }

  const nowIso = new Date().toISOString();
  const rows = parsed.data.cards.map((c) => ({
    user_id: user.id,
    lecture_id: lectureId,
    front: c.front,
    back: c.back,
    ease_factor: 2.5,
    interval_days: 0,
    repetitions: 0,
    next_review: nowIso,
  }));

  const { data, error } = await supabase.from('flashcards').insert(rows).select('id');
  if (error) {
    return NextResponse.json(
      { error: 'Could not save flashcards. Run the latest database migration if this persists.' },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, count: data?.length ?? rows.length });
}
