import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/security/adminGuard'
import { AuditClient, AuditLogItem } from './AuditClient'

export const metadata = {
  title: 'Security Audit Log & Compliance Ledger | UniStudy Admin',
  description: 'Cryptographically anchored tamper-evident trail of all administrative actions and system events'
}

export default async function AuditLogsPage() {
  await requireAdmin()
  const supabase = await createClient()

  // Query the authoritative admin_audit_logs table with actor profile join
  const { data: logs, error } = await supabase
    .from('admin_audit_logs')
    .select(`
      id, created_at, action_type, target_id, target_type, details, admin_id,
      admin:profiles!admin_audit_logs_admin_id_fkey(id, email, full_name, username, role)
    `)
    .order('created_at', { ascending: false })
    .limit(250)

  if (error) {
    console.error('Error fetching admin_audit_logs:', error)
  }

  const initialLogs: AuditLogItem[] = (logs as any) || []

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-12">
      <AuditClient initialLogs={initialLogs} />
    </div>
  )
}
