'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StudyHeatmap } from '@/components/analytics/StudyHeatmap';
import { TrendingUp, Clock, AlertTriangle, ShieldCheck, Flame, Cpu, Zap, Coins } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';

export default function AnalyticsPage() {
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [velocity, setVelocity] = useState<any>(null);
  const [bestTime, setBestTime] = useState<any>(null);
  const [blindSpots, setBlindSpots] = useState<any[]>([]);
  const [quota, setQuota] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics/heatmap').then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      fetch('/api/analytics/velocity').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/analytics/best-time').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/analytics/blind-spots').then((r) => (r.ok ? r.json() : { blindSpots: [] })).catch(() => ({ blindSpots: [] })),
      fetch('/api/quota/status').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([heatRes, velRes, timeRes, blindRes, quotaRes]) => {
      setHeatmapData(heatRes || {});
      setVelocity(velRes);
      setBestTime(timeRes);
      setBlindSpots(blindRes?.blindSpots || []);
      setQuota(quotaRes);
      setLoaded(true);
    });
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Analytics &amp; Insights</h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1">
            Empirical learning velocity, peak study windows, and knowledge retention metrics.
          </p>
        </div>
        {quota && quota.wallet_balance !== undefined && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold w-fit">
            <Coins size={14} />
            <span>{quota.wallet_balance} Credits Available</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Study Heatmap */}
        <Card className="md:col-span-2 border border-border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Flame className="text-orange-500 w-5 h-5" />
              Study Consistency Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StudyHeatmap data={heatmapData} />
          </CardContent>
        </Card>

        {/* Learning Velocity */}
        <Card className="border border-border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="text-blue-500 w-5 h-5" />
              Learning Velocity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {velocity && velocity.avgVelocity != null ? (
              <div className="space-y-4">
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-black text-foreground">{velocity.avgVelocity}</span>
                  <span className="text-sm text-muted-foreground mb-1">days average to master a topic</span>
                </div>
                <div className="p-3 bg-muted/30 rounded-xl border border-border text-sm">
                  <p className="font-semibold text-foreground">
                    Mastery Trend:{' '}
                    <span
                      className={
                        velocity.trend === 'Accelerating'
                          ? 'text-green-600 dark:text-green-400 font-bold'
                          : velocity.trend === 'Slowing'
                          ? 'text-orange-500 font-bold'
                          : 'text-primary font-bold'
                      }
                    >
                      {velocity.trend}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {velocity.masteredCount || 1} topics mastered. Baseline target is {velocity.baseline} days.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="w-10 h-10 text-blue-400 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium mb-1 text-foreground">
                  {velocity?.quizzesTaken ? `${velocity.quizzesTaken} quiz attempts recorded` : 'Not enough data yet'}
                </p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Score 75% or higher on module quizzes to start measuring your mastery speed.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Peak Performance Time */}
        <Card className="border border-border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="text-emerald-500 w-5 h-5" />
              Peak Performance Window
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bestTime && !bestTime.insufficient && bestTime.peakHours?.length ? (
              <div className="space-y-3">
                {bestTime.peakHours.map((ph: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm">
                        {ph.formattedHour || `${ph.hour}:00`}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">Optimal Revision Window</p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          {ph.avg.toFixed(1)}% average score ({ph.count} {ph.count === 1 ? 'quiz' : 'quizzes'})
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium mb-1 text-foreground">
                  {bestTime?.count ? `${bestTime.count} / ${bestTime.required || 2} quizzes logged` : 'Not enough data yet'}
                </p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Complete quizzes at different times of day to identify your peak retention hours.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Blind Spots */}
        <Card className="md:col-span-2 border border-border shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="text-amber-500 w-5 h-5" />
              Blind Spot Detector
            </CardTitle>
          </CardHeader>
          <CardContent>
            {blindSpots.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {blindSpots.map((bs, i) => (
                  <div
                    key={i}
                    className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl relative overflow-hidden space-y-2"
                  >
                    <div className="absolute top-0 right-0 p-3 pointer-events-none">
                      <AlertTriangle className="text-amber-500 opacity-20 w-12 h-12" />
                    </div>
                    <p className="font-bold text-foreground text-sm sm:text-base pr-8">
                      {bs.title || 'Knowledge Gap'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Self-confidence:{' '}
                        <strong className="text-foreground">{bs.avgConf.toFixed(1)} / 5</strong>
                      </span>
                      <span>
                        Quiz score:{' '}
                        <strong className="text-amber-600 dark:text-amber-400">{bs.avgScore.toFixed(0)}%</strong>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground italic leading-relaxed pt-1">
                      {bs.insight}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-muted/20 rounded-xl border border-border">
                <ShieldCheck className="w-10 h-10 text-amber-500 mx-auto mb-2 opacity-50" />
                <p className="font-semibold text-foreground text-sm">No blind spots detected</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your self-assessed slide confidence closely mirrors your test scores.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Daily Resource Allotment */}
        <Card className="md:col-span-2 border border-border shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Cpu className="text-primary w-5 h-5" />
              Daily Provider Allowances
            </CardTitle>
            <Link href="/pricing" className="text-xs text-primary hover:underline font-semibold">
              Top up credits
            </Link>
          </CardHeader>
          <CardContent>
            {quota ? (
              <div className="grid gap-4 md:grid-cols-2">
                {['gemini', 'groq_70b', 'groq_8b', 'cohere'].map((provider) => {
                  if (!quota[provider]) return null;
                  const providerData = quota[provider];
                  const percentage =
                    providerData.daily_limit > 0
                      ? Math.min((providerData.daily_used / providerData.daily_limit) * 100, 100)
                      : 0;
                  const isHigh = percentage > 85;

                  const labelMap: Record<string, string> = {
                    gemini: 'Gemini (Vision & Explanations)',
                    groq_70b: 'Groq 70B (Deep Reasoning)',
                    groq_8b: 'Groq 8B (Fast Operations)',
                    cohere: 'Cohere (Semantic Embeddings)',
                  };

                  return (
                    <div
                      key={provider}
                      className="space-y-2 p-3.5 bg-muted/20 rounded-xl border border-border"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs sm:text-sm flex items-center gap-2 text-foreground">
                          <Zap size={14} className="text-primary opacity-80" />
                          {labelMap[provider] || provider}
                        </span>
                        <span className="text-xs font-mono font-medium text-muted-foreground">
                          {providerData.daily_used} / {providerData.daily_limit} used
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                      {isHigh && (
                        <p className="text-[11px] text-destructive text-right mt-1 font-medium">
                          Approaching daily threshold
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : loaded ? (
              <div className="text-center py-6">
                <Cpu className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm font-medium mb-1 text-foreground">Allowances loaded from local session</p>
                <p className="text-xs text-muted-foreground">Daily limits reset every 24 hours.</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 justify-center py-8 text-muted-foreground">
                <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-xs font-medium">Synchronizing learning telemetry...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
