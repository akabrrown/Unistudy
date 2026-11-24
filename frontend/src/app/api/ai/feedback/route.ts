import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const FeedbackSchema = z.object({
  sessionId: z.string().min(1).max(100),
  messageId: z.string().min(1).max(100),
  rating: z.enum(['up', 'down']),
  reason: z.string().trim().max(500).optional(),
  modelUsed: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = FeedbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid feedback' }, { status: 400 });
  const f = parsed.data;

  const { error } = await supabase.from('ai_message_feedback').upsert(
    {
      user_id: user.id,
      session_id: f.sessionId,
      message_id: f.messageId,
      rating: f.rating,
      reason: f.reason || null,
      model_used: f.modelUsed || null,
    },
    { onConflict: 'user_id,message_id' }
  );
  if (error) return NextResponse.json({ error: 'Could not save feedback' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
