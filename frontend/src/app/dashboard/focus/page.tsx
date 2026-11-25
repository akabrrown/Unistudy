'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  CloudRain,
  Wind,
  Radio,
  CheckCircle2,
  Clock,
  BookOpen,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { useAppReducedMotion, SPRING_SNAPPY } from '@/lib/motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type TimerPhase = 'focus' | 'break';
type SoundscapeId = 'off' | 'rain' | 'brown' | 'library';

interface PresetConfig {
  id: string;
  label: string;
  focusMins: number;
  breakMins: number;
}

interface CourseOption {
  id: string;
  course_code?: string | null;
  title: string;
}

const PRESETS: PresetConfig[] = [
  { id: '25-5', label: '25 / 5 Classic', focusMins: 25, breakMins: 5 },
  { id: '50-10', label: '50 / 10 Lecture', focusMins: 50, breakMins: 10 },
  { id: '90-15', label: '90 / 15 Deep Exam', focusMins: 90, breakMins: 15 },
];

export default function DeepFocusStudioPage() {
  const reducedMotion = useAppReducedMotion();
  const [presetId, setPresetId] = useState<string>('25-5');
  const [focusMins, setFocusMins] = useState<number>(25);
  const [breakMins, setBreakMins] = useState<number>(5);
  const [phase, setPhase] = useState<TimerPhase>('focus');
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const [focusGoal, setFocusGoal] = useState<string>('');
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [completedBlocks, setCompletedBlocks] = useState<number>(0);
  const [loggedMinutesToday, setLoggedMinutesToday] = useState<number>(0);

  // Ambient Web Audio state
  const [soundscape, setSoundscape] = useState<SoundscapeId>('off');
  const [volume, setVolume] = useState<number>(35);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodesRef = useRef<AudioNode[]>([]);

  const totalPhaseSeconds = (phase === 'focus' ? focusMins : breakMins) * 60;
  const progressPct =
    totalPhaseSeconds > 0
      ? Math.min(100, Math.max(0, ((totalPhaseSeconds - secondsLeft) / totalPhaseSeconds) * 100))
      : 0;

  useEffect(() => {
    fetch('/api/courses')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setCourses(data);
          if (data.length > 0) setSelectedCourseId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const stopAudioNodes = useCallback(() => {
    sourceNodesRef.current.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as AudioBufferSourceNode).stop === 'function') {
          (node as AudioBufferSourceNode).stop();
        }
        node.disconnect();
      } catch {}
    });
    sourceNodesRef.current = [];
  }, []);

  const startSoundscape = useCallback(
    (mode: SoundscapeId, volPct: number) => {
      stopAudioNodes();
      if (mode === 'off' || typeof window === 'undefined') return;

      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          void ctx.resume();
        }

        const masterGain = ctx.createGain();
        masterGain.gain.value = (volPct / 100) * 0.25;
        masterGain.connect(ctx.destination);
        gainNodeRef.current = masterGain;

        const bufferSize = ctx.sampleRate * 3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = buffer.getChannelData(0);

        if (mode === 'brown' || mode === 'library') {
          let lastOut = 0.0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            output[i] = (lastOut + 0.02 * white) / 1.02;
            lastOut = output[i];
            output[i] *= mode === 'library' ? 1.8 : 3.2;
          }
        } else {
          // Pink-ish soft rain texture
          let b0 = 0, b1 = 0, b2 = 0;
          for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99765 * b0 + white * 0.099046;
            b1 = 0.963 * b1 + white * 0.2965164;
            b2 = 0.57 * b2 + white * 1.0526913;
            output[i] = (b0 + b1 + b2 + white * 0.1848) * 0.12;
          }
        }

        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = buffer;
        noiseSource.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = mode === 'rain' ? 1400 : mode === 'library' ? 380 : 620;

        noiseSource.connect(filter);
        filter.connect(masterGain);
        noiseSource.start();
        sourceNodesRef.current = [noiseSource, filter];
      } catch {
        // Ignore if browser blocks autoplay until interaction
      }
    },
    [stopAudioNodes]
  );

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = (volume / 100) * 0.25;
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      stopAudioNodes();
      if (audioCtxRef.current) {
        void audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [stopAudioNodes]);

  const logCompletedSession = useCallback(async (mins: number) => {
    setCompletedBlocks((c) => c + 1);
    setLoggedMinutesToday((m) => m + mins);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('study_sessions').insert({
          user_id: user.id,
          duration_secs: mins * 60,
          session_date: new Date().toISOString().split('T')[0],
        });
      }
      toast.success(`Logged ${mins}m focus session to your study streak!`);
    } catch {
      toast.success(`Completed ${mins}m focus block!`);
    }
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (phase === 'focus') {
            void logCompletedSession(focusMins);
            setPhase('break');
            return breakMins * 60;
          } else {
            toast.info('Break complete — ready for your next focus block.');
            setPhase('focus');
            return focusMins * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, phase, focusMins, breakMins, logCompletedSession]);

  const handleSelectPreset = (p: PresetConfig) => {
    setIsRunning(false);
    setPresetId(p.id);
    setFocusMins(p.focusMins);
    setBreakMins(p.breakMins);
    setPhase('focus');
    setSecondsLeft(p.focusMins * 60);
  };

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setSecondsLeft((phase === 'focus' ? focusMins : breakMins) * 60);
  }, [phase, focusMins, breakMins]);

  // Keyboard shortcuts: Space (toggle), R (reset)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsRunning((r) => !r);
      } else if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleReset();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleReset]);

  const minsDisplay = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secsDisplay = String(secondsLeft % 60).padStart(2, '0');

  // 260px SVG circular ring math
  const radius = 112;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-border/70 pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Deep Focus Studio
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Timed study blocks with ambient soundscapes that log directly to your 7-day study streak.
          </p>
        </div>

        <div className="flex items-center gap-2.5 text-xs font-mono tabular-nums">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card">
            <Flame className="w-3.5 h-3.5 text-[#D89A06]" />
            <span className="font-bold text-foreground">{completedBlocks}</span>
            <span className="text-muted-foreground">blocks</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card">
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-bold text-foreground">{loggedMinutesToday}m</span>
            <span className="text-muted-foreground">today</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Circular Dial & Controls */}
        <section className="lg:col-span-7 rounded-2xl border border-border/80 bg-card p-6 md:p-8 flex flex-col items-center space-y-6">
          {/* Preset Tabs */}
          <div className="inline-flex flex-wrap justify-center rounded-xl border border-border bg-muted/35 p-1 gap-1">
            {PRESETS.map((p) => {
              const active = presetId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={cn(
                    'relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer tabular-nums',
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="focus-preset-pill"
                      transition={reducedMotion ? { duration: 0 } : SPRING_SNAPPY}
                      className="absolute inset-0 rounded-lg bg-background shadow-xs"
                    />
                  )}
                  <span className="relative z-10">{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* 260px Tactile Circular Dial */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 260 260">
              <circle
                cx="130"
                cy="130"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-muted/40"
              />
              <circle
                cx="130"
                cy="130"
                r={radius}
                fill="none"
                stroke={phase === 'focus' ? '#D89A06' : '#10B981'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500 ease-out"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                {phase === 'focus' ? 'Focus Block' : 'Recovery Break'}
              </span>
              <span className="text-5xl font-black font-mono tabular-nums tracking-tight text-foreground mt-1">
                {minsDisplay}:{secsDisplay}
              </span>
              <span className="text-xs text-muted-foreground mt-1.5 max-w-[170px] truncate">
                {focusGoal.trim() || 'Ready to focus'}
              </span>
            </div>
          </div>

          {/* Primary Transport Controls */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={() => setIsRunning((r) => !r)}
              className="h-11 px-7 rounded-xl bg-[#00004E] hover:bg-[#000038] text-white dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#C28905] font-bold text-sm gap-2 cursor-pointer shadow-sm"
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  {secondsLeft < totalPhaseSeconds ? 'Resume' : 'Start Focus'}
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="h-11 px-4 rounded-xl border-border text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsRunning(false);
                const nextPhase = phase === 'focus' ? 'break' : 'focus';
                setPhase(nextPhase);
                setSecondsLeft((nextPhase === 'focus' ? focusMins : breakMins) * 60);
              }}
              className="h-11 px-3 rounded-xl text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Switch to {phase === 'focus' ? 'Break' : 'Focus'}
            </Button>
          </div>

          <p className="text-[11px] font-mono text-muted-foreground">
            Shortcuts: <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground">Space</kbd> Start/Pause ·{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground">R</kbd> Reset
          </p>
        </section>

        {/* Right 5 Cols: Session Goal, Course Link & Web Audio Soundscape */}
        <div className="lg:col-span-5 space-y-5">
          {/* Course & Task Tagger */}
          <section className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
              Session Target
            </h2>

            <div className="space-y-2">
              <label htmlFor="focus-goal" className="text-xs font-semibold text-muted-foreground block">
                What are you working on?
              </label>
              <Input
                id="focus-goal"
                value={focusGoal}
                onChange={(e) => setFocusGoal(e.target.value)}
                placeholder="e.g. Finish Week 4 IAS 2 flashcards"
                className="h-10 text-xs rounded-xl bg-background"
              />
            </div>

            {courses.length > 0 && (
              <div className="space-y-2">
                <label htmlFor="focus-course" className="text-xs font-semibold text-muted-foreground block">
                  Course Module
                </label>
                <select
                  id="focus-course"
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code ? `${c.course_code} — ` : ''}
                      {c.title}
                    </option>
                  ))}
                </select>
                {selectedCourseId && (
                  <Link
                    href={`/dashboard/courses/${selectedCourseId}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#00004E] dark:text-[#D89A06] hover:underline pt-0.5"
                  >
                    Open course slides in new view →
                  </Link>
                )}
              </div>
            )}

            {/* Custom Duration Controls */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
              <div>
                <label htmlFor="custom-focus-mins" className="text-[11px] font-mono text-muted-foreground block mb-1">
                  Focus (mins)
                </label>
                <Input
                  id="custom-focus-mins"
                  type="number"
                  min={5}
                  max={180}
                  value={focusMins}
                  onChange={(e) => {
                    const val = Math.max(5, Math.min(180, Number(e.target.value) || 25));
                    setPresetId('custom');
                    setFocusMins(val);
                    if (!isRunning && phase === 'focus') setSecondsLeft(val * 60);
                  }}
                  className="h-9 text-xs font-mono tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="custom-break-mins" className="text-[11px] font-mono text-muted-foreground block mb-1">
                  Break (mins)
                </label>
                <Input
                  id="custom-break-mins"
                  type="number"
                  min={1}
                  max={60}
                  value={breakMins}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(60, Number(e.target.value) || 5));
                    setPresetId('custom');
                    setBreakMins(val);
                    if (!isRunning && phase === 'break') setSecondsLeft(val * 60);
                  }}
                  className="h-9 text-xs font-mono tabular-nums"
                />
              </div>
            </div>
          </section>

          {/* Ambient Soundscape Synthesizer */}
          <section className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                {soundscape === 'off' ? (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#D89A06]" />
                )}
                Ambient Soundscape
              </h2>
              <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
                {soundscape === 'off' ? 'Muted' : `${volume}%`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'off' as const, label: 'Silent', icon: VolumeX },
                  { id: 'rain' as const, label: 'Soft Rain', icon: CloudRain },
                  { id: 'brown' as const, label: 'Brown Noise', icon: Wind },
                  { id: 'library' as const, label: 'Library Hum', icon: Radio },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const active = soundscape === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSoundscape(item.id);
                      startSoundscape(item.id, volume);
                    }}
                    className={cn(
                      'flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                      active
                        ? 'border-[#00004E] bg-[#00004E]/8 text-[#00004E] dark:border-[#D89A06] dark:bg-[#D89A06]/15 dark:text-[#D89A06]'
                        : 'border-border/70 bg-background text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                    {active && item.id !== 'off' && (
                      <CheckCircle2 className="w-3.5 h-3.5 ml-auto shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {soundscape !== 'off' && (
              <div className="space-y-1.5 pt-1">
                <label htmlFor="soundscape-vol" className="text-[11px] font-mono text-muted-foreground block">
                  Volume Level
                </label>
                <input
                  id="soundscape-vol"
                  type="range"
                  min={5}
                  max={100}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-[#D89A06] cursor-pointer"
                />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
