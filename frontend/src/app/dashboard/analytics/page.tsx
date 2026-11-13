'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Cpu,
  Zap,
  Coins,
  LineChart,
  RefreshCw,
  Download,
  BookOpen,
  BarChart3,
  Award,
  CheckCircle2,
  Copy,
  Check,
  Calendar,
  Activity,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import { StudyHeatmap } from '@/components/analytics/StudyHeatmap';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VelocityTopicItem {
  lecture_title: string;
  days_to_master: number;
}

interface VelocityData {
  avgVelocity: string | number | null;
  baseline: string | number;
  trend: string;
  masteredCount?: number;
  quizzesTaken?: number;
  data?: VelocityTopicItem[];
}

interface PeakHourItem {
  hour: number;
  formattedHour: string;
  avg: number;
  count: number;
}

interface BestTimeData {
  insufficient?: boolean;
  count?: number;
  required?: number;
  totalAttempts?: number;
  peakHours?: PeakHourItem[];
  hourlyAvg?: PeakHourItem[];
}

interface BlindSpotItem {
  lectureId: string;
  courseId: string;
  title: string;
  avgConf: number;
  avgScore: number;
  isBlindSpot: boolean;
  insight?: string;
}

interface ProviderQuotaEntry {
  daily_used: number;
  daily_limit: number;
}

interface QuotaStatusData {
  wallet_balance?: number;
  gemini?: ProviderQuotaEntry;
  groq_70b?: ProviderQuotaEntry;
  groq_8b?: ProviderQuotaEntry;
  cohere?: ProviderQuotaEntry;
  youtube?: ProviderQuotaEntry;
  [key: string]: unknown;
}

interface CourseSummary {
  id: string;
  course_code?: string;
  title?: string;
  course_name?: string;
}

interface BenchmarkItem {
  lecture_title: string;
  student_avg: number | null;
  course_avg: number | null;
  percentile: number | null;
}

interface SemesterReviewStats {
  courses: number;
  topTopic: string;
  hardestLecture: string;
  bestQuiz: number;
  streak: number;
  totalHours: number;
}

