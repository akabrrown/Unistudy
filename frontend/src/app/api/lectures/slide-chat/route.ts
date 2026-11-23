import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'ai_chat_backups';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const slideId = searchParams.get('slideId');
    if (!slideId) {
      return NextResponse.json({ error: 'slideId is required' }, { status: 400 });
    }

    // 1. Primary Strategy: Check Postgres Database Table slide_chats
    try {
      const { data: dbData, error: dbError } = await supabase
        .from('slide_chats')
        .select('history, updated_at')
        .eq('user_id', user.id)
        .eq('slide_id', slideId)
        .maybeSingle();

      if (!dbError && dbData && Array.isArray(dbData.history)) {
        return NextResponse.json({
          history: dbData.history,
          updatedAt: dbData.updated_at || new Date().toISOString(),
        });
      }
    } catch (dbErr: any) {
      console.warn('[API /api/lectures/slide-chat GET] Database read notice:', dbErr?.message);
    }

    // 2. Secondary Strategy: Storage Bucket Fallback
    try {
      const admin = getAdminClient();
      const sanitizedSlideId = slideId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filePath = `${user.id}/slides/${sanitizedSlideId}.json`;
      const { data: storageData, error: storageError } = await admin.storage
        .from(BUCKET_NAME)
        .download(filePath);

      if (!storageError && storageData) {
        const text = await storageData.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed?.history)) {
          return NextResponse.json({
            history: parsed.history,
            updatedAt: parsed?.updatedAt || new Date().toISOString(),
          });
        }
      }
    } catch (storageErr: any) {
      console.warn('[API /api/lectures/slide-chat GET] Storage read notice:', storageErr?.message);
    }

    return NextResponse.json({ history: [] });
  } catch (err: any) {
    console.warn('[API /api/lectures/slide-chat GET] error:', err?.message);
    return NextResponse.json({ history: [] });
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
    const slideId = body?.slideId;
    const history = Array.isArray(body?.history) ? body.history : Array.isArray(body?.messages) ? body.messages : [];

    if (!slideId) {
      return NextResponse.json({ error: 'slideId is required' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    let saved = false;

    // 1. Dual Persistence: Save to slide_chats table
    try {
      const { error: upsertError } = await supabase
        .from('slide_chats')
        .upsert(
          {
            user_id: user.id,
            slide_id: slideId,
            history,
            updated_at: nowIso,
          },
          { onConflict: 'user_id,slide_id' }
        );

      if (!upsertError) {
        saved = true;
      } else {
        console.warn('[API /api/lectures/slide-chat POST] DB upsert notice:', upsertError.message);
      }
    } catch (dbErr: any) {
      console.warn('[API /api/lectures/slide-chat POST] DB write exception:', dbErr?.message);
    }

    // 2. Dual Persistence: Save to Storage Bucket via Admin Client
    try {
      const admin = getAdminClient();
      await admin.storage.createBucket(BUCKET_NAME, { public: false }).catch(() => {});
      const sanitizedSlideId = slideId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filePath = `${user.id}/slides/${sanitizedSlideId}.json`;
      const payload = JSON.stringify({
        userId: user.id,
        slideId,
        history,
        updatedAt: nowIso,
      });

      const { error: uploadError } = await admin.storage
        .from(BUCKET_NAME)
        .upload(filePath, payload, {
          contentType: 'application/json',
          upsert: true,
        });

      if (!uploadError) {
        saved = true;
      }
    } catch (storageErr: any) {
      console.warn('[API /api/lectures/slide-chat POST] Storage upload exception:', storageErr?.message);
    }

    return NextResponse.json({ ok: saved, count: history.length, updatedAt: nowIso });
  } catch (err: any) {
    console.error('[API /api/lectures/slide-chat POST] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
    const slideId = body?.slideId;

    if (!slideId) {
      return NextResponse.json({ error: 'slideId is required' }, { status: 400 });
    }

    try {
      await supabase
        .from('slide_chats')
        .delete()
        .eq('user_id', user.id)
        .eq('slide_id', slideId);
    } catch (_) {}

    try {
      const admin = getAdminClient();
      const sanitizedSlideId = slideId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filePath = `${user.id}/slides/${sanitizedSlideId}.json`;
      await admin.storage.from(BUCKET_NAME).remove([filePath]);
    } catch (_) {}

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
