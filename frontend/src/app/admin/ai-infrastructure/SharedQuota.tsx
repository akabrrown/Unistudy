'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Database, AlertTriangle, ShieldAlert, Zap, Server } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAIQuotaPage() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/providers');
      if (!res.ok) throw new Error('Failed to fetch providers');
      const json = await res.json();
      setProviders(json.providers);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (provider: string, action: string, value: boolean) => {
    try {
      const res = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, provider, value })
      });
      if (!res.ok) throw new Error('Action failed');
      toast.success('Updated successfully');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4 md:p-8">
      <div className="hidden">
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {providers.map((p) => {
          const isDanger = p.should_disable || p.is_disabled;
          const isWarning = p.should_fallback || p.is_fallback_active || p.should_urgent;
          
          return (
            <Card key={p.provider} className={`p-6 border-t-4 ${isDanger ? 'border-t-destructive' : isWarning ? 'border-t-amber-500' : 'border-t-primary'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Server className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold uppercase tracking-wider">{p.provider.replace('_', ' ')}</h2>
                    <p className="text-xs text-muted-foreground uppercase">{p.pool_type.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-3xl font-bold">{p.remaining.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Remaining</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Limit: {p.total.toLocaleString()}</span>
                    <span>Used: {p.consumed.toLocaleString()}</span>
                  </div>
                </div>

                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      p.pct_remaining > 30 ? 'bg-green-500' : 
                      p.pct_remaining > 15 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, p.pct_remaining))}%` }}
                  />
                </div>

                <div className="pt-4 space-y-2 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Status</span>
                    {p.is_disabled ? (
                      <span className="text-destructive font-bold flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> DISABLED</span>
                    ) : p.is_fallback_active ? (
                      <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/50 p-2 rounded-md">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">Fallback Active</span>
                      </div>
                    ) : (
                      <span className="text-green-500 font-bold flex items-center gap-1"><Zap className="w-4 h-4"/> HEALTHY</span>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2 pt-2">
                    <Button 
                      variant={p.is_fallback_active ? "default" : "outline"} 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={() => handleAction(p.provider, 'set_fallback_active', !p.is_fallback_active)}
                    >
                      {p.is_fallback_active ? 'Deactivate Fallback' : 'Activate Fallback'}
                    </Button>
                    <Button 
                      variant={p.is_disabled ? "destructive" : "outline"} 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={() => handleAction(p.provider, 'set_disabled', !p.is_disabled)}
                    >
                      {p.is_disabled ? 'Enable Pool' : 'Disable Pool'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  );
}
