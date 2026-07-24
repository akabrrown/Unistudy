'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { apiFetch } from '@/lib/api/client';
import { Loader2 } from 'lucide-react';

export default function AdminOverview() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await apiFetch('/admin/overview');
        setData(res);
      } catch (err) {
        console.error("Failed to fetch admin overview:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOverview();
    const interval = setInterval(fetchOverview, 60000); // Live updates every 60s (A01 spec)
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
  }

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Admin Overview Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/users" className="block">
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardHeader className="pb-2">
              <CardTitle>Total Users</CardTitle>
              <CardDescription>Registered accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{kpis.totalUsers ?? '0'}</p>
              <p className="text-sm text-muted-foreground mt-1">+{kpis.newUsersToday ?? '0'} today</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/subscriptions" className="block">
          <Card className="hover:shadow-lg transition-shadow h-full">
            <CardHeader className="pb-2">
              <CardTitle>Subscriptions</CardTitle>
              <CardDescription>Active paid plans</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{kpis.activePaidSubscribers ?? '0'}</p>
            </CardContent>
          </Card>
        </Link>

        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle>AI Requests</CardTitle>
            <CardDescription>Total calls today</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{kpis.totalAiRequestsToday ?? '0'}</p>
          </CardContent>
        </Card>
        
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle>Cache Hit Rate</CardTitle>
            <CardDescription>Saved API calls</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{kpis.cacheHitRate ?? '0'}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Provider Health Gauges and Live Feed placeholders will go here as per A01 plan */}
    </div>
  );
}
