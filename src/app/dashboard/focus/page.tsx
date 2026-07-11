'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, BrainCircuit, Coffee, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

const MODES = {
  focus: { label: 'Focus Time', duration: 25 * 60, icon: BrainCircuit, color: 'text-primary' },
  break: { label: 'Short Break', duration: 5 * 60, icon: Coffee, color: 'text-green-500' },
};

export default function FocusTimerPage() {
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [timeLeft, setTimeLeft] = useState(MODES.focus.duration);
  const [isRunning, setIsRunning] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleComplete();
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft]);

  const handleComplete = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);

    if (mode === 'focus') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      toast.success('Focus session complete! Time for a break.', {
        icon: '🎉',
        duration: 5000
      });
      switchMode('break');
    } else {
      toast('Break is over. Ready to focus again?', {
        icon: '💪',
        duration: 5000
      });
      switchMode('focus');
    }
  };

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(MODES[mode].duration);
  };

  const switchMode = (newMode: 'focus' | 'break') => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(MODES[newMode].duration);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((MODES[mode].duration - timeLeft) / MODES[mode].duration) * 100;
  const ActiveIcon = MODES[mode].icon;

  return (
    <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh]">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">Focus Timer</h1>
        <p className="text-muted-foreground">Boost your productivity with the Pomodoro technique.</p>
      </div>

      <div className="bg-card border border-border rounded-3xl p-8 sm:p-12 w-full max-w-md shadow-2xl flex flex-col items-center relative overflow-hidden">
        {/* Progress Bar Background */}
        <div 
          className="absolute inset-0 bg-primary/5 transition-all duration-1000 ease-linear pointer-events-none"
          style={{ height: `${progress}%`, top: 'auto', bottom: 0 }}
        />

        <div className="flex gap-4 mb-12 relative z-10 bg-background/80 backdrop-blur-sm p-2 rounded-full border border-border">
          <Button 
            variant={mode === 'focus' ? 'default' : 'ghost'} 
            className="rounded-full px-6"
            onClick={() => switchMode('focus')}
          >
            <BrainCircuit className="w-4 h-4 mr-2" /> Focus
          </Button>
          <Button 
            variant={mode === 'break' ? 'default' : 'ghost'} 
            className={`rounded-full px-6 ${mode === 'break' ? 'bg-green-500 hover:bg-green-600' : ''}`}
            onClick={() => switchMode('break')}
          >
            <Coffee className="w-4 h-4 mr-2" /> Break
          </Button>
        </div>

        <div className="relative z-10 flex flex-col items-center mb-12">
          <ActiveIcon className={`w-12 h-12 mb-6 opacity-80 ${MODES[mode].color}`} />
          <div className="text-8xl sm:text-9xl font-bold tracking-tighter text-foreground tabular-nums drop-shadow-sm">
            {formatTime(timeLeft)}
          </div>
          <p className="text-muted-foreground font-medium mt-4 uppercase tracking-widest text-sm">
            {MODES[mode].label}
          </p>
        </div>

        <div className="flex items-center gap-6 relative z-10">
          <Button 
            size="icon" 
            variant="outline" 
            className="w-14 h-14 rounded-full"
            onClick={resetTimer}
            disabled={timeLeft === MODES[mode].duration}
          >
            <RotateCcw className="w-6 h-6 text-muted-foreground" />
          </Button>
          
          <Button 
            size="icon" 
            className={`w-20 h-20 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 ${
              isRunning ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''
            }`}
            onClick={toggleTimer}
          >
            {isRunning ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current translate-x-0.5" />
            )}
          </Button>
          
          <Button 
            size="icon" 
            variant="outline" 
            className="w-14 h-14 rounded-full"
            onClick={handleComplete}
            disabled={!isRunning && timeLeft === MODES[mode].duration}
          >
            <CheckCircle2 className="w-6 h-6 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </div>
  );
}
