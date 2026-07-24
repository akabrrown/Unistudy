import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { createClient as createClientAdmin } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const supabaseAdmin = createClientAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch pending requests where the current user is the receiver
    // Using admin client to bypass profiles RLS which blocks reading non-friends
    const { data: requests, error: fetchErr } = await supabaseAdmin
      .from('friend_requests')
      .select('id, sender_id, status, created_at, sender:profiles!friend_requests_sender_id_fkey(id, full_name, username, avatar_url)')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (fetchErr) throw fetchErr;

    return NextResponse.json({ requests: requests || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const { receiverId } = body;

    if (!receiverId) {
      return NextResponse.json({ error: 'Missing receiverId' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if a request already exists
    const { data: existing, error: checkErr } = await supabase
      .from('friend_requests')
      .select('id, status')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${userId})`)
      .single();
      
    if (existing) {
      return NextResponse.json({ error: 'Friend request already exists or you are already friends.' }, { status: 400 });
    }

    const { data, error: insertErr } = await supabase
      .from('friend_requests')
      .insert({ sender_id: userId, receiver_id: receiverId, status: 'pending' })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return NextResponse.json({ request: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();
    const { requestId, status } = body; // 'accepted' or 'rejected'

    if (!requestId || !['accepted', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error: updateErr } = await supabase
      .from('friend_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('receiver_id', userId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ request: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
