'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Coins,
  Zap,
  CheckCircle2,
  User as UserIcon,
  Accessibility,
  RefreshCw,
  Calculator,
  Layers,
  Cpu,
  FileText,
  Camera,
  LineChart,
  Bot,
  Activity,
  History,
  TrendingDown,
  Clock,
  ArrowUpRight,
  Search,
  Filter,
  Download,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface UsageLogItem {
  id: string;
  feature: string;
  provider: string;
  pool_type: string;
  cost_points: number;
  cost_credits: number;
  called_at: string;
}

interface SummaryData {
  total_points_used: number;
  total_credits_used: number;
  today_points_used: number;
  today_credits_used: number;
  total_count: number;
  feature_breakdown: Record<string, { count: number; points: number; credits: number }>;
}

function humanizeFeature(feat: string): { label: string; icon: React.ComponentType<{ className?: string }> } {
  switch (feat) {
    case 'slide_explanation':
      return { label: 'Slide Explanation', icon: FileText };
    case 'handwriting_scan':
      return { label: 'Notes OCR Scan', icon: Camera };
    case 'quiz_generation':
      return { label: 'Quiz Generation', icon: LineChart };
    case 'flashcard_generation':
      return { label: 'Flashcard Deck', icon: Layers };
    case 'past_paper_grading':
      return { label: 'AI Examiner Grading', icon: LineChart };
    case 'past_paper_question':
      return { label: 'Past Paper Extraction', icon: FileText };
    case 'calculator':
      return { label: 'Math & Graph Solver', icon: Calculator };
    case 'chat_message':
      return { label: 'AI Tutor Chat', icon: Bot };
    case 'exam_focus':
      return { label: 'Exam Focus Analysis', icon: TargetIcon };
    case 'generate_mnemonics':
      return { label: 'Mnemonic Generator', icon: Layers };
    case 'revision_song':
      return { label: 'Revision Song', icon: Activity };
    case 'youtube_search':
      return { label: 'Video Lecture Search', icon: Cpu };
    default:
      return {
        label: feat ? feat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'AI Operation',
        icon: Cpu,
      };
  }
}

function TargetIcon({ className }: { className?: string }) {
  return <Activity className={className} />;
}

function humanizeProvider(prov: string): string {
  switch (prov) {
    case 'gemini':
      return 'Google Gemini 2.5 Flash';
    case 'groq_70b':
      return 'Groq LLaMA 3.3 70B';
    case 'groq_8b':
      return 'Groq LLaMA 3.1 8B';
    case 'cohere':
      return 'Cohere Rerank v3';
    case 'youtube':
      return 'YouTube Ingestion';
    case 'agentrouter':
      return 'AgentRouter Pro';
    default:
      return prov || 'Cloud Inference';
  }
}

