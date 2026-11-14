'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, Clock, Loader2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export function ExamScheduler({ onSchedule }: { onSchedule?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) {
      toast.error('Please enter exam title and date');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          date,
          time: time || undefined,
          type: 'exam',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to schedule exam');
      }

      toast.success('Exam scheduled! Countdown added to your study dashboard.');
      setOpen(false);
      setTitle('');
      setDate('');
      setTime('');
      if (onSchedule) onSchedule();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to schedule exam');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: 'outline', className: 'w-full justify-start text-muted-foreground' })}>
        <CalendarIcon className="w-4 h-4 mr-2" /> Add upcoming exam...
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Exam</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Exam / Course Title</label>
            <Input 
              placeholder="e.g. MATH 201 Midterm Examination" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Exam Date</label>
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Time (Optional)</label>
              <Input 
                type="time" 
                value={time} 
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-primary">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Schedule Exam
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
