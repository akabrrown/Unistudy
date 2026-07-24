import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { requireAuth } from '@/lib/security/adminGuard';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  try {
    const { roomName } = await req.json();
    if (!roomName) {
      return NextResponse.json({ error: 'roomName is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const participantName = profile?.full_name || 'Anonymous Student';

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'LiveKit credentials missing' }, { status: 500 });
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: participantName,
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();
    return NextResponse.json({ token: jwt });
  } catch (err: any) {
    console.error('Failed to generate LiveKit token:', err);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
