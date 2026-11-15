import { createClient } from '@/lib/supabase/server';
import SettingsClient from './settings-client';

export default async function AdminSettingsPage() {
  const supabase = await createClient();

  const [settingsRes, auditRes] = await Promise.all([
    supabase.from('platform_settings').select('*'),
    supabase
      .from('admin_audit_logs')
      .select('id, admin_id, action_type, details, created_at')
      .eq('action_type', 'SETTING_CHANGED')
      .order('created_at', { ascending: false })
      .limit(25)
  ]);

  const settingsMap = (settingsRes.data || []).reduce((acc: Record<string, string>, curr: any) => {
    if (curr.key) acc[curr.key] = curr.value;
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-12">
      <SettingsClient initialSettings={settingsMap} initialAuditLogs={auditRes.data || []} />
    </div>
  );
}
