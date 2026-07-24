import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { z } from 'zod';

const CreateThreadSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(5).max(150),
  body: z.string().min(10).max(5000),
  tags: z.array(z.string()).optional()
});

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const url = new URL(req.url);
    const courseId = url.searchParams.get('courseId');

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Fetch threads with author info and reply counts
    const { data, error: fetchErr } = await supabase
      .from('discussion_threads')
      .select('*, profiles(full_name, avatar_url), discussion_replies(count)')
      .eq('course_id', courseId)
      .order('upvotes', { ascending: false })
      .order('created_at', { ascending: false });

    if (fetchErr) throw fetchErr;

    const threads = data.map((t: any) => ({
      ...t,
      reply_count: t.discussion_replies[0]?.count || 0,
      author_name: t.profiles?.full_name || 'Unknown',
      author_avatar: t.profiles?.avatar_url
    }));

    return NextResponse.json({ threads });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const { courseId, title, body: content, tags } = CreateThreadSchema.parse(body);
    
    const supabase = await createClient();

    const { data: thread, error: insertErr } = await supabase
      .from('discussion_threads')
      .insert({
        course_id: courseId,
        author_id: userId,
        title,
        body: content,
        tags: tags || []
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({ thread });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to create thread' }, { status: 400 });
  }
}
