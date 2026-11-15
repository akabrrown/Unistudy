import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/security/adminGuard';

export async function GET() {
  const { error } = await requireAdminApi();
  if (error) return error;

  try {
    const supabase = await createClient();

    const [settingsRes, auditRes] = await Promise.all([
      supabase.from('platform_settings').select('*'),
      supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('action_type', 'SETTING_CHANGED')
        .order('created_at', { ascending: false })
        .limit(20)
    ]);

    const settingsMap = (settingsRes.data || []).reduce((acc: Record<string, string>, curr: any) => {
      if (curr.key) acc[curr.key] = curr.value;
      return acc;
    }, {});

    return NextResponse.json({
      settings: settingsMap,
      auditLogs: auditRes.data || []
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { error, userId: adminId } = await requireAdminApi();
  if (error) return error;

  try {
    const body = await req.json();
    const supabase = await createClient();

    const updates: Array<{ key: string; value: string; updated_at: string }> = [];

    if (body.settings && typeof body.settings === 'object') {
      Object.entries(body.settings).forEach(([key, value]) => {
        updates.push({
          key,
          value: String(value),
          updated_at: new Date().toISOString()
        });
      });
    } else if (body.key !== undefined) {
      updates.push({
        key: body.key,
        value: String(body.value),
        updated_at: new Date().toISOString()
      });
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid setting updates provided' }, { status: 400 });
    }

    // Upsert the platform settings
    const { error: upsertErr } = await supabase
      .from('platform_settings')
      .upsert(updates, { onConflict: 'key' });

    if (upsertErr) throw upsertErr;

    // Log the action in admin_audit_logs
    try {
      await supabase.from('admin_audit_logs').insert(
        updates.map((u) => ({
          admin_id: adminId,
          action_type: 'SETTING_CHANGED',
          target_id: null,
          target_type: 'platform_settings',
          details: { key: u.key, value: u.value }
        }))
      );
    } catch (auditErr) {
      console.warn('[AdminSettings] Audit log error:', auditErr);
    }

    return NextResponse.json({
      success: true,
      updatedCount: updates.length,
      keys: updates.map((u) => u.key)
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Invalid request' }, { status: 400 });
  }
}
