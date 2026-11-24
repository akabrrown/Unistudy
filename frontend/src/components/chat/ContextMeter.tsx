'use client';

import { Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CONTEXT_TOKEN_LIMIT = 24000;

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

interface Props {
  usedTokens: number;
  limit?: number;
  canCompact: boolean;
  isBusy: boolean;
  onCompact: () => void;
}

export function ContextMeter({ usedTokens, limit = CONTEXT_TOKEN_LIMIT, canCompact, isBusy, onCompact }: Props) {
  const ratio = Math.min(1, usedTokens / limit);
  const pct = Math.round(ratio * 100);
  if (usedTokens < 800) return null;

  const tone = ratio >= 0.85 ? 'bg-red-500' : ratio >= 0.6 ? 'bg-[#D89A06]' : 'bg-emerald-500';

  return (
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1">
      <div
        className="h-1.5 w-24 rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Conversation context used"
      >
        <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono">{pct}% of memory window</span>
      {ratio >= 0.6 && canCompact && (
        <button
          type="button"
          onClick={onCompact}
          disabled={isBusy}
          className="inline-flex items-center gap-1 font-semibold text-[#00004E] dark:text-[#D89A06] hover:underline cursor-pointer disabled:opacity-40"
          title="Summarise earlier turns to free up space (uses 1 credit)"
        >
          <Scissors className="h-3 w-3" />
          Summarise earlier turns
        </button>
      )}
    </div>
  );
}
