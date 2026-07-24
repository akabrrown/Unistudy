'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
}

export function StudyBreakSuggester({ open, onOpenChange, onClose }: Props) {
  const [suggestion, setSuggestion] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadSuggestion();
    }
  }, [open]);

  const loadSuggestion = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/study-break`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSuggestion(data.suggestion);
    } catch (err) {
      setSuggestion("Take a 5-minute walk and get some water to recharge.");
    } finally {
      setLoading(false);
    }
  };

  const handleRating = async (rating: 1 | -1) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/wellbeing/break-rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ suggestion, rating })
      });
      toast.success('Thanks for the feedback!');
      onClose();
    } catch (err) {
      console.error(err);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Time for a Study Break!</DialogTitle>
          <DialogDescription>
            You've earned 5 minutes of rest. Here's a suggestion to prevent burnout:
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex justify-center items-center text-center text-lg font-medium text-foreground">
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          ) : (
            <p>{suggestion}</p>
          )}
        </div>

        {!loading && (
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-muted-foreground">Was this helpful?</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleRating(-1)}>
                <ThumbsDown className="w-4 h-4 mr-2" /> No
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleRating(1)}>
                <ThumbsUp className="w-4 h-4 mr-2" /> Yes
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
