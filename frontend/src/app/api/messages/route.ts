import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const supabase = await createClient();

    // Fetch all messages where user is sender or receiver
    const { data: messages, error: fetchErr } = await supabase
      .from('direct_messages')
      .select('*, sender:profiles!direct_messages_sender_id_fkey(id, full_name, username, avatar_url), receiver:profiles!direct_messages_receiver_id_fkey(id, full_name, username, avatar_url)')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('sent_at', { ascending: false });

    if (fetchErr) throw fetchErr;

    // Group by conversation partner
    const conversationsMap = new Map();

    (messages || []).forEach((msg) => {
      const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      const partnerProfile = msg.sender_id === userId ? msg.receiver : msg.sender;

      if (!conversationsMap.has(partnerId)) {
        conversationsMap.set(partnerId, {
          partnerId,
          partnerName: partnerProfile?.full_name || partnerProfile?.username || 'Unknown User',
          partnerAvatar: partnerProfile?.avatar_url,
          lastMessage: msg.content,
          lastMessageAt: msg.sent_at,
          unreadCount: msg.receiver_id === userId && !msg.read ? 1 : 0
        });
      } else {
        const conv = conversationsMap.get(partnerId);
        if (msg.receiver_id === userId && !msg.read) {
          conv.unreadCount += 1;
        }
      }
    });

    // Also fetch all accepted friends
    const { data: friends } = await supabase
      .from('friend_requests')
      .select('sender_id, receiver_id, sender:profiles!friend_requests_sender_id_fkey(id, full_name, username, avatar_url), receiver:profiles!friend_requests_receiver_id_fkey(id, full_name, username, avatar_url)')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    (friends || []).forEach((req) => {
      const partnerId = req.sender_id === userId ? req.receiver_id : req.sender_id;
      const partnerProfile = req.sender_id === userId ? req.receiver : req.sender;
      
      if (!conversationsMap.has(partnerId)) {
        conversationsMap.set(partnerId, {
          partnerId,
          partnerName: (partnerProfile as any)?.full_name || (partnerProfile as any)?.username || (partnerProfile as any)?.[0]?.full_name || (partnerProfile as any)?.[0]?.username || 'Unknown User',
          partnerAvatar: (partnerProfile as any)?.avatar_url || (partnerProfile as any)?.[0]?.avatar_url,
          lastMessage: 'Say hi to your new friend!',
          lastMessageAt: new Date().toISOString(), // Fallback to current time if no messages
          unreadCount: 0
        });
      }
    });

    // Sort by lastMessageAt descending
    const conversations = Array.from(conversationsMap.values()).sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    return NextResponse.json({ conversations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
