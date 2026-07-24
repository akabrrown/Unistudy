import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdminApi } from '@/lib/security/adminGuard';

export async function PATCH(req: NextRequest) {
  const { error, userId: adminId } = await requireAdminApi();
  if (error) return error;

  try {
    const { key, value } = await req.json();
    const supabase = await createClient();

    // Update the platform setting
    await supabase.from('platform_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    // Log the action in audit_logs
    await supabase.from('audit_logs').insert({
      admin_id: adminId,
      action: 'SETTING_CHANGED',
      details: { key, value }
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
