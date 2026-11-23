'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CreditCard,
  Coins,
  Zap,
  CheckCircle2,
  ShieldCheck,
  User as UserIcon,
  Accessibility,
  RefreshCw,
  Calculator,
  Layers,
  HelpCircle,
  Lock,
  Cpu,
  FileText,
  Camera,
  LineChart,
  Bot,
  Check,
  Activity,
  History,
  TrendingDown,
  Clock,
  ArrowUpRight,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import CheckoutButton from '@/app/pricing/checkout-button';
import { cn } from '@/lib/utils';

interface UsageSummary {
  points_used_today: number;
  credits_used_today: number;
  points_used_lifetime: number;
  credits_used_lifetime: number;
  total_operations_recorded: number;
}

interface ProviderPoolStatus {
  daily_used: number;
  daily_limit: number;
  daily_remaining: number;
  percentage_used: number;
  daily_resets_at: string | null;
  locked: boolean;
}

interface QuotaStatus {
  wallet_balance?: number;
  wallet_credits?: number;
  free_passes?: number;
  free_passes_limit?: number;
  paid_credits?: number;
  seconds_until_refill?: number;
  next_refill_at?: string;
  tier?: string;
  plan?: string;
  usage_summary?: UsageSummary;
  features_breakdown?: Record<string, { count: number; points: number; credits: number }>;
  gemini?: ProviderPoolStatus;
  groq_70b?: ProviderPoolStatus;
  groq_8b?: ProviderPoolStatus;
  youtube?: ProviderPoolStatus;
  cohere?: ProviderPoolStatus;
}

interface UsageLogItem {
  id: string;
  feature: string;
  provider: string;
  pool_type: string;
  cost_points: number;
  cost_credits: number;
  called_at: string;
}

const CREDIT_BUNDLES_INFO = [
  {
    id: 'starter',
    name: 'Starter Boost',
    price: 10,
    credits: 100,
    baseCredits: 10000,
    tagline: 'Quick boost for weekly revision',
    badge: 'Starter',
    bonus: null,
    popular: false,
    color: 'border-border',
    features: [
      '100 AI Compute Credits',
      'Never expires · Rollover forever',
      '~50 Math / Chat questions',
      'Instant Mobile Money deposit',
    ],
  },
  {
    id: 'standard',
    name: 'Semester Standard',
    price: 25,
    credits: 300,
    baseCredits: 30000,
    tagline: 'Most popular for regular semester coursework',
    badge: 'Most Popular',
    bonus: '+20% Extra Value',
    popular: true,
    color: 'border-primary ring-2 ring-primary/20',
    features: [
      '300 AI Compute Credits',
      'Never expires · Rollover forever',
      '~150 Socratic AI tutor drills',
      '~75 Handwritten slide scans',
      'Priority inference queue',
    ],
  },
  {
    id: 'value',
    name: 'High-Yield Value',
    price: 50,
    credits: 700,
    baseCredits: 70000,
    tagline: 'Best value per credit for heavy revision',
    badge: 'Best Value',
    bonus: '+40% Bonus Credits',
    popular: false,
    color: 'border-emerald-500/40',
    features: [
      '700 AI Compute Credits',
      'Never expires · Rollover forever',
      '~350 Lecture queries & derivations',
      '~175 Essay rubric evaluations',
      'Zero rate-limit throttling',
    ],
  },
  {
    id: 'bulk',
    name: 'Honours Dean’s Pack',
    price: 100,
    credits: 1600,
    baseCredits: 160000,
    tagline: 'Maximum power for finals & thesis preparation',
    badge: 'Max Savings',
    bonus: '+60% Maximum Bonus',
    popular: false,
    color: 'border-amber-500/40',
    features: [
      '1,600 AI Compute Credits',
      'Never expires · Rollover forever',
      '~800 Full-length study operations',
      '~400 Timed past-paper simulations',
      'Dedicated compute allocation',
    ],
  },
];

