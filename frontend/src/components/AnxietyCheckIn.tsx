'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';

const EMOJIS = [
  { icon: '😰', label: 'Panicked' },
  { icon: '😟', label: 'Anxious' },
  { icon: '😐', label: 'Okay' },
  { icon: '🙂', label: 'Prepared' },
  { icon: '😎', label: 'Confident' }
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
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/calendar-events`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      // Find an exam tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const upcomingExam = data.find((e: any) => e.type === 'exam' && e.date === tomorrowStr);
      
      if (upcomingExam) {
        // Only show if we haven't already checked in for this exam today
        const checkedIn = localStorage.getItem(`anxiety_checkin_${upcomingExam.id}`);
        if (!checkedIn) {
          setExam(upcomingExam);
          setOpen(true);
        }
      }
    } catch (err) {
      console.error('Failed to check exams:', err);
    }
  };

  const handleFeelingSelect = async (feeling: string) => {
    setSelectedFeeling(feeling);
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      // 1. Get AI Response
      const aiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/anxiety-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ feeling })
      });
      const aiData = await aiRes.json();
      setSuggestion(aiData.suggestion);

      // 2. Save Check-in (Private)
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/wellbeing/anxiety`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          event_id: exam.id, 
          feeling, 
          ai_suggestion: aiData.suggestion 
        })
      });

      // Mark as checked in locally
      localStorage.setItem(`anxiety_checkin_${exam.id}`, 'true');
    } catch (err) {
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
            <Calendar className="w-5 h-5" /> Pre-Exam Check-In
          </DialogTitle>
          <DialogDescription>
            You have an exam for <strong>{exam.title}</strong> tomorrow. How are you feeling about it? 
            (This is completely private).
          </DialogDescription>
        </DialogHeader>

        {!selectedFeeling ? (
          <div className="flex justify-between mt-6">
            {EMOJIS.map((e) => (
              <button
                key={e.label}
                onClick={() => handleFeelingSelect(e.label)}
                className="flex flex-col items-center p-3 rounded-xl hover:bg-muted transition-colors"
              >
                <span className="text-4xl mb-2">{e.icon}</span>
                <span className="text-xs text-muted-foreground font-medium">{e.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-6 p-4 bg-muted/50 rounded-xl">
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-foreground leading-relaxed">
                  {suggestion}
                </p>
                <Button className="w-full" onClick={() => setOpen(false)}>
                  Got it, thanks
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
