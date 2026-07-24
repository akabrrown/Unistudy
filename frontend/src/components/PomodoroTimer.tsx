'use client';
import { useState, useEffect } from 'react';
import { Play, Pause, Square, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudyBreakSuggester } from './StudyBreakSuggester';
import { toast } from 'react-hot-toast';

export function PomodoroTimer() {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [showBreak, setShowBreak] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      setIsActive(false);
      handleSessionComplete();
    }
    
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleSessionComplete = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/wellbeing/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          duration_minutes: 25,
          status: 'completed'
        })
      });
      
      setShowBreak(true);
      toast.success('Pomodoro session completed! Logged to your Effort Tracker.');
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(25 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="bg-card border rounded-xl p-4 shadow-sm flex flex-col items-center justify-center space-y-4">
      <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Timer className="w-4 h-4" /> Focus Session
      </div>
      
      <div className="text-4xl font-bold tabular-nums">
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      
      <div className="flex gap-2">
        <Button variant={isActive ? "outline" : "default"} size="icon" onClick={toggleTimer}>
          {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button variant="outline" size="icon" onClick={resetTimer}>
          <Square className="w-4 h-4" />
        </Button>
      </div>

      <StudyBreakSuggester 
        open={showBreak} 
        onOpenChange={setShowBreak} 
        onClose={() => {
          setShowBreak(false);
          resetTimer();
        }}
      />
    </div>
  );
}
