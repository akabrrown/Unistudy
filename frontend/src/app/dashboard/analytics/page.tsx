'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StudyHeatmap } from '@/components/analytics/StudyHeatmap';
import { Sparkles, TrendingUp, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AnalyticsPage() {
  const [heatmapData, setHeatmapData] = useState<Record<string, number>>({});
  const [velocity, setVelocity] = useState<any>(null);
  const [bestTime, setBestTime] = useState<any>(null);
  const [blindSpots, setBlindSpots] = useState<any[]>([]);

  useEffect(() => {
    // Fetch all analytics in parallel
    Promise.all([
      fetch('/api/analytics/heatmap').then(res => res.json()),
      fetch('/api/analytics/velocity').then(res => res.json()),
      fetch('/api/analytics/best-time').then(res => res.json()),
      fetch('/api/analytics/blind-spots').then(res => res.json()),
    ]).then(([heatRes, velRes, timeRes, blindRes]) => {
      setHeatmapData(heatRes || {});
      setVelocity(velRes);
      setBestTime(timeRes);
      setBlindSpots(blindRes.blindSpots || []);
    });
  }, []);

  return (
    <div className='max-w-6xl mx-auto py-8 space-y-8 animate-in fade-in zoom-in duration-500'>
      <div>
        <h1 className='text-3xl font-black tracking-tight text-[var(--text-primary)]'>Analytics & Insights</h1>
        <p className='text-[var(--text-muted)] text-lg'>Discover how you learn best.</p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        
        {/* Study Heatmap */}
        <Card className='md:col-span-2 border-2 border-[var(--color-plum-200)] dark:border-[var(--color-plum-900)]'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Sparkles className='text-[var(--color-plum-500)]' />
              Study Consistency Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StudyHeatmap data={heatmapData} />
          </CardContent>
        </Card>

        {/* Learning Velocity */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <TrendingUp className='text-blue-500' />
              Learning Velocity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {velocity ? (
              <div className='space-y-4'>
                <div className='flex items-end gap-3'>
                  <span className='text-4xl font-black'>{velocity.avgVelocity}</span>
                  <span className='text-sm text-[var(--text-muted)] mb-1'>days to master a topic</span>
                </div>
                <div className='p-3 bg-[var(--bg-subtle)] rounded-lg border border-[var(--border-subtle)]'>
                  <p className='text-sm font-semibold'>
                    Trend: <span className={
                      velocity.trend === 'Accelerating' ? 'text-green-600' :
                      velocity.trend === 'Slowing' ? 'text-orange-500' : 'text-blue-500'
                    }>{velocity.trend}</span>
                  </p>
                  <p className='text-xs text-[var(--text-muted)] mt-1'>
                    Your baseline is {velocity.baseline} days. Keep pushing to master topics faster!
                  </p>
                </div>
              </div>
            ) : (
              <p className='text-sm text-[var(--text-muted)]'>Loading velocity data...</p>
            )}
          </CardContent>
        </Card>

        {/* Best Study Time */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Clock className='text-emerald-500' />
              Peak Performance Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bestTime ? (
              bestTime.insufficient ? (
                <div className='text-center py-4'>
                  <p className='text-sm text-[var(--text-muted)]'>We need more quiz data to determine your peak study hours. Keep testing yourself!</p>
                </div>
              ) : (
                <div className='space-y-4'>
                  {bestTime.peakHours.map((ph: any, i: number) => (
                    <div key={i} className='flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900'>
                      <div className='flex items-center gap-3'>
                        <div className='w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold'>
                          {ph.hour}:00
                        </div>
                        <div>
                          <p className='font-semibold text-emerald-900 dark:text-emerald-100'>Top Window</p>
                          <p className='text-xs text-emerald-700 dark:text-emerald-400'>{ph.avg.toFixed(1)}% avg score</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className='text-sm text-[var(--text-muted)]'>Analyzing timestamps...</p>
            )}
          </CardContent>
        </Card>

        {/* Blind Spots */}
        <Card className='md:col-span-2'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <ShieldCheck className='text-[var(--color-amber-500)]' />
              Blind Spot Detector
            </CardTitle>
          </CardHeader>
          <CardContent>
            {blindSpots.length > 0 ? (
              <div className='grid gap-4 md:grid-cols-2'>
                {blindSpots.map((bs, i) => (
                  <div key={i} className='p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-xl relative overflow-hidden'>
                    <div className='absolute top-0 right-0 p-3'>
                      <AlertTriangle className='text-orange-400 opacity-20 w-12 h-12' />
                    </div>
                    <p className='font-bold text-orange-900 dark:text-orange-100 mb-2'>Hidden Knowledge Gap</p>
                    <div className='flex items-center gap-4 text-sm text-orange-800 dark:text-orange-200 mb-3'>
                      <span>Confidence: <strong className='text-orange-600 dark:text-orange-400'>{bs.avgConf.toFixed(1)}/5</strong></span>
                      <span>Quiz Score: <strong className='text-orange-600 dark:text-orange-400'>{bs.avgScore.toFixed(0)}%</strong></span>
                    </div>
                    <p className='text-sm text-orange-700 dark:text-orange-300 italic'>{bs.insight}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-8 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)]'>
                <ShieldCheck className='w-12 h-12 text-[var(--color-amber-500)] mx-auto mb-3 opacity-50' />
                <p className='font-bold'>No Blind Spots Detected!</p>
                <p className='text-sm text-[var(--text-muted)]'>Your confidence perfectly matches your test scores.</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