type AnalyticsFilterTab = 'all' | 'velocity' | 'retention' | 'quota';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsFilterTab>('all');
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [velocity, setVelocity] = useState<VelocityData | null>(null);
  const [bestTime, setBestTime] = useState<BestTimeData | null>(null);
  const [blindSpots, setBlindSpots] = useState<BlindSpotItem[]>([]);
  const [quota, setQuota] = useState<QuotaStatusData | null>(null);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [benchmarks, setBenchmarks] = useState<BenchmarkItem[]>([]);
  const [loadedBenchmarkCourseId, setLoadedBenchmarkCourseId] = useState<string>('');
  const loadingBenchmarks = Boolean(
    selectedCourseId && loadedBenchmarkCourseId !== selectedCourseId
  );

  const [semesterNarrative, setSemesterNarrative] = useState<string>('');
  const [semesterStats, setSemesterStats] = useState<SemesterReviewStats | null>(null);
  const [loadingNarrative, setLoadingNarrative] = useState(false);
  const [copiedNarrative, setCopiedNarrative] = useState(false);

  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAllTelemetry = useCallback(async (isManualRefresh = false) => {
    try {
      const [heatRes, velRes, timeRes, blindRes, quotaRes, coursesRes] = await Promise.all([
        fetch('/api/analytics/heatmap')
          .then((r) => (r.ok ? r.json() : {}))
          .catch(() => ({})),
        fetch('/api/analytics/velocity')
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch('/api/analytics/best-time')
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch('/api/analytics/blind-spots')
          .then((r) => (r.ok ? r.json() : { blindSpots: [] }))
          .catch(() => ({ blindSpots: [] })),
        fetch('/api/quota/status')
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch('/api/courses')
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
      ]);

      setHeatmapData((heatRes as Record<string, number>) || {});
      setVelocity(velRes as VelocityData | null);
      setBestTime(timeRes as BestTimeData | null);
      setBlindSpots(
        Array.isArray((blindRes as { blindSpots?: BlindSpotItem[] })?.blindSpots)
          ? (blindRes as { blindSpots: BlindSpotItem[] }).blindSpots
          : []
      );
      setQuota(quotaRes as QuotaStatusData | null);

      const courseList: CourseSummary[] = Array.isArray(coursesRes)
        ? coursesRes
        : Array.isArray((coursesRes as { courses?: CourseSummary[] })?.courses)
        ? (coursesRes as { courses: CourseSummary[] }).courses
        : [];
      setCourses(courseList);
      if (courseList.length > 0) {
        setSelectedCourseId((prev) => prev || courseList[0].id);
      }
      if (isManualRefresh) {
        toast.success('Telemetry synchronized');
      }
    } finally {
      setLoaded(true);
      setRefreshing(false);
    }
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    void fetchAllTelemetry(true);
  };

  useEffect(() => {
    void fetchAllTelemetry(false);
  }, [fetchAllTelemetry]);

  useEffect(() => {
    if (!selectedCourseId) return;
    let cancelled = false;
    fetch(`/api/analytics/benchmark?courseId=${encodeURIComponent(selectedCourseId)}`)
      .then((r) => (r.ok ? r.json() : { benchmarks: [] }))
      .then((payload: { benchmarks?: BenchmarkItem[] }) => {
        if (!cancelled) {
          setBenchmarks(Array.isArray(payload?.benchmarks) ? payload.benchmarks : []);
        }
      })
      .catch(() => {
        if (!cancelled) setBenchmarks([]);
      })
      .finally(() => {
        if (!cancelled) setLoadedBenchmarkCourseId(selectedCourseId);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCourseId]);

  const handleGenerateSemesterReview = async () => {
    setLoadingNarrative(true);
    try {
      const res = await fetch('/api/analytics/semester-review', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Could not generate semester review');
      }
      const data = (await res.json()) as {
        narrative?: string;
        stats?: SemesterReviewStats;
      };
      if (data.narrative) {
        setSemesterNarrative(data.narrative);
      }
      if (data.stats) {
        setSemesterStats(data.stats);
      }
      toast.success('Generated empirical semester review');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate semester review');
    } finally {
      setLoadingNarrative(false);
    }
  };

  const heatmapSummary = useMemo(() => {
    const entries = Object.entries(heatmapData).filter(([, score]) => Number(score) > 0);
    const activeDays = entries.length;
    const totalPoints = entries.reduce((sum, [, score]) => sum + Number(score), 0);
    const peakDayPoints = entries.reduce((max, [, score]) => Math.max(max, Number(score)), 0);

    const monthlyTotals = Array.from({ length: 12 }, () => 0);
    for (const [dateStr, score] of entries) {
      const monthIdx = Number(dateStr.split('-')[1]) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        monthlyTotals[monthIdx] += Number(score);
      }
    }
    const maxMonthTotal = Math.max(1, ...monthlyTotals);

    return {
      activeDays,
      totalPoints,
      peakDayPoints,
      monthlyTotals,
      maxMonthTotal,
    };
  }, [heatmapData]);

  const handleExportTelemetry = () => {
    const snapshot = {
      exportedAt: new Date().toISOString(),
      summary: {
        activeStudyDays: heatmapSummary.activeDays,
        totalStudyPoints: heatmapSummary.totalPoints,
        peakDayPoints: heatmapSummary.peakDayPoints,
      },
      velocity,
      bestTime,
      blindSpots,
      benchmarks,
      semesterStats,
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unistudy-telemetry-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported learning telemetry report');
  };

  const handleCopyNarrative = async () => {
    if (!semesterNarrative) return;
    try {
      await navigator.clipboard.writeText(semesterNarrative);
      setCopiedNarrative(true);
      toast.success('Copied semester review');
      setTimeout(() => setCopiedNarrative(false), 1800);
    } catch {
      toast.error('Clipboard unavailable');
    }
  };

  const topPeakWindow = bestTime?.peakHours?.[0] || null;
  const sortedHourlyAvg = useMemo(() => {
    if (!bestTime?.hourlyAvg?.length) return [];
    return [...bestTime.hourlyAvg].sort((a, b) => a.hour - b.hour);
  }, [bestTime]);

  const showVelocitySection = activeTab === 'all' || activeTab === 'velocity';
  const showRetentionSection = activeTab === 'all' || activeTab === 'retention';
  const showQuotaSection = activeTab === 'all' || activeTab === 'quota';

  return (
    <div className="max-w-[1380px] mx-auto pb-12 space-y-5">
      {/* Studio Command Header */}
      <header className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono uppercase tracking-wider text-[11px] text-primary font-semibold">
              Cognitive Telemetry Studio
            </span>
            <span aria-hidden="true">/</span>
            <span>Mastery Velocity · Circadian Retention · Cohort Benchmarks</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <LineChart className="w-6 h-6 text-primary" strokeWidth={1.75} />
            Analytics &amp; Insights
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Empirical learning velocity, circadian quiz performance windows, confidence-vs-score
            blind spots, and daily AI compute telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {quota && typeof quota.wallet_balance === 'number' && (
            <Link
              href="/dashboard/settings/billing"
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/15 px-3.5 py-2 text-xs font-semibold text-primary transition-colors"
            >
              <Coins className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">{quota.wallet_balance.toLocaleString()}</span>{' '}
              Credits
            </Link>
          )}

          <button
            type="button"
            onClick={handleExportTelemetry}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted px-3.5 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            Export JSON
          </button>

          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background hover:bg-muted px-3.5 py-2 text-xs font-semibold text-foreground transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </header>

      {/* 4-Tile Executive Telemetry Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/80 bg-card px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Annual Study Volume
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {heatmapSummary.totalPoints.toLocaleString()}{' '}
              <span className="text-xs font-normal text-muted-foreground">pts</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {heatmapSummary.activeDays} active days · Peak {heatmapSummary.peakDayPoints} pts/day
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Mastery Velocity
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {velocity?.avgVelocity != null ? `${velocity.avgVelocity}d` : 'Calibrating'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {velocity?.trend || 'Baseline 3.5d'} · {velocity?.masteredCount || 0} modules mastered
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Peak Retention Window
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {topPeakWindow ? topPeakWindow.formattedHour : 'Log 2+ Quizzes'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {topPeakWindow
                ? `${topPeakWindow.avg.toFixed(1)}% avg across ${bestTime?.totalAttempts || topPeakWindow.count} quizzes`
                : `${bestTime?.count || 0} of ${bestTime?.required || 2} quizzes recorded`}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="rounded-xl border border-border/80 bg-card px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Knowledge Calibration
            </p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground mt-0.5">
              {blindSpots.length === 0 ? 'Calibrated' : `${blindSpots.length} Blind Spots`}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {blindSpots.length === 0
                ? 'Confidence matches quiz accuracy'
                : 'High confidence vs <70% quiz score'}
            </p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="rounded-2xl border border-border/80 bg-card p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-xl border border-border bg-muted/40 p-1 gap-1">
          {[
            { id: 'all' as const, label: 'All Telemetry' },
            { id: 'velocity' as const, label: 'Velocity & Benchmarks' },
            { id: 'retention' as const, label: 'Retention & Blind Spots' },
            { id: 'quota' as const, label: 'AI Quota & Semester Review' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-[11px] font-mono text-muted-foreground px-1">
          {loaded ? 'Live Supabase + Redis Telemetry' : 'Synchronizing metrics...'}
        </span>
      </section>

      {/* 1. Full-Width Study Consistency Matrix + 12-Month Breakdown */}
      {showRetentionSection && (
        <section className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                Annual Study Consistency Matrix
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Daily cognitive engagement aggregated across focus blocks, module quizzes, and slide
                confidence ratings.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg border border-border bg-muted/30">
                Active Days: <strong className="text-foreground">{heatmapSummary.activeDays}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg border border-border bg-muted/30">
                Total: <strong className="text-foreground">{heatmapSummary.totalPoints} pts</strong>
              </span>
            </div>
          </div>

          <StudyHeatmap data={heatmapData} />

          {/* 12-Month Activity Distribution Bar Strip */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mb-2">
              <span>Monthly Engagement Distribution ({new Date().getFullYear()})</span>
              <span>Points per Month</span>
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
              {MONTH_LABELS.map((month, idx) => {
                const pts = heatmapSummary.monthlyTotals[idx] || 0;
                const heightPct =
                  pts > 0 ? Math.max(14, Math.round((pts / heatmapSummary.maxMonthTotal) * 100)) : 6;
                return (
                  <div
                    key={month}
                    className="rounded-xl border border-border/60 bg-background/60 p-2 flex flex-col items-center justify-end gap-1.5"
                  >
                    <span className="text-[10px] font-mono tabular-nums text-muted-foreground">
                      {pts}
                    </span>
                    <div className="w-full h-12 bg-muted/40 rounded-md flex items-end overflow-hidden p-0.5">
                      <div
                        className={cn(
                          'w-full rounded-sm transition-all duration-300',
                          pts > 0 ? 'bg-emerald-500' : 'bg-muted-foreground/20'
                        )}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-foreground">
                      {month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 2. Velocity + Peak Circadian Window Split Grid */}
      {showVelocitySection && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Learning Velocity & Per-Module Mastery Breakdown (6 cols) */}
          <div className="lg:col-span-6 rounded-2xl border border-border/80 bg-card p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Learning Velocity &amp; Mastery Speed
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Average days elapsed from initial exposure to scoring ≥75% on module assessments.
                  </p>
                </div>
                <span
                  className={cn(
                    'text-xs font-mono font-semibold px-2.5 py-1 rounded-lg border',
                    velocity?.trend === 'Accelerating'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500'
                      : velocity?.trend === 'Slowing'
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-500'
                      : 'border-primary/30 bg-primary/10 text-primary'
                  )}
                >
                  {velocity?.trend || 'Calibrating'}
                </span>
              </div>

              {velocity && velocity.avgVelocity != null ? (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">
                        Avg Velocity
                      </span>
                      <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                        {velocity.avgVelocity}d
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">
                        Target Baseline
                      </span>
                      <p className="text-xl font-bold font-mono text-foreground mt-0.5">
                        {velocity.baseline}d
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/60 p-3">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground">
                        Mastered
                      </span>
                      <p className="text-xl font-bold font-mono text-emerald-500 mt-0.5">
                        {velocity.masteredCount || 0}
                      </p>
                    </div>
                  </div>

                  {velocity.data && velocity.data.length > 0 && (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                        Mastered Lecture Breakdown
                      </p>
                      {velocity.data.map((item, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-border/70 bg-background/60 px-3 py-2 flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="font-medium text-foreground truncate">
                            {item.lecture_title}
                          </span>
                          <span className="font-mono text-emerald-500 font-semibold shrink-0">
                            {item.days_to_master} {item.days_to_master === 1 ? 'day' : 'days'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/80 bg-background/40 p-6 text-center space-y-2">
                  <TrendingUp className="w-8 h-8 text-primary/50 mx-auto" />
                  <p className="text-sm font-semibold text-foreground">
                    {velocity?.quizzesTaken
                      ? `${velocity.quizzesTaken} quiz attempts logged — awaiting first ≥75% mastery`
                      : 'No Mastery Velocity Recorded Yet'}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Score 75% or higher on course lecture quizzes to benchmark how quickly you master
                    new topics against the 3.5-day baseline.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span>Mastery threshold: ≥75% quiz score</span>
              <Link
                href="/dashboard/courses"
                className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
              >
                Open Course Quizzes
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Circadian Retention & Peak Performance Window (6 cols) */}
          <div className="lg:col-span-6 rounded-2xl border border-border/80 bg-card p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    Circadian Retention &amp; Peak Hours
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Empirical quiz accuracy grouped by hour of day to pinpoint your optimal revision
                    windows.
                  </p>
                </div>
                {bestTime?.totalAttempts ? (
                  <span className="text-xs font-mono text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-lg border border-border">
                    {bestTime.totalAttempts} quizzes analyzed
                  </span>
                ) : null}
              </div>

              {bestTime && !bestTime.insufficient && bestTime.peakHours?.length ? (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {bestTime.peakHours.map((ph, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-3 flex items-center justify-between gap-3"
                      >
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
                            Peak Window #{i + 1}
                          </span>
                          <p className="text-lg font-bold font-mono text-foreground mt-0.5">
                            {ph.formattedHour}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {ph.count} {ph.count === 1 ? 'assessment' : 'assessments'} logged
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-bold font-mono text-emerald-500">
                            {ph.avg.toFixed(0)}%
                          </span>
                          <p className="text-[10px] font-mono text-muted-foreground">Avg Score</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {sortedHourlyAvg.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                        Hourly Quiz Accuracy Distribution
                      </p>
                      <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                        {sortedHourlyAvg.map((item) => (
                          <div key={item.hour} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-foreground">{item.formattedHour}</span>
                              <span className="text-muted-foreground">
                                <strong className="text-foreground">{item.avg.toFixed(1)}%</strong> (
                                {item.count}x)
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${Math.min(100, Math.max(5, item.avg))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/80 bg-background/40 p-6 text-center space-y-2">
                  <Clock className="w-8 h-8 text-emerald-500/50 mx-auto" />
                  <p className="text-sm font-semibold text-foreground">
                    {bestTime?.count
                      ? `${bestTime.count} / ${bestTime.required || 2} quizzes logged`
                      : 'Awaiting Quiz Timestamps'}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Complete at least 2 module quizzes across different study sessions to unlock your
                    hourly retention curve.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span>Schedule high-weight exams during peak hours</span>
              <Link
                href="/dashboard/calendar"
                className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
              >
                Open Study Calendar
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 3. Course Cohort Benchmarking Inspector */}
      {showVelocitySection && (
        <section className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Course Cohort Benchmark Inspector
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Compare your lecture quiz averages against the course-wide benchmark and percentile
                standing.
              </p>
            </div>

            {courses.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-mono text-muted-foreground">Course:</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code ? `${c.course_code} — ` : ''}
                      {c.title || c.course_name || 'Course'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {loadingBenchmarks ? (
            <div className="py-10 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Loading lecture benchmarks...
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-background/40 p-6 text-center space-y-2">
              <BookOpen className="w-7 h-7 text-muted-foreground/50 mx-auto" />
              <p className="text-sm font-semibold text-foreground">No Active Courses Found</p>
              <p className="text-xs text-muted-foreground">
                Create a course and upload lectures to compare your quiz performance per module.
              </p>
            </div>
          ) : benchmarks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-background/40 p-6 text-center space-y-1.5">
              <p className="text-sm font-semibold text-foreground">
                No Lecture Benchmarks Logged for This Course Yet
              </p>
              <p className="text-xs text-muted-foreground">
                Take a quiz on any lecture in this course to populate module-level percentile
                comparisons.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {benchmarks.map((b, idx) => {
                const studentScore = b.student_avg ?? 0;
                const cohortScore = b.course_avg ?? 0;
                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-border/70 bg-background/60 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground line-clamp-1">
                        {b.lecture_title}
                      </p>
                      {b.percentile != null && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold shrink-0">
                          P{b.percentile}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Your Average</span>
                        <span className="font-mono font-bold text-foreground">
                          {b.student_avg != null ? `${b.student_avg}%` : 'Not attempted'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(100, Math.max(0, studentScore))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-muted-foreground">Course Benchmark</span>
                        <span className="font-mono text-muted-foreground">
                          {b.course_avg != null ? `${b.course_avg}%` : '--'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500/70"
                          style={{ width: `${Math.min(100, Math.max(0, cohortScore))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 4. Metacognitive Blind Spot Detector */}
      {showRetentionSection && (
        <section className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                Metacognitive Blind Spot Detector
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Detects recognition-vs-recall illusions where slide confidence is high (≥3.0/5) but
                empirical quiz score is under 70%.
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {blindSpots.length === 0
                ? '0 illusions detected'
                : `${blindSpots.length} high-priority review targets`}
            </span>
          </div>

          {blindSpots.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {blindSpots.map((bs, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-foreground text-sm">{bs.title}</p>
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-background/70 border border-border/60 px-3 py-2">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                        Self-Confidence
                      </span>
                      <span className="text-sm font-bold font-mono text-foreground">
                        {bs.avgConf.toFixed(1)} / 5.0
                      </span>
                    </div>
                    <div className="rounded-lg bg-background/70 border border-border/60 px-3 py-2">
                      <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                        Actual Quiz Avg
                      </span>
                      <span className="text-sm font-bold font-mono text-amber-500">
                        {bs.avgScore.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {bs.insight && (
                    <p className="text-xs text-muted-foreground leading-relaxed bg-background/50 rounded-lg p-2.5 border border-border/50">
                      {bs.insight}
                    </p>
                  )}

                  {bs.courseId && (
                    <div className="flex items-center justify-end">
                      <Link
                        href={`/dashboard/courses/${bs.courseId}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Drill Topic Now →
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border/70 bg-background/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Metacognitive Calibration Verified
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    No overconfidence gaps detected. Your self-rated slide comprehension aligns with
                    your empirical quiz scores.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/past-papers"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card hover:bg-muted px-3.5 py-2 text-xs font-semibold text-foreground shrink-0"
              >
                Test in Past Papers →
              </Link>
            </div>
          )}
        </section>
      )}

      {/* 5. AI Semester Executive Review + Daily Provider Allowances */}
      {showQuotaSection && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* AI Semester Review Generator (6 cols) */}
          <div className="lg:col-span-6 rounded-2xl border border-border/80 bg-card p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    Empirical Semester Executive Review
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Synthesize your active courses, best quiz scores, and weakest topics into an
                    actionable academic mentor briefing.
                  </p>
                </div>

                {semesterNarrative && (
                  <button
                    type="button"
                    onClick={handleCopyNarrative}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background hover:bg-muted px-2.5 py-1 text-xs font-medium cursor-pointer"
                  >
                    {copiedNarrative ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    Copy
                  </button>
                )}
              </div>

              {semesterStats && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-border/70 bg-background/60 p-2.5">
                    <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                      Courses
                    </span>
                    <span className="text-sm font-bold font-mono text-foreground">
                      {semesterStats.courses}
                    </span>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/60 p-2.5">
                    <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                      Peak Quiz
                    </span>
                    <span className="text-sm font-bold font-mono text-emerald-500">
                      {semesterStats.bestQuiz}%
                    </span>
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background/60 p-2.5">
                    <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                      Est. Study
                    </span>
                    <span className="text-sm font-bold font-mono text-foreground">
                      {semesterStats.totalHours}h
                    </span>
                  </div>
                </div>
              )}

              {semesterNarrative ? (
                <div className="rounded-xl border border-border/80 bg-background p-4 space-y-2.5 text-xs sm:text-sm text-foreground/90 leading-relaxed max-h-[260px] overflow-y-auto">
                  {semesterNarrative
                    .split(/\n{2,}/)
                    .map((p) => p.trim())
                    .filter(Boolean)
                    .map((para, idx) => (
                      <p key={idx}>{para}</p>
                    ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border/80 bg-background/40 p-6 text-center space-y-2">
                  <Award className="w-8 h-8 text-primary/50 mx-auto" />
                  <p className="text-sm font-semibold text-foreground">
                    Generate Your Semester Performance Briefing
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Analyzes your course load, highest quiz scores, and lowest-confidence lectures to
                    produce a 3-paragraph revision strategy.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleGenerateSemesterReview}
              disabled={loadingNarrative}
              className="w-full rounded-xl bg-primary text-primary-foreground hover:opacity-95 disabled:opacity-50 py-2.5 px-4 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {loadingNarrative ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Synthesizing Semester Telemetry...
                </>
              ) : (
                <>
                  <Award className="w-4 h-4" />
                  {semesterNarrative ? 'Refresh Semester Review' : 'Generate Semester Review'}
                </>
              )}
            </button>
          </div>

          {/* Daily AI Provider Allowances (6 cols) */}
          <div className="lg:col-span-6 rounded-2xl border border-border/80 bg-card p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-primary" />
                    Daily AI Compute &amp; Provider Allowances
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Real-time token and request allowances across Vision, Deep Reasoning, and Search
                    pools (resets at 00:00 UTC).
                  </p>
                </div>
                <Link
                  href="/pricing"
                  className="text-xs font-semibold text-primary hover:underline shrink-0"
                >
                  Top up credits →
                </Link>
              </div>

              {quota ? (
                <div className="space-y-2.5 pt-1">
                  {[
                    { key: 'gemini', label: 'Gemini 2.5 (Vision OCR, Slides & Grading)' },
                    { key: 'groq_70b', label: 'Groq Llama 3.3 70B (CAS Tutor & Essays)' },
                    { key: 'groq_8b', label: 'Groq 8B Instant (Fast Briefs & Tagging)' },
                    { key: 'cohere', label: 'Cohere Rerank (Semantic RAG Search)' },
                    { key: 'youtube', label: 'YouTube Data v3 (Lecture Discovery)' },
                  ].map(({ key, label }) => {
                    const entry = quota[key] as ProviderQuotaEntry | undefined;
                    if (!entry) return null;
                    const used = entry.daily_used || 0;
                    const limit = entry.daily_limit || 0;
                    const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
                    const isHigh = pct > 85;

                    return (
                      <div
                        key={key}
                        className="rounded-xl border border-border/70 bg-background/60 p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-foreground flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-primary" />
                            {label}
                          </span>
                          <span className="font-mono text-muted-foreground tabular-nums">
                            {used.toLocaleString()} / {limit.toLocaleString()}
                          </span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                        {isHigh && (
                          <p className="text-[10px] text-amber-500 font-mono text-right">
                            Approaching daily free cap — wallet credits active as overflow
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : loaded ? (
                <div className="rounded-xl border border-dashed border-border/80 bg-background/40 p-6 text-center space-y-1">
                  <Cpu className="w-8 h-8 text-muted-foreground/40 mx-auto mb-1" />
                  <p className="text-sm font-semibold text-foreground">
                    Standard Daily Allowances Active
                  </p>
                  <p className="text-xs text-muted-foreground">
                    5,000 Gemini · 1,000 Groq 70B · 2,000 Groq 8B daily free units reset every 24h.
                  </p>
                </div>
              ) : (
                <div className="py-12 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Synchronizing compute allowances...
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span>Daily free allowances reset at 00:00 UTC</span>
              <Link
                href="/dashboard/settings/billing"
                className="inline-flex items-center gap-1 text-primary font-semibold hover:underline"
              >
                Manage Credit Wallet
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
