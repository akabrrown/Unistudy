import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { z } from 'zod';

const ReplySchema = z.object({
  body: z.string().min(5).max(5000),
});

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const supabase = await createClient();
    
    // Fetch thread
    const { data: thread, error: threadErr } = await supabase
      .from('discussion_threads')
      .select('*, profiles(full_name, avatar_url, institution_id)')
      .eq('id', threadId)
      .single();

    if (threadErr) throw threadErr;

    // Fetch replies
    const { data: replies, error: replyErr } = await supabase
      .from('discussion_replies')
      .select('*, profiles(full_name, avatar_url, institution_id)')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (replyErr) throw replyErr;

    return NextResponse.json({ 
      thread, 
      replies: replies || []
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const { body: content } = ReplySchema.parse(body);
    
    const supabase = await createClient();

    const { data: reply, error: insertErr } = await supabase
      .from('discussion_replies')
      .insert({
        thread_id: threadId,
        author_id: userId,
        body: content,
        is_ai: false
      })
      .select('*, profiles(full_name, avatar_url)')
      .single();

    if (insertErr) throw insertErr;

    // Remove is_ai_answered flag if a human replied (optional logic, skipping for now)

    return NextResponse.json({ reply });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to post reply' }, { status: 400 });
  }
}

// Optional PATCH for upvoting
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const { error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const supabase = await createClient();

    if (body.target === 'thread') {
      const { error: upvoteErr } = await supabase.rpc('increment_thread_upvotes', { row_id: threadId });
      if (upvoteErr) throw upvoteErr;
    } else if (body.target === 'reply' && body.replyId) {
      const { error: upvoteErr } = await supabase.rpc('increment_reply_upvotes', { row_id: body.replyId });
      if (upvoteErr) throw upvoteErr;
    }
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
