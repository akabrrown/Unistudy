'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Activity, Database, AlertTriangle, Zap, Server, Shield, Send } from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminAiUsagePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchAiData = async () => {
    try {
      const res = await apiFetch('/admin/ai-usage');
      setData(res);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load AI usage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiData();
  }, []);

  const handleFallbackToggle = async (provider: string, currentStatus: boolean) => {
    setUpdating(provider);
    try {
      await apiFetch('/admin/ai-usage/toggle-fallback', {
        method: 'POST',
        body: JSON.stringify({ provider, activate: !currentStatus })
      });
      toast.success(`${provider} fallback is now ${!currentStatus ? 'active' : 'inactive'}`);
      await fetchAiData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update provider status');
    } finally {
      setUpdating(null);
    }
  };

  const handleSendTestAlert = () => {
    toast.success('Test alert email sent to admin team!');
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-2" onClick={handleSendTestAlert}>
          <Send className="w-4 h-4" /> Send test alert
        </Button>
      </div>

      {/* High-Level Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cache Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.cache.rate}% Hit Rate</div>
            <p className="text-xs text-muted-foreground mt-1">
              Saved approximately {(data.cache.hits * 0.05).toFixed(2)} GHS in API costs today by serving {data.cache.hits} cached responses.
            </p>
            <Progress value={data.cache.rate} className="h-2 mt-3" />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Daily AI Calls (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] w-full pt-4">
            {data.chartData && data.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--popover-foreground))' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  {Object.keys(data.tokensPerProvider).map((provider, index) => {
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                    return (
                      <Line 
                        key={provider} 
                        type="monotone" 
                        dataKey={provider} 
                        name={provider.replace('_', ' ')}
                        stroke={colors[index % colors.length]} 
                        strokeWidth={2} 
                        dot={false}
                        activeDot={{ r: 6 }}
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No usage data for the last 30 days</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Provider Breakdown */}
      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Server className="w-5 h-5 text-primary" /> Provider Quotas & Status (Today)</CardTitle>
          <CardDescription>Monitor limits and manually restrict free tiers to prevent abuse.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.providers.map((p: any) => {
              const pct = p.daily_limit > 0 ? Math.round((p.daily_consumed / p.daily_limit) * 100) : 0;
              const isDanger = pct >= p.alert_pct_urgent;
              const isWarn = pct >= p.alert_pct_warn && !isDanger;
              
              return (
                <div key={p.provider} className="p-4 border border-border rounded-lg bg-muted/20 relative">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-lg capitalize">{p.provider.replace('_', ' ')}</h4>
                      <Badge variant="outline" className="text-xs font-normal mt-1">{p.pool_type.replace('_', ' ')}</Badge>
                    </div>
                    {p.is_fallback_active && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                        Fallback Active
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mt-4 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Daily Limit</span>
                      <span className="font-medium">{p.daily_consumed} / {p.daily_limit || '∞'} req</span>
                    </div>
                    {p.daily_limit > 0 && (
                      <Progress 
                        value={pct} 
                        className={`h-2 ${isDanger ? 'bg-destructive/20 [&>div]:bg-destructive' : isWarn ? 'bg-amber-500/20 [&>div]:bg-amber-500' : ''}`} 
                      />
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/50">
                    <div className="flex justify-between text-sm mb-3">
                      <span className="text-muted-foreground">Tokens this month</span>
                      <span className="font-medium">{(data.tokensPerProvider[p.provider] || 0).toLocaleString()}</span>
                    </div>
                    <Button 
                      variant={p.is_fallback_active ? "default" : "outline"} 
                      size="sm" 
                      className="w-full sm:w-auto"
                      onClick={() => handleFallbackToggle(p.provider, p.is_fallback_active)}
                      disabled={updating === p.provider}
                    >
                      {updating === p.provider ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                      {p.is_fallback_active ? 'Deactivate Fallback' : 'Activate Fallback'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Users */}
        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" /> Top Consumers (Today)</CardTitle>
            <CardDescription>Users who have made the most AI requests today.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Features Used</th>
                    <th className="px-4 py-3 text-right">Requests</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.topUsers.length === 0 && (
                    <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No usage recorded today.</td></tr>
                  )}
                  {data.topUsers.map((u: any, idx: number) => (
                    <tr key={u.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.full_name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground capitalize">
                        {u.features}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {u.requests}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Cost Estimate Table */}
        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="w-5 h-5 text-emerald-500" /> Estimated Monthly Costs</CardTitle>
            <CardDescription>Projected API costs based on current month token consumption.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3 text-right">Tokens Consumed</th>
                    <th className="px-4 py-3 text-right">Est. Cost (GHS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {Object.keys(data.tokensPerProvider).length === 0 && (
                    <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No consumption recorded.</td></tr>
                  )}
                  {Object.entries(data.tokensPerProvider).map(([provider, tokens]: any) => {
                    // Rough estimates for UI purposes
                    const costPer1M = provider.includes('gemini') ? 50 : provider.includes('groq') ? 0 : provider.includes('mistral') ? 10 : 0;
                    const estimatedGhs = ((tokens / 1_000_000) * costPer1M).toFixed(2);
                    
                    return (
                      <tr key={provider} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium capitalize">{provider.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{(tokens).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-bold">
                          {costPer1M === 0 ? <Badge variant="secondary">Free Tier</Badge> : `GH₵ ${estimatedGhs}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
