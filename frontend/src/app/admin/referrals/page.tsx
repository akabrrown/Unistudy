import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

export default async function ReferralsPage() {
  const supabase = await createClient();
  const { data: refs, error } = await supabase
    .from('referrals')
    .select(`
      id, referral_code, status, created_at,
      referrer:profiles(email),
      referred_email
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6 max-w-6xl">
      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle>Referral Tracker</CardTitle>
          <CardDescription>Manage referral codes and their status.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="text-destructive">Error loading referrals: {error.message}</p>
          )}
          <div className="rounded-md border overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium">
                <tr>
                  <th className="px-4 py-2">Code</th>
                  <th className="px-4 py-2">Referrer</th>
                  <th className="px-4 py-2">Referred Email</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {refs?.map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-2 font-mono text-sm">{r.referral_code}</td>
                    <td className="px-4 py-2">{r.referrer?.email || '—'}</td>
                    <td className="px-4 py-2">{r.referred_email || '—'}</td>
                    <td className="px-4 py-2 capitalize">{r.status}</td>
                    <td className="px-4 py-2">{format(new Date(r.created_at), 'yyyy-MM-dd')}</td>
                  </tr>
                ))}
                {(!refs || refs.length === 0) && !error && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No referrals found.</td>
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
