import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/security/adminGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

export default async function AuditLogsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select(`
      id, created_at, action, details,
      admin:profiles(email),
      target_user:profiles(email)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Audit Logs</h1>
        <p className="text-muted-foreground">Immutable record of all administrator actions.</p>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Showing the last 100 admin actions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target User</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs?.length === 0 && !error && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No audit logs found.
                    </td>
                  </tr>
                )}
                {logs?.map((log: any) => (
                  <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3 font-medium">{log.admin?.email || 'Unknown'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">{log.target_user?.email || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-xs truncate" title={JSON.stringify(log.details)}>
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
                {error && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-destructive">
                      Error loading audit logs. Did you run the SQL script? ({error.message})
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
