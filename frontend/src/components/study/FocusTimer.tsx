'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, RotateCcw, Hourglass, Coffee, CheckCircle2, Settings, X, CalendarClock } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function slotToMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

interface FocusTimerProps {
  isOpen: boolean;
  onClose: () => void;
  onTick?: (display: { time: string; mode: 'focus' | 'break', isRunning: boolean } | null) => void;
}

export interface FocusTimerRef {
  toggle: () => void;
}

export const FocusTimer = forwardRef<FocusTimerRef, FocusTimerProps>(({ isOpen, onClose, onTick }, ref) => {
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [fromTimetable, setFromTimetable] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useImperativeHandle(ref, () => ({
    toggle: () => setIsRunning(r => !r)
  }));

  // Load session duration from today's timetable slot on mount
  useEffect(() => {
    async function loadTimetableDuration() {
      try {
        const res = await fetch('/api/planner/template');
        if (!res.ok) return;
        const data = await res.json();
        const template = data.template;
        if (!template?.weekly_template) return;

        const todayName = DAY_NAMES[new Date().getDay()];
        const todaySchedule = template.weekly_template.find(
          (d: any) => d.day.toLowerCase() === todayName
        );

        if (!todaySchedule?.sessions?.length) return;

        // Use the first session's slot to derive focus duration
        const first = todaySchedule.sessions[0];
        const mins = slotToMinutes(first.start, first.end);
        if (mins > 0) {
          setFocusMinutes(mins);
          setTimeLeft(mins * 60);
          setFromTimetable(`${first.start}–${first.end} (${mins} min)`);
        }
      } catch {
        // silently fall back to default 25 min
      }
    }
    loadTimetableDuration();
  }, []);

  const modeDuration = mode === 'focus' ? focusMinutes * 60 : breakMinutes * 60;

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(p => p - 1), 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleComplete();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning, timeLeft]);

  // Separate effect: notify parent of the current tick as a proper side effect
  useEffect(() => {
    if (timeLeft > 0 || isRunning) {
      onTick?.({ time: formatTime(timeLeft), mode, isRunning });
    } else {
      onTick?.(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isRunning, mode]);

  const handleComplete = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (mode === 'focus') {
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      toast.success('Focus session complete! Take a break.', { icon: '🎉', duration: 4000 });
      switchMode('break');
    } else {
      toast('Break over. Back to work!', { icon: '💪', duration: 4000 });
      switchMode('focus');
    }
  };

  const switchMode = (m: 'focus' | 'break') => {
    setIsRunning(false);
    onTick?.(null);
    setMode(m);
    setTimeLeft(m === 'focus' ? focusMinutes * 60 : breakMinutes * 60);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = ((modeDuration - timeLeft) / modeDuration) * 100;

  return (
    <div className={`absolute right-0 top-14 bottom-0 w-[300px] bg-card border-l border-border shadow-2xl flex flex-col z-[60] animate-in slide-in-from-right ${isOpen ? '' : 'hidden'}`}>
      {/* Header */}
      <div className={`flex flex-col px-4 py-3 border-b border-border gap-1 ${mode === 'focus' ? 'bg-primary/5' : 'bg-green-500/5'}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            {mode === 'focus'
              ? <Hourglass size={15} className="text-primary" />
              : <Coffee size={15} className="text-green-500" />}
            {mode === 'focus' ? 'Focus Timer' : 'Break Time'}
          </h3>
        <div className="flex items-center gap-1">
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}>
              <Settings size={14} className="text-muted-foreground" />
            </DialogTrigger>
            <DialogContent className="sm:max-w-xs">
              <DialogHeader><DialogTitle>Timer Settings</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ft-focus">Focus (minutes)</Label>
                  <Input id="ft-focus" type="number" min={1} max={120} value={focusMinutes}
                    onChange={e => {
                      const v = Number(e.target.value) || 25;
                      setFocusMinutes(v);
                      if (!isRunning && mode === 'focus') setTimeLeft(v * 60);
                    }} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="ft-break">Break (minutes)</Label>
                  <Input id="ft-break" type="number" min={1} max={60} value={breakMinutes}
                    onChange={e => {
                      const v = Number(e.target.value) || 5;
                      setBreakMinutes(v);
                      if (!isRunning && mode === 'break') setTimeLeft(v * 60);
                    }} />
                </div>
              </div>
              <Button onClick={() => setIsSettingsOpen(false)} className="w-full">Done</Button>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X size={14} />
          </Button>
        </div>
        </div>
        {fromTimetable && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <CalendarClock size={10} className="shrink-0" />
            <span>Set from your timetable · {fromTimetable}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 relative overflow-hidden">
        {/* Progress fill */}
        <div
          className={`absolute inset-0 transition-all duration-1000 ease-linear pointer-events-none ${mode === 'focus' ? 'bg-primary/5' : 'bg-green-500/5'}`}
          style={{ height: `${progress}%`, top: 'auto', bottom: 0 }}
        />

        {/* Mode toggle */}
        <div className="flex gap-1 bg-muted/60 p-1 rounded-full border border-border z-10">
          <button
            onClick={() => switchMode('focus')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${mode === 'focus' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Hourglass size={11} /> Focus
          </button>
          <button
            onClick={() => switchMode('break')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${mode === 'break' ? 'bg-green-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Coffee size={11} /> Break
          </button>
        </div>

        {/* Clock */}
        <div className="z-10 text-center">
          <div className="text-6xl font-bold tracking-tighter tabular-nums text-foreground">
            {formatTime(timeLeft)}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-widest font-medium">
            {mode === 'focus' ? 'Focus Time' : 'Short Break'}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 z-10">
          <Button
            size="icon" variant="outline"
            className="w-11 h-11 rounded-full"
            onClick={() => { setIsRunning(false); setTimeLeft(modeDuration); }}
            disabled={timeLeft === modeDuration}
          >
            <RotateCcw size={15} className="text-muted-foreground" />
          </Button>

          <Button
            size="icon"
            className={`w-16 h-16 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 ${isRunning ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
            onClick={() => setIsRunning(r => !r)}
          >
            {isRunning
              ? <Pause size={22} className="fill-current" />
              : <Play size={22} className="fill-current translate-x-0.5" />}
          </Button>

          <Button
            size="icon" variant="outline"
            className="w-11 h-11 rounded-full"
            onClick={handleComplete}
            disabled={!isRunning && timeLeft === modeDuration}
          >
            <CheckCircle2 size={15} className="text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border text-center">
        <p className="text-[10px] text-muted-foreground tracking-widest uppercase">
          {isRunning
            ? `${mode === 'focus' ? 'Studying' : 'Resting'} — stay the course`
            : 'Press play to start'}
        </p>
      </div>
    </div>
  );
});
