'use client';

import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const REASONS = ['Incorrect', 'Not helpful', 'Too long', 'Too vague', 'Off topic'] as const;

interface Props {
  sessionId: string;
  messageId: string;
  modelUsed?: string;
  initialRating?: 'up' | 'down';
  onRated: (rating: 'up' | 'down') => void;
}

export function FeedbackButtons({ sessionId, messageId, modelUsed, initialRating, onRated }: Props) {
  const [rating, setRating] = useState<'up' | 'down' | undefined>(initialRating);
  const [showReasons, setShowReasons] = useState(false);

  const submit = async (next: 'up' | 'down', reason?: string) => {
    setRating(next);
    onRated(next);
    try {
      const res = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, messageId, rating: next, reason, modelUsed }),
      });
      if (!res.ok) throw new Error('failed');
      if (next === 'up' || reason) toast.success('Thanks, feedback saved');
    } catch {
      toast.error('Could not save feedback');
    }
  };

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => {
          setShowReasons(false);
          void submit('up');
        }}
        className={cn(
          'p-1.5 rounded-lg transition-colors cursor-pointer',
          rating === 'up'
            ? 'text-emerald-600 bg-emerald-500/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
        title="Good answer"
        aria-pressed={rating === 'up'}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => {
          setShowReasons((v) => !v);
          if (rating !== 'down') void submit('down');
        }}
        className={cn(
          'p-1.5 rounded-lg transition-colors cursor-pointer',
          rating === 'down'
            ? 'text-red-600 bg-red-500/10'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
        title="Bad answer"
        aria-pressed={rating === 'down'}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
      {showReasons && (
        <div className="absolute top-full right-0 mt-1 z-20 w-44 rounded-xl border border-border bg-card shadow-lg p-1.5">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            What went wrong?
          </div>
          {REASONS.map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => {
                setShowReasons(false);
                void submit('down', reason);
              }}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-[#FEF8E7] dark:hover:bg-white/10 cursor-pointer"
            >
              {reason}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
