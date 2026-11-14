'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar } from 'lucide-react';

const EMOJIS = [
  { icon: '😰', label: 'Panicked' },
  { icon: '😟', label: 'Anxious' },
  { icon: '😐', label: 'Okay' },
  { icon: '🙂', label: 'Prepared' },
  { icon: '😎', label: 'Confident' },
];

export function AnxietyCheckIn() {
  const [open, setOpen] = useState(false);
  const [exam, setExam] = useState<any>(null);
  const [selectedFeeling, setSelectedFeeling] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkUpcomingExams();
  }, []);

  const checkUpcomingExams = async () => {
    try {
      const res = await fetch('/api/calendar');
      if (!res.ok) return;
      const data = await res.json();
      const events = data.events || data;

      if (!Array.isArray(events)) return;

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const upcomingExam = events.find(
        (e: any) => e.type === 'exam' && (e.date === tomorrowStr || e.date === new Date().toISOString().split('T')[0])
      );

      if (upcomingExam) {
        const checkedIn = typeof window !== 'undefined' ? localStorage.getItem(`anxiety_checkin_${upcomingExam.id}`) : null;
        if (!checkedIn) {
          setExam(upcomingExam);
          setOpen(true);
        }
      }
    } catch (err) {
      // Quiet fail if network unavailable
    }
  };

  const handleFeelingSelect = async (feeling: string) => {
    setSelectedFeeling(feeling);
    setLoading(true);

    try {
      // Generate empathetic evidence-based study psychology advice
      let groundingAdvice = '';
      if (feeling === 'Panicked' || feeling === 'Anxious') {
        groundingAdvice =
          "Take a slow 4-second box breath. Focus only on high-yield revision summaries and past-paper formulas today. You do not need to relearn everything—trust your active recall and aim for clarity over volume.";
      } else if (feeling === 'Okay') {
        groundingAdvice =
          "Good steady mindset. Run a 15-minute quick flashcard review on your weakest lecture deck, hydrate, and ensure you get 7+ hours of quality sleep before tomorrow's assessment.";
      } else {
        groundingAdvice =
          "Excellent momentum. Review your high-level formula cheat sheet once more, lay out your exam tools, and keep your cognitive energy fresh for exam day.";
      }

      setSuggestion(groundingAdvice);
      if (typeof window !== 'undefined' && exam?.id) {
        localStorage.setItem(`anxiety_checkin_${exam.id}`, 'true');
      }
    } catch {
      setSuggestion("Take a deep breath. You've prepared for this and you can handle it.");
    } finally {
      setLoading(false);
    }
  };

  if (!exam) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Pre-Exam Mindset Check-In
          </DialogTitle>
          <DialogDescription>
            You have an upcoming assessment: <strong>{exam.title}</strong>. How are you feeling about it?
          </DialogDescription>
        </DialogHeader>

        {!selectedFeeling ? (
          <div className="flex justify-between mt-6">
            {EMOJIS.map((e) => (
              <button
                key={e.label}
                onClick={() => handleFeelingSelect(e.label)}
                className="flex flex-col items-center p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer"
              >
                <span className="text-4xl mb-2">{e.icon}</span>
                <span className="text-xs text-muted-foreground font-medium">{e.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-6 p-4 bg-muted/50 rounded-xl space-y-4">
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-foreground leading-relaxed text-sm">
                  {suggestion}
                </p>
                <Button className="w-full bg-primary" onClick={() => setOpen(false)}>
                  Got it, thank you
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
