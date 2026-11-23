import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

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

    // 1. Primary Strategy: Check Postgres Database Table
    try {
      const { data: dbData, error: dbError } = await supabase
        .from('user_chat_backups')
        .select('sessions, active_session_id, updated_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!dbError && dbData && Array.isArray(dbData.sessions) && dbData.sessions.length > 0) {
        return NextResponse.json({
          sessions: dbData.sessions,
          activeSessionId: dbData.active_session_id || null,
          lastSynced: dbData.updated_at || new Date().toISOString(),
        });
      }
    } catch (dbErr: any) {
      console.warn('[API /api/chat/sync GET] Database check notice:', dbErr?.message);
    }

    // 2. Secondary Strategy: Storage Bucket Fallback via Admin Client
    try {
      const admin = getAdminClient();
      const filePath = `${user.id}/sessions.json`;
      const { data: storageData, error: storageError } = await admin.storage
        .from(BUCKET_NAME)
        .download(filePath);

      if (!storageError && storageData) {
        const text = await storageData.text();
        const parsed = JSON.parse(text);
        const sessions = Array.isArray(parsed?.sessions)
          ? parsed.sessions
          : Array.isArray(parsed)
          ? parsed
          : [];

        if (sessions.length > 0) {
          return NextResponse.json({
            sessions,
            activeSessionId: parsed?.activeSessionId || null,
            lastSynced: parsed?.updatedAt || new Date().toISOString(),
          });
        }
      }
    } catch (storageErr: any) {
      console.warn('[API /api/chat/sync GET] Storage check notice:', storageErr?.message);
    }

    return NextResponse.json({ sessions: [], lastSynced: null });
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

    const nowIso = new Date().toISOString();
    let dbSaved = false;

    // 1. Dual Persistence: Save to Database Table
    try {
      const { error: upsertError } = await supabase
        .from('user_chat_backups')
        .upsert(
          {
            user_id: user.id,
            sessions,
            active_session_id: activeSessionId,
            updated_at: nowIso,
          },
          { onConflict: 'user_id' }
        );

      if (!upsertError) {
        dbSaved = true;
      } else {
        console.warn('[API /api/chat/sync POST] DB upsert notice:', upsertError.message);
      }
    } catch (dbErr: any) {
      console.warn('[API /api/chat/sync POST] DB write exception:', dbErr?.message);
    }

    // 2. Dual Persistence: Save to Storage Bucket via Admin Client (bypasses RLS)
    try {
      const admin = getAdminClient();
      // Ensure bucket exists
      await admin.storage.createBucket(BUCKET_NAME, { public: false }).catch(() => {});

      const payload = JSON.stringify({
        userId: user.id,
        updatedAt: nowIso,
        activeSessionId,
        sessions,
      });

      const filePath = `${user.id}/sessions.json`;
      const { error: uploadError } = await admin.storage
        .from(BUCKET_NAME)
        .upload(filePath, payload, {
          contentType: 'application/json',
          upsert: true,
        });

      if (!uploadError) {
        dbSaved = true;
      } else {
        console.warn('[API /api/chat/sync POST] Storage upload notice:', uploadError.message);
      }
    } catch (storageErr: any) {
      console.warn('[API /api/chat/sync POST] Storage write exception:', storageErr?.message);
    }

    if (!dbSaved) {
      return NextResponse.json({ error: 'Failed to back up chat to cloud' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      count: sessions.length,
      savedAt: nowIso,
    });
  } catch (err: any) {
    console.error('[API /api/chat/sync POST] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