function formatFullDate(isoDate: string): string {
  if (!isoDate) return 'Recent';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return 'Recent';

  const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${datePart} at ${timePart}`;
}

export default function StandaloneAuditLogPage() {
  const [logs, setLogs] = useState<UsageLogItem[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeActive, setRealtimeActive] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [poolFilter, setPoolFilter] = useState<'all' | 'free_daily' | 'credit_funded'>('all');
  const [featureFilter, setFeatureFilter] = useState<string>('all');

  const supabase = createClient();

  const loadData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const [walletRes, historyRes] = await Promise.all([
        supabase.from('credit_wallets').select('balance').eq('user_id', user.id).maybeSingle(),
        fetch(`/api/billing/usage-history?limit=300&t=${Date.now()}`, { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);

      const bal =
        walletRes.data && typeof walletRes.data.balance === 'number'
          ? walletRes.data.balance
          : 0;

      setWalletBalance(bal);

      if (historyRes) {
        setLogs(Array.isArray(historyRes.items) ? historyRes.items : []);
        setSummary(historyRes.summary || null);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  }, [supabase]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
      toast.success('Live audit ledger synchronized');
    } catch {
      toast.error('Could not refresh audit log');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        await loadData();
      } finally {
        if (active) setLoading(false);
      }
    };

    void init();

    // Setup live real-time synchronization on ai_request_log and credit_wallets
    let channel: any = null;
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      channel = supabase
        .channel(`realtime:audit_log:${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'ai_request_log', filter: `user_id=eq.${user.id}` },
          () => {
            void loadData();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'credit_wallets', filter: `user_id=eq.${user.id}` },
          () => {
            void loadData();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED' && active) {
            setRealtimeActive(true);
          }
        });
    });

    return () => {
      active = false;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [loadData, supabase]);

  // Unique features list for filter dropdown
  const uniqueFeatures = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => {
      if (l.feature) set.add(l.feature);
    });
    return Array.from(set);
  }, [logs]);

  // Filtered logs computation
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return logs.filter((log) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const featName = humanizeFeature(log.feature).label.toLowerCase();
        const provName = humanizeProvider(log.provider).toLowerCase();
        const dateStr = log.called_at.toLowerCase();
        if (!featName.includes(q) && !provName.includes(q) && !dateStr.includes(q) && !log.feature.toLowerCase().includes(q)) {
          return false;
        }
      }

      // 2. Time Filter
      const logDate = new Date(log.called_at);
      if (timeFilter === 'today' && logDate < startOfToday) {
        return false;
      }
      if (timeFilter === '7days' && logDate < sevenDaysAgo) {
        return false;
      }
      if (timeFilter === '30days' && logDate < thirtyDaysAgo) {
        return false;
      }

      // 3. Pool Filter
      if (poolFilter !== 'all' && log.pool_type !== poolFilter) {
        return false;
      }

      // 4. Feature Filter
      if (featureFilter !== 'all' && log.feature !== featureFilter) {
        return false;
      }

      return true;
    });
  }, [logs, searchQuery, timeFilter, poolFilter, featureFilter]);

  // Export to CSV function
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('No log records to export');
      return;
    }

    const headers = ['ID', 'Timestamp', 'Feature', 'Provider', 'Pool Type', 'Points Deducted', 'Credits Deducted'];
    const rows = filteredLogs.map((l) => [
      l.id,
      new Date(l.called_at).toISOString(),
      `"${humanizeFeature(l.feature).label}"`,
      `"${humanizeProvider(l.provider)}"`,
      l.pool_type,
      l.cost_points,
      l.cost_credits.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `unistudy-ai-compute-audit-log-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Audit log exported to CSV');
  };

  const formattedWalletCredits = useMemo(() => {
    return (walletBalance / 100).toFixed(2).replace(/\.00$/, '');
  }, [walletBalance]);

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary animate-pulse">
          <History className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-bold text-foreground">Loading Standalone AI Compute Audit Ledger</p>
          <p className="text-xs font-mono text-muted-foreground">
            Streaming real-time operations, inference tokens, and compute point deductions...
          </p>
        </div>
      </div>
    );
  }

  const totalPointsInView = filteredLogs.reduce((acc, l) => acc + l.cost_points, 0);

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 pb-16">
      {/* Compact Usage History Header */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border/80 pb-4">
        <div className="space-y-1">
          <Link
            href="/dashboard/settings/billing"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Billing
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Credit Usage History
          </h1>
        </div>

        {/* Action Controls & Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Live Sync Status Pill */}
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-mono font-medium',
              realtimeActive
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-border bg-muted/30 text-muted-foreground'
            )}
            title={realtimeActive ? 'Realtime WebSocket subscription active' : 'Connecting to live updates...'}
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full shrink-0',
                realtimeActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/60'
              )}
            />
            <span>{realtimeActive ? 'Live Sync Active' : 'Connecting Sync...'}</span>
          </div>

          {/* Settings Tabs */}
          <div className="inline-flex items-center rounded-xl border border-border bg-muted/40 p-1">
            <Link
              href="/dashboard/settings/profile"
              className="inline-flex items-center gap-1.5 rounded-lg text-muted-foreground hover:text-foreground px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5" />
              Profile
            </Link>
            <Link
              href="/dashboard/settings/accessibility"
              className="inline-flex items-center gap-1.5 rounded-lg text-muted-foreground hover:text-foreground px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <Accessibility className="w-3.5 h-3.5" />
              Accessibility
            </Link>
            <Link
              href="/dashboard/settings/billing"
              className="inline-flex items-center gap-1.5 rounded-lg text-muted-foreground hover:text-foreground px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Billing
            </Link>
            <Link
              href="/dashboard/settings/billing/audit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-background text-foreground shadow-xs px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <History className="w-3.5 h-3.5 text-primary" />
              Audit Log
            </Link>
          </div>

          <button
            type="button"
            onClick={() => void handleManualRefresh()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card hover:bg-muted px-3.5 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </header>

      {/* 4-Tile High-Precision Telemetry Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/80 bg-card p-5 flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Lifetime Compute Spent
            </p>
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono text-foreground tracking-tight">
                {summary ? summary.total_credits_used.toFixed(2) : '0.00'}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">credits</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">
              {summary ? summary.total_points_used.toLocaleString() : 0} compute points total
            </p>
          </div>
          <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
            Across <strong>{summary ? summary.total_count : logs.length}</strong> logged AI operations
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Today’s Compute
            </p>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono text-foreground tracking-tight">
                {summary ? summary.today_credits_used.toFixed(2) : '0.00'}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">credits today</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">
              {summary ? summary.today_points_used.toLocaleString() : 0} pts since 00:00 UTC
            </p>
          </div>
          <div className="pt-2 border-t border-border/60 text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Free daily allowance pool applied
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              In View Deductions
            </p>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono text-foreground tracking-tight">
                {(totalPointsInView / 100).toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">credits in filter</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">
              {totalPointsInView.toLocaleString()} pts in current view
            </p>
          </div>
          <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
            Displaying <strong>{filteredLogs.length}</strong> of <strong>{logs.length}</strong> records
          </div>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-5 flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Current Wallet Balance
            </p>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono text-foreground tracking-tight">
                {formattedWalletCredits}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">credits left</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">
              {walletBalance.toLocaleString()} pts rollover balance
            </p>
          </div>
          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
            <Link
              href="/dashboard/settings/billing#top-up-options"
              className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
            >
              Top Up Credits <ArrowUpRight className="w-3 h-3" />
            </Link>
            <span className="text-emerald-500 font-semibold">Never expires</span>
          </div>
        </div>
      </section>

      {/* Main Audit Feed Section */}
      <section className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 space-y-5 shadow-xs">
        {/* Controls Toolbar: Search, Filters & Export */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-4 border-b border-border/60">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by feature, AI engine, or date..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Time Filter */}
            <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setTimeFilter('all')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer',
                  timeFilter === 'all'
                    ? 'bg-background text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('today')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer',
                  timeFilter === 'today'
                    ? 'bg-background text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('7days')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer',
                  timeFilter === '7days'
                    ? 'bg-background text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Past 7d
              </button>
              <button
                type="button"
                onClick={() => setTimeFilter('30days')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer',
                  timeFilter === '30days'
                    ? 'bg-background text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Past 30d
              </button>
            </div>

            {/* Pool Type Filter */}
            <select
              value={poolFilter}
              onChange={(e) => setPoolFilter(e.target.value as any)}
              aria-label="Filter by deduction pool"
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              <option value="all">All Deduction Pools</option>
              <option value="free_daily">Free Daily Allowance</option>
              <option value="credit_funded">Wallet Balance</option>
            </select>

            {/* Feature Filter */}
            {uniqueFeatures.length > 0 && (
              <select
                value={featureFilter}
                onChange={(e) => setFeatureFilter(e.target.value)}
                aria-label="Filter by AI feature"
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="all">All Features ({uniqueFeatures.length})</option>
                {uniqueFeatures.map((f) => (
                  <option key={f} value={f}>
                    {humanizeFeature(f).label}
                  </option>
                ))}
              </select>
            )}

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-colors cursor-pointer"
              title="Export filtered records to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Feature Breakdown Summary Cards */}
        {summary?.feature_breakdown && Object.keys(summary.feature_breakdown).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Consumption Distribution by AI Feature
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {Object.entries(summary.feature_breakdown)
                .sort((a, b) => b[1].points - a[1].points)
                .map(([featKey, val]) => {
                  const meta = humanizeFeature(featKey);
                  return (
                    <button
                      key={featKey}
                      type="button"
                      onClick={() => setFeatureFilter(featureFilter === featKey ? 'all' : featKey)}
                      className={cn(
                        'text-left rounded-xl border p-3 space-y-1 transition-all cursor-pointer',
                        featureFilter === featKey
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                          : 'border-border/70 bg-muted/15 hover:border-primary/40'
                      )}
                    >
                      <div className="text-[11px] font-bold text-foreground truncate">{meta.label}</div>
                      <div className="text-base font-extrabold font-mono text-primary">
                        {val.points.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">pts</span>
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {val.credits.toFixed(2)} cr ({val.count}x)
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* Audit Log Table */}
        {filteredLogs.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <History className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">No Records Match Current Filters</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Try resetting your search query, time period, or feature dropdown to see earlier operations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTimeFilter('all');
                setPoolFilter('all');
                setFeatureFilter('all');
              }}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1 font-mono">
              <span>Showing {filteredLogs.length} verified operations</span>
              <span>Sorted by latest execution</span>
            </div>

            <div className="border rounded-2xl overflow-hidden divide-y divide-border/60 bg-card">
              {filteredLogs.map((log) => {
                const meta = humanizeFeature(log.feature);
                const Icon = meta.icon;
                const providerName = humanizeProvider(log.provider);
                const isFreeDaily = log.pool_type === 'free_daily';

                return (
                  <div
                    key={log.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-bold text-foreground truncate">{meta.label}</p>
                          <span
                            className={cn(
                              'text-[10px] font-mono px-2 py-0.5 rounded font-medium shrink-0',
                              isFreeDaily
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : 'bg-primary/10 text-primary border border-primary/25'
                            )}
                          >
                            {isFreeDaily ? 'Free Daily Allowance' : 'Wallet Deduction'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-mono">
                          <span className="text-foreground/80 font-semibold">{providerName}</span>
                          <span>•</span>
                          <span>{formatFullDate(log.called_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 self-end sm:self-center">
                      <span className="font-mono text-xs font-bold text-foreground px-3 py-1.5 rounded-lg bg-muted/60 border border-border/80 inline-block">
                        -{log.cost_points} pts <span className="text-muted-foreground font-normal">(-{log.cost_credits.toFixed(2)} cr)</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
