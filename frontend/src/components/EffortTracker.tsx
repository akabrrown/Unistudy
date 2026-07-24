'use client';
import { useState, useEffect } from 'react';
import { Target, Activity, Flame, Medal } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function EffortTracker() {
  const [data, setData] = useState<{ badge: string, totalMinutes: number, sessionCount: number, aiMessage: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/wellbeing/badges`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'High Effort': return <Flame className="w-5 h-5 text-orange-500" />;
      case 'Consistent': return <Activity className="w-5 h-5 text-blue-500" />;
      case 'Improving': return <Target className="w-5 h-5 text-green-500" />;
      default: return <Medal className="w-5 h-5 text-muted-foreground" />;
    }
  };

  if (loading) return <Skeleton className="h-[200px] w-full rounded-xl" />;
  if (!data) return null;

  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          Effort Tracker
        </h3>
        <div className="flex items-center gap-2 bg-muted px-3 py-1 rounded-full text-sm font-medium">
          {getBadgeIcon(data.badge)}
          {data.badge}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold tabular-nums">{data.sessionCount}</div>
          <div className="text-xs text-muted-foreground mt-1">Sessions this week</div>
        </div>
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="text-2xl font-bold tabular-nums">
            {Math.round(data.totalMinutes / 60)}h {data.totalMinutes % 60}m
          </div>
          <div className="text-xs text-muted-foreground mt-1">Focused time</div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground italic bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-100 dark:border-blue-900/50">
        {data.aiMessage}
      </p>
    </div>
  );
}