const UNIT_ECONOMICS = [
  {
    feature: 'Math Problem Solver & 2D Graph Plotter',
    cost: '100 pts (1.00 cr)',
    provider: 'Groq Llama 3.3 70B',
    description: 'LaTeX step-by-step algebraic derivation & interactive curve plot',
    icon: Calculator,
  },
  {
    feature: 'AI Lecture Tutor (Socratic & Practice Drills)',
    cost: '100 pts (1.00 cr)',
    provider: 'Groq Llama 3.3 70B',
    description: 'Interactive slide grounding, /test quizzes, and /plan roadmaps',
    icon: Bot,
  },
  {
    feature: 'Handwritten Notes & Mathpix Formula Scan',
    cost: '200 pts (2.00 cr)',
    provider: 'Google Gemini 2.5 Flash',
    description: 'MixTeX LaTeX OCR, table extraction, and .TEX/.MD export',
    icon: Camera,
  },
  {
    feature: 'Essay Grader & Turnitin Rubric Evaluation',
    cost: '200 pts (2.00 cr)',
    provider: 'Google Gemini 2.5 Flash',
    description: '4-axis scoring, 100/100 exemplar generation, and readability X-ray',
    icon: FileText,
  },
  {
    feature: 'Past Paper AI Examiner Question Grading',
    cost: '200 pts (2.00 cr)',
    provider: 'Google Gemini 2.5 Flash',
    description: 'Rigorous marking scheme rubric with criteria breakdown',
    icon: LineChart,
  },
  {
    feature: 'Spaced-Repetition Flashcard Deck Generation',
    cost: '200 pts (2.00 cr)',
    provider: 'Google Gemini 2.5 Flash',
    description: 'Automated extraction of high-yield testable facts from slides',
    icon: Layers,
  },
  {
    feature: 'Semantic Document Search & Re-ranking',
    cost: '100 pts (1.00 cr)',
    provider: 'Cohere Rerank v3',
    description: 'High-precision cross-slide relevance ranking',
    icon: Cpu,
  },
];

const FAQS = [
  {
    q: 'Do purchased credits ever expire?',
    a: 'No. Purchased wallet credits roll over indefinitely and never expire. They remain in your account until you consume them.',
  },
  {
    q: 'When are wallet credits consumed?',
    a: 'Every user receives generous free daily AI compute allowances that reset every day at midnight UTC. Wallet credits are only drawn upon when you exceed your free daily allowance during heavy study sessions.',
  },
  {
    q: 'Which payment methods are supported in Ghana and Africa?',
    a: 'We process payments via Paystack with bank-grade 256-bit encryption. We support all major Ghanaian Mobile Money providers (MTN MoMo, Telecel Cash, AT Money) and Visa / Mastercard debit & credit cards.',
  },
  {
    q: 'Are payments secure?',
    a: 'Yes. UniStudy never sees or stores your card details or Mobile Money PINs. All transactions are securely handled by Paystack, certified PCI-DSS Level 1 compliant.',
  },
];

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

