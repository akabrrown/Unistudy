import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'ai_chat_backups';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filePath = `${user.id}/sessions.json`;
    const { data, error } = await supabase.storage.from(BUCKET_NAME).download(filePath);

    if (error || !data) {
      return NextResponse.json({ sessions: [], lastSynced: null });
    }

    const text = await data.text();
    const parsed = JSON.parse(text);

    return NextResponse.json({
      sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : Array.isArray(parsed) ? parsed : [],
      activeSessionId: parsed?.activeSessionId || null,
      lastSynced: parsed?.updatedAt || new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn('[API /api/chat/sync GET] sync read notice:', err.message);
    return NextResponse.json({ sessions: [], lastSynced: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const sessions = Array.isArray(body?.sessions) ? body.sessions : [];
    const activeSessionId = body?.activeSessionId || null;

    if (sessions.length === 0) {
      return NextResponse.json({ ok: true, count: 0 });
    }

    const payload = JSON.stringify({
      userId: user.id,
      updatedAt: new Date().toISOString(),
      activeSessionId,
      sessions,
    });

    const filePath = `${user.id}/sessions.json`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, payload, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      console.warn('[API /api/chat/sync POST] storage upload notice:', uploadError.message);
      return NextResponse.json({ error: 'Failed to back up chat to cloud' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      count: sessions.length,
      savedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[API /api/chat/sync POST] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
