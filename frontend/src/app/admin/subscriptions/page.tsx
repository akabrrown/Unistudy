'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, CreditCard, TrendingUp, UserX, AlertCircle, RotateCw, Search, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AdminSubscriptionsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    subscriptions: any[];
    revenueChart: any[];
    churn: { thisMonth: number; lastMonth: number };
    paymentLogs: any[];
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('all');

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/admin/subscriptions');
      setData(res);
    } catch (err: any) {
      console.error('Failed to load subscriptions:', err);
      toast.error(err.message || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const subscriptions = data?.subscriptions || [];
  const revenueChart = data?.revenueChart || [];
  const churn = data?.churn || { thisMonth: 0, lastMonth: 0 };
  const paymentLogs = data?.paymentLogs || [];

  const activeSubscribers = subscriptions.filter((s) => s.status === 'active');
  const estimatedMRR = activeSubscribers.reduce((acc, s) => {
    return acc + (s.plan_id === 'ultra' ? 80 : 40);
  }, 0);

  const filteredSubscriptions = subscriptions.filter((s) => {
    const q = searchTerm.toLowerCase().trim();
    const email = (s.profiles?.email || '').toLowerCase();
    const name = (s.profiles?.full_name || '').toLowerCase();
    const matchesSearch = !q || email.includes(q) || name.includes(q);
    const matchesPlan = planFilter === 'all' || s.plan_id === planFilter;
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Subscriptions & Revenue</h1>
          <p className="text-muted-foreground text-sm">
            Monitor active paying members, recurring revenue, and subscription health.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchSubscriptions}
          disabled={loading}
          className="gap-2 self-start sm:self-auto"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border-border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Paid Subscribers</CardTitle>
            <CreditCard className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : activeSubscribers.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Paid accounts on Pro or Ultra</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Est. Monthly Revenue (MRR)</CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : `GHS ${estimatedMRR.toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Based on current active subscriptions</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cancellations This Month</CardTitle>
            <UserX className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : churn.thisMonth}
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs {churn.lastMonth} last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-4 items-center bg-card p-4 rounded-lg border border-border shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subscriber by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        <div className="flex gap-2">
          {['all', 'pro', 'ultra'].map((p) => (
            <Button
              key={p}
              variant={planFilter === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPlanFilter(p)}
              className="capitalize"
            >
              {p === 'all' ? 'All Plans' : p}
            </Button>
          ))}
        </div>
      </div>

      {/* Subscriptions Table */}
      <Card className="shadow-sm border-border overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/20">
          <CardTitle className="text-lg">Subscriber Directory</CardTitle>
          <CardDescription>All users with an active or previously active paid plan.</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border uppercase">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Plan</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Period End</th>
                <th className="px-6 py-4 font-semibold">Started</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                    Loading subscriber data...
                  </td>
                </tr>
              ) : filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No subscribers found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{sub.profiles?.full_name || 'Unnamed Subscriber'}</div>
                      <div className="text-xs text-muted-foreground">{sub.profiles?.email || 'No email'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="capitalize font-semibold text-xs">
                        {sub.plan_id}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={sub.status === 'active' ? 'default' : 'destructive'}
                        className="capitalize text-xs"
                      >
                        {sub.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-sm">
                      {sub.current_period_end ? format(new Date(sub.current_period_end), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-sm">
                      {sub.created_at ? format(new Date(sub.created_at), 'MMM d, yyyy') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Failed Payments / Audit Logs if present */}
      {paymentLogs.length > 0 && (
        <Card className="shadow-sm border-border overflow-hidden">
          <CardHeader className="border-b border-border bg-muted/20">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Recent Payment Activity
            </CardTitle>
            <CardDescription>Webhooks and transaction logs recorded from Paystack.</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border uppercase">
                <tr>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Event</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {paymentLogs.map((log: any) => (
                  <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-4 text-foreground font-medium">{log.profiles?.email || log.user_id}</td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{log.event_type}</td>
                    <td className="px-6 py-4 text-foreground">GHS {log.amount ? (log.amount / 100).toFixed(2) : '0.00'}</td>
                    <td className="px-6 py-4">
                      <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                        {log.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {log.created_at ? format(new Date(log.created_at), 'PP p') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

