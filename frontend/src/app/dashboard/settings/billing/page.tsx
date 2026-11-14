'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import CheckoutButton from '@/app/pricing/checkout-button';
import { cn } from '@/lib/utils';

interface QuotaStatus {
  wallet_balance?: number;
  plan?: string;
  gemini?: { daily_used: number; daily_limit: number };
  groq_70b?: { daily_used: number; daily_limit: number };
  groq_8b?: { daily_used: number; daily_limit: number };
  youtube?: { daily_used: number; daily_limit: number };
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
    cost: '100 pts',
    provider: 'Groq Llama 3.3 70B',
    description: 'LaTeX step-by-step algebraic derivation & interactive curve plot',
    icon: Calculator,
  },
  {
    feature: 'AI Lecture Tutor (Socratic & Practice Drills)',
    cost: '100 pts',
    provider: 'Groq Llama 3.3 70B',
    description: 'Interactive slide grounding, /test quizzes, and /plan roadmaps',
    icon: Bot,
  },
  {
    feature: 'Handwritten Notes & Mathpix Formula Scan',
    cost: '200 pts',
    provider: 'Google Gemini 2.5 Flash',
    description: 'MixTeX LaTeX OCR, table extraction, and .TEX/.MD export',
    icon: Camera,
  },
  {
    feature: 'Essay Grader & Turnitin Rubric Evaluation',
    cost: '200 pts',
    provider: 'Google Gemini 2.5 Flash',
    description: '4-axis scoring, 100/100 exemplar generation, and readability X-ray',
    icon: FileText,
  },
  {
    feature: 'Past Paper AI Examiner Question Grading',
    cost: '200 pts',
    provider: 'Google Gemini 2.5 Flash',
    description: 'Rigorous marking scheme rubric with criteria breakdown',
    icon: LineChart,
  },
  {
    feature: 'Spaced-Repetition Flashcard Deck Generation',
    cost: '200 pts',
    provider: 'Google Gemini 2.5 Flash',
    description: 'Automated extraction of high-yield testable facts from slides',
    icon: Layers,
  },
  {
    feature: 'Semantic Document Search & Re-ranking',
    cost: '100 pts',
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

export default function BillingSettings() {
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get('payment') === 'success';

  const [balance, setBalance] = useState<number>(0);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Estimation Calculator State
  const [calcLectures, setCalcLectures] = useState(15);
  const [calcMath, setCalcMath] = useState(20);
  const [calcEssays, setCalcEssays] = useState(5);

  const loadData = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return { balance: 0, quota: null };

      const [walletRes, quotaRes] = await Promise.all([
        supabase.from('credit_wallets').select('balance').eq('user_id', user.id).maybeSingle(),
        fetch('/api/quota/status')
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);

      const bal =
        walletRes.data && typeof walletRes.data.balance === 'number'
          ? walletRes.data.balance
          : 0;

      return { balance: bal, quota: quotaRes as QuotaStatus | null };
    } catch {
      return { balance: 0, quota: null };
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await loadData();
      setBalance(res.balance);
      if (res.quota) setQuota(res.quota);
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
      } catch {
        // Fallback default
      } finally {
        if (active) setLoading(false);
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, []);

  const formattedCredits = useMemo(() => {
    return (balance / 100).toFixed(2).replace(/\.00$/, '');
  }, [balance]);

  // Estimated monthly requirement calculation
  const estimatedCreditsNeeded = useMemo(() => {
    // 200 pts per lecture (scan/summary), 100 pts per math, 200 pts per essay
    const totalPoints = calcLectures * 200 + calcMath * 100 + calcEssays * 200;
    // Each credit is 100 points
    return Math.ceil(totalPoints / 100);
  }, [calcLectures, calcMath, calcEssays]);

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto p-8 text-center space-y-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary animate-pulse">
          <Coins className="w-5 h-5" />
        </div>
        <p className="text-sm font-mono text-muted-foreground">
          Fetching wallet balance and compute allowances...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 pb-12">
      {/* Payment Success Banner */}
      {paymentSuccess && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Payment Received &amp; Credits Deposited!
              </h3>
              <p className="text-xs text-muted-foreground">
                Your Paystack transaction completed successfully. Your AI compute wallet has been
                credited.
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

      {/* Studio Header & Settings Suite Navigation */}
      <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-border/80 pb-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-mono uppercase tracking-wider">
            <CreditCard className="w-3.5 h-3.5" />
            AI Compute Wallet · Paystack Tier · Unit Economics
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            Wallet, Credits &amp; Compute Billing
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Monitor your available AI compute credits, inspect daily renewable allowances across
            providers, and top up safely with Mobile Money or Bank Card.
          </p>
        </div>

        {/* Settings Suite Navigation */}
        <div className="flex flex-wrap items-center gap-2">
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

      {/* 4-Tile Financial & Compute Telemetry Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Available Wallet Balance
            </p>
            <p className="text-xl font-bold font-mono text-foreground mt-0.5">
              {formattedCredits}{' '}
              <span className="text-xs font-normal text-muted-foreground">credits</span>
            </p>
            <p className="text-[11px] text-emerald-500 font-semibold mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Never expires · Rollover forever
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Coins className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Daily Renewable Pool
            </p>
            <p className="text-xl font-bold font-mono text-foreground mt-0.5">
              5,000{' '}
              <span className="text-xs font-normal text-muted-foreground">pts/day</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Resets midnight UTC across all features
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <Zap className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Active Scholar Tier
            </p>
            <p className="text-xl font-bold font-mono text-foreground mt-0.5">
              Pay-As-You-Go
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Zero subscriptions · No hidden fees
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3.5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Payment Gateway
            </p>
            <p className="text-xl font-bold font-mono text-foreground mt-0.5">
              Paystack MoMo
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              256-Bit SSL · Instant verification
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <Lock className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* Daily Renewable Free Allowance Status */}
      {quota && (
        <section className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" />
                Daily Renewable Free Allowance Pools
              </h3>
              <p className="text-xs text-muted-foreground">
                Free daily allowances reset every night at midnight UTC. Purchased wallet credits are only drawn after these pools reach 100%.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded font-semibold">
                Auto-Renewing Daily
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {[
              {
                name: 'Gemini 2.5 Flash',
                usage: quota.gemini,
                role: 'Note OCR & Essay Grader',
                badge: 'Primary AI',
              },
              {
                name: 'Groq LLaMA 3.3 70B',
                usage: quota.groq_70b,
                role: 'Honors Socratic Tutor',
                badge: 'Reasoning',
              },
              {
                name: 'Groq LLaMA 3.1 8B',
                usage: quota.groq_8b,
                role: 'Fast Slide Chat & QA',
                badge: 'Fast Chat',
              },
              {
                name: 'YouTube Transcripts',
                usage: quota.youtube,
                role: 'Lecture Video Ingestion',
                badge: 'Audio/Video',
              },
            ].map((pool) => {
              const used = pool.usage?.daily_used ?? 0;
              const limit = pool.usage?.daily_limit ?? 1;
              const percent = Math.min(100, Math.round((used / limit) * 100));
              const remaining = Math.max(0, limit - used);

              return (
                <div
                  key={pool.name}
                  className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                      {pool.badge}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-mono px-1.5 py-0.5 rounded font-bold',
                        percent >= 90
                          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                          : percent >= 70
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                            : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                      )}
                    >
                      {percent}% Used
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground truncate">{pool.name}</h4>
                    <p className="text-[11px] text-muted-foreground truncate">{pool.role}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all duration-500',
                          percent >= 90 ? 'bg-rose-500' : percent >= 70 ? 'bg-amber-500' : 'bg-primary'
                        )}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span>{used} / {limit} calls</span>
                      <span>{remaining} left</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Main Top-Up Packages Grid */}
      <section id="top-up-options" className="space-y-4 scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Purchase AI Compute Credit Bundles
            </h2>
            <p className="text-xs text-muted-foreground">
              One-time purchases via Paystack. Credits are only drawn after your daily free allowance
              is exhausted.
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
