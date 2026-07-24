'use client';
import { useState } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';

export function ExamScheduler({ onSchedule }: { onSchedule?: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !time) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/calendar-events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          date,
          time,
          type: 'exam'
        })
      });
      
      toast.success('Exam scheduled! We will check in with you the day before.');
      setOpen(false);
      setTitle('');
      setDate('');
      setTime('');
      if (onSchedule) onSchedule();
    } catch (err) {
      toast.error('Failed to schedule exam');
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
            <label className="text-sm font-medium">Exam Name</label>
            <Input 
              placeholder="e.g. Calculus Midterm" 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              required 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" /> Date
              </label>
              <Input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" /> Time
              </label>
              <Input 
                type="time" 
                value={time} 
                onChange={e => setTime(e.target.value)}
                required 
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Save Exam'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