function formatLogDate(isoDate: string): string {
  if (!isoDate) return 'Recent';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return 'Recent';

  const now = new Date();
  const isToday =
    d.getUTCDate() === now.getUTCDate() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCFullYear() === now.getUTCFullYear();

  const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) {
    return `Today at ${timePart}`;
  }

  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const isYesterday =
    d.getUTCDate() === yesterday.getUTCDate() &&
    d.getUTCMonth() === yesterday.getUTCMonth() &&
    d.getUTCFullYear() === yesterday.getUTCFullYear();

  if (isYesterday) {
    return `Yesterday at ${timePart}`;
  }

  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} at ${timePart}`;
}

export default function BillingSettings() {
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get('payment') === 'success';

  const [balance, setBalance] = useState<number>(0);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [usageLogs, setUsageLogs] = useState<UsageLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [logFilter, setLogFilter] = useState<'all' | 'today'>('all');

  // Estimation Calculator State
  const [calcLectures, setCalcLectures] = useState(15);
  const [calcMath, setCalcMath] = useState(20);
  const [calcEssays, setCalcEssays] = useState(5);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return { balance: 0, quota: null, logs: [] };

      const [walletRes, quotaRes, logsRes] = await Promise.all([
        supabase.from('credit_wallets').select('balance').eq('user_id', user.id).maybeSingle(),
        fetch(`/api/quota/status?t=${Date.now()}`, { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch(`/api/billing/usage-history?limit=30&t=${Date.now()}`, { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);

      let bal = 0;
      if (typeof quotaRes?.wallet_balance === 'number') {
        bal = quotaRes.wallet_balance;
      } else if (walletRes.data && typeof walletRes.data.balance === 'number') {
        bal = walletRes.data.balance;
      } else {
        bal = 20; // Default guaranteed welcome bonus
      }

      const items = Array.isArray(logsRes?.items) ? logsRes.items : [];

      return {
        balance: bal,
        quota: quotaRes as QuotaStatus | null,
        logs: items as UsageLogItem[],
      };
    } catch {
      return { balance: 0, quota: null, logs: [] };
    }
  }, [supabase]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await loadData();
      setBalance(res.balance);
      if (res.quota) setQuota(res.quota);
      setUsageLogs(res.logs);
      toast.success('Wallet & compute telemetry synchronized');
    } catch {
      toast.error('Could not refresh wallet balance');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const res = await loadData();
        if (!active) return;
        setBalance(res.balance);
        if (res.quota) setQuota(res.quota);
        setUsageLogs(res.logs);
      } catch {
        // Fallback default
      } finally {
        if (active) setLoading(false);
      }
    };

    void init();

    // Setup live real-time synchronization on credit_wallets, user_quota, and ai_request_log
    let channel: any = null;
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      channel = supabase
        .channel(`realtime:billing:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'credit_wallets', filter: `user_id=eq.${user.id}` },
          () => {
            void loadData().then((res) => {
              if (active) {
                setBalance(res.balance);
                if (res.quota) setQuota(res.quota);
                setUsageLogs(res.logs);
              }
            });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_quota', filter: `user_id=eq.${user.id}` },
          () => {
            void loadData().then((res) => {
              if (active) {
                setBalance(res.balance);
                if (res.quota) setQuota(res.quota);
                setUsageLogs(res.logs);
              }
            });
          }
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'ai_request_log', filter: `user_id=eq.${user.id}` },
          () => {
            void loadData().then((res) => {
              if (active) {
                setBalance(res.balance);
                if (res.quota) setQuota(res.quota);
                setUsageLogs(res.logs);
              }
            });
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

  useEffect(() => {
    const handleCreditsChanged = (e: Event) => {
      const ce = e as CustomEvent<{ balance?: number }>;
      if (typeof ce.detail?.balance === 'number') {
        setBalance(ce.detail.balance);
      }
    };
    window.addEventListener('unistudy-credits-changed', handleCreditsChanged);
    return () => {
      window.removeEventListener('unistudy-credits-changed', handleCreditsChanged);
    };
  }, []);

  const formattedCreditsLeft = useMemo(() => {
    if (balance > 500) {
      return (balance / 100).toLocaleString(undefined, { maximumFractionDigits: 1 });
    }
    return balance.toString();
  }, [balance]);

  // Filtered usage logs for display
  const displayedLogs = useMemo(() => {
    if (logFilter === 'all') return usageLogs;
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    return usageLogs.filter((l) => new Date(l.called_at) >= startOfToday);
  }, [usageLogs, logFilter]);

  // Estimated monthly requirement calculation
  const estimatedCreditsNeeded = useMemo(() => {
    const totalPoints = calcLectures * 200 + calcMath * 100 + calcEssays * 200;
    return Math.ceil(totalPoints / 100);
  }, [calcLectures, calcMath, calcEssays]);

  // Feature breakdown entries sorted by compute points
  const breakdownEntries = useMemo(() => {
    if (!quota?.features_breakdown) return [];
    return Object.entries(quota.features_breakdown).sort((a, b) => b[1].points - a[1].points);
  }, [quota]);

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary animate-pulse">
          <Coins className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-bold text-foreground">Synchronizing AI Compute Telemetry</p>
          <p className="text-xs font-mono text-muted-foreground">
            Connecting live wallet balances, daily allowance pools, and consumption audit ledger...
          </p>
        </div>
      </div>
    );
  }

  const usageSummary = quota?.usage_summary || {
    credits_used_today: 0,
    points_used_today: 0,
    credits_used_lifetime: 0,
    points_used_lifetime: 0,
    total_operations_recorded: usageLogs.length,
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 pb-16">
      {/* Payment Success Banner */}
      {paymentSuccess && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Payment Received &amp; Credits Deposited!</h3>
              <p className="text-xs text-muted-foreground">
                Your Paystack transaction completed successfully. Your AI compute wallet has been credited in real time.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleManualRefresh()}
            className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/20 px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
          >
            Refresh Balance
          </button>
        </div>
      )}

      {/* Clean Billing Header */}
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Study Credits &amp; Billing
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            View your remaining study credits, free 6-hour passes, and top up via Mobile Money or card.
          </p>
        </div>

        {/* Settings Suite Navigation + Realtime Badge */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Realtime Live Pulse */}
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-mono font-medium',
              realtimeActive
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-border bg-muted/30 text-muted-foreground'
            )}
            title={realtimeActive ? 'Live WebSocket subscription active' : 'Connecting to realtime stream'}
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full shrink-0',
                realtimeActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/60'
              )}
            />
            <span>{realtimeActive ? 'Live Sync Active' : 'Connecting Sync...'}</span>
          </div>

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
              className="inline-flex items-center gap-1.5 rounded-lg bg-background text-foreground shadow-xs px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5 text-primary" />
              Billing
            </Link>
            <Link
              href="/dashboard/settings/billing/audit"
              className="inline-flex items-center gap-1.5 rounded-lg text-muted-foreground hover:text-foreground px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <History className="w-3.5 h-3.5" />
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

      {/* 4-Tile Financial & Live Compute Telemetry Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tile 1: Credits Left (Wallet Balance) */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Credits Left in Wallet
            </p>
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono text-foreground tracking-tight">
                {formattedCreditsLeft}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">credits</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">
              {balance > 500 ? `${balance.toLocaleString()} compute points available` : `${balance} AI Credits ready for use`}
            </p>
          </div>
          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
            <span className="text-emerald-500 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Never expires · Rollover
            </span>
            <a
              href="#top-up-options"
              className="font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
            >
              Top Up <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Tile 2: Credits Used (Today & Lifetime) */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Credits Used
            </p>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono text-foreground tracking-tight">
                {usageSummary.credits_used_today.toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">credits today</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">
              {usageSummary.points_used_today.toLocaleString()} pts used today
            </p>
          </div>
          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Lifetime: <strong className="text-foreground font-mono">{usageSummary.credits_used_lifetime.toFixed(2)} cr</strong></span>
            <span>{usageSummary.total_operations_recorded} requests</span>
          </div>
        </div>

        {/* Tile 3: 6-Hour Free Passes Pool */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Free 6-Hour Passes
            </p>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono text-foreground tracking-tight">
                {quota?.free_passes ?? 8} / {quota?.free_passes_limit ?? 8}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">passes ready</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Burned first before permanent paid credits
            </p>
          </div>
          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground flex items-center gap-1 font-mono text-[11px]">
              <Clock className="w-3 h-3 text-primary" />
              {typeof quota?.seconds_until_refill === 'number' && (quota?.free_passes ?? 8) < (quota?.free_passes_limit ?? 8) && quota.seconds_until_refill > 0
                ? `Refills in ${Math.floor(quota.seconds_until_refill / 3600)}h ${Math.floor((quota.seconds_until_refill % 3600) / 60)}m`
                : 'Refills every 6 hours'}
            </span>
            <span className="text-emerald-500 font-semibold font-mono text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded">
              Active Tier
            </span>
          </div>
        </div>

        {/* Tile 4: Payment Gateway & Security */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 flex flex-col justify-between space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Secure Gateway
            </p>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-foreground tracking-tight">
                Paystack MoMo
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              MTN, Telecel, AT Money &amp; Visa Cards
            </p>
          </div>
          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1 text-emerald-500 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              PCI-DSS Level 1
            </span>
            <span>GH₵ Cedi</span>
          </div>
        </div>
      </section>

      {/* Live AI Usage & Deductions History Quick Preview Card */}
      <section className="rounded-2xl border border-border/80 bg-card p-5 md:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <h3 className="text-base font-bold text-foreground">Live AI Compute Deductions &amp; Audit Log</h3>
              <span className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary tabular-nums">
                {usageLogs.length} live records
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live ledger of exact AI inference operations, engines dispatched, and credit points deducted.
            </p>
          </div>

          <Link
            href="/dashboard/settings/billing/audit"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer shadow-xs shrink-0"
          >
            Open Standalone Audit Log <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Quick Preview of recent operations */}
        {usageLogs.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <Activity className="w-6 h-6 text-muted-foreground/50 mx-auto" />
            <p className="text-xs font-semibold text-foreground">No AI Operations Logged Yet</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              When you scan lecture slides, ask the AI Tutor, solve math equations, or grade past papers, every operation is streamed live.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="divide-y divide-border/60 border rounded-xl overflow-hidden bg-card">
              {usageLogs.slice(0, 4).map((log) => {
                const meta = humanizeFeature(log.feature);
                const Icon = meta.icon;
                const providerName = humanizeProvider(log.provider);
                const isFreeDaily = log.pool_type === 'free_daily';

                return (
                  <div
                    key={log.id}
                    className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-foreground truncate">{meta.label}</p>
                          <span
                            className={cn(
                              'text-[10px] font-mono px-1.5 py-0.5 rounded font-medium shrink-0',
                              isFreeDaily
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : 'bg-primary/10 text-primary border border-primary/25'
                            )}
                          >
                            {isFreeDaily ? 'Free Daily Allowance' : 'Wallet Deduction'}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-2 font-mono">
                          <span>{providerName}</span>
                          <span>•</span>
                          <span>{formatLogDate(log.called_at)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 self-end sm:self-center">
                      <span className="font-mono text-xs font-bold text-foreground px-2 py-1 rounded-md bg-muted/60 border border-border/80 inline-block">
                        -{log.cost_points} pts <span className="text-muted-foreground font-normal">(-{log.cost_credits.toFixed(2)} cr)</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 text-xs">
              <span className="text-muted-foreground font-mono">
                Showing {Math.min(4, usageLogs.length)} of {usageLogs.length} recent operations
              </span>
              <Link
                href="/dashboard/settings/billing/audit"
                className="text-primary font-semibold hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
              >
                View all {usageLogs.length} audit records, search &amp; CSV export →
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Main Top-Up Packages Grid */}
      <section id="top-up-options" className="space-y-4 scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Purchase AI Compute Credit Bundles
            </h2>
            <p className="text-xs text-muted-foreground">
              One-time purchases via Paystack. Credits are only drawn after your daily free allowance is exhausted.
            </p>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md border border-border self-start sm:self-auto">
            Currency: Ghanaian Cedi (GH₵)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {CREDIT_BUNDLES_INFO.map((bundle) => (
            <div
              key={bundle.id}
              className={cn(
                'rounded-2xl border bg-card p-5 flex flex-col justify-between space-y-5 transition-all relative overflow-hidden',
                bundle.popular
                  ? 'border-primary ring-2 ring-primary/25 shadow-lg bg-primary/5 -translate-y-1'
                  : 'border-border/80 hover:border-primary/40 shadow-xs'
              )}
            >
              {bundle.popular && (
                <div className="absolute top-0 right-0">
                  <span className="bg-primary text-primary-foreground text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs inline-flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-current" />
                    {bundle.badge}
                  </span>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                      {bundle.badge}
                    </span>
                    {bundle.bonus && (
                      <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        {bundle.bonus}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-foreground">{bundle.name}</h3>
                  <p className="text-xs text-muted-foreground">{bundle.tagline}</p>
                </div>

                <div className="pt-2 border-t border-border/60">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold font-mono text-foreground">
                      GH₵{bundle.price}
                    </span>
                    <span className="text-xs text-muted-foreground">one-time</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-primary mt-1">
                    <Coins className="w-3.5 h-3.5" />
                    {bundle.credits} Credits ({bundle.baseCredits.toLocaleString()} pts)
                  </div>
                </div>

                <ul className="space-y-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                  {bundle.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2">
                <CheckoutButton
                  bundle_id={bundle.id}
                  label={`Top Up GH₵${bundle.price}`}
                  className={cn(
                    'w-full py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5',
                    bundle.popular
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md'
                      : 'border border-border bg-muted/40 hover:bg-muted text-foreground'
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Two-Column Matrix: Left 7 Cols Consumption Guide + Right 5 Cols Estimator Calculator */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Unit Economics Breakdown Table */}
        <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-card p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Coins className="w-4 h-4 text-primary" />
                Transparent Unit Economics &amp; Feature Costs
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Exact compute deductions per action when drawing from your wallet pool.
              </p>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border">
              1 Credit = 100 Points
            </span>
          </div>

          <div className="divide-y divide-border/60 border rounded-xl overflow-hidden">
            {UNIT_ECONOMICS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.feature}
                  className="p-3.5 flex items-center justify-between gap-3 bg-card hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{item.feature}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                      <span className="inline-block text-[10px] font-mono text-muted-foreground mt-1">
                        Engine: {item.provider}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold font-mono text-primary px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20">
                      {item.cost}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Interactive Credit Estimation Calculator */}
        <div className="lg:col-span-5 rounded-2xl border border-border/80 bg-card p-5 md:p-6 space-y-5">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-500" />
              Semester Revision Credit Calculator
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Estimate your monthly revision compute requirements based on your coursework volume.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Lecture Slides to Scan / Summarize</span>
                <span className="font-mono font-bold text-foreground">{calcLectures} decks</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={calcLectures}
                onChange={(e) => setCalcLectures(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Math Problems &amp; Graph Analyses</span>
                <span className="font-mono font-bold text-foreground">{calcMath} problems</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={calcMath}
                onChange={(e) => setCalcMath(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Essays to Grade &amp; Refine</span>
                <span className="font-mono font-bold text-foreground">{calcEssays} drafts</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={calcEssays}
                onChange={(e) => setCalcEssays(Number(e.target.value))}
                className="w-full accent-primary cursor-pointer"
              />
            </div>
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary/8 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Estimated Compute Need
              </span>
              <span className="text-lg font-bold font-mono text-primary">
                ~{estimatedCreditsNeeded} Credits
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Recommended bundle:{' '}
              <strong className="text-foreground">
                {estimatedCreditsNeeded <= 100
                  ? 'Starter Boost (GH₵10)'
                  : estimatedCreditsNeeded <= 300
                  ? 'Semester Standard (GH₵25)'
                  : estimatedCreditsNeeded <= 700
                  ? 'High-Yield Value (GH₵50)'
                  : 'Honours Dean’s Pack (GH₵100)'}
              </strong>
            </p>
          </div>

          {/* Paystack Security Callout */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Bank-Grade Verification:</strong> Paystack webhook
              HMAC signatures are verified server-side with constant-time equality checks.
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="rounded-2xl border border-border/80 bg-card p-6 space-y-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary" />
          Billing, Credits &amp; Paystack FAQ
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FAQS.map((faq) => (
            <div key={faq.q} className="rounded-xl border border-border/70 bg-muted/15 p-4 space-y-1.5">
              <h4 className="text-xs font-bold text-foreground">{faq.q}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
