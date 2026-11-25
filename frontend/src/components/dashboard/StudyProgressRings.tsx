'use client';

import React from 'react';
import { Flame, Clock, Layers, Coins } from 'lucide-react';

interface StudyProgressRingsProps {
  weeklyMinutes: number;
  dueCards: number;
  totalCards: number;
  creditBalance: number;
  compact?: boolean;
}

export function StudyProgressRings({
  weeklyMinutes,
  dueCards,
  totalCards,
  creditBalance,
}: StudyProgressRingsProps) {
  const targetMinutes = 60;
  const currentDailyMinutes = Math.min(targetMinutes, Math.max(0, Math.round(weeklyMinutes / 7)));
  const minutesPct = Math.min(100, Math.round((currentDailyMinutes / targetMinutes) * 100));

  const masteredCards = Math.max(0, totalCards - dueCards);
  const cardsPct =
    totalCards > 0 ? Math.min(100, Math.round((masteredCards / totalCards) * 100)) : 0;

  const targetCredits = 20;
  const creditsPct = Math.min(100, Math.round((creditBalance / targetCredits) * 100));

  const cOuter = 301.6;
  const offsetOuter = cOuter - (minutesPct / 100) * cOuter;

  const cMiddle = 238.7;
  const offsetMiddle = cMiddle - (cardsPct / 100) * cMiddle;

  const cInner = 175.9;
  const offsetInner = cInner - (creditsPct / 100) * cInner;

  return (
    <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-card border border-border/70">
      {/* Concentric SVG Rings */}
      <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="48"
            stroke="currentColor"
            strokeWidth="7"
            fill="none"
            className="text-muted/35"
          />
          <circle
            cx="60"
            cy="60"
            r="38"
            stroke="currentColor"
            strokeWidth="7"
            fill="none"
            className="text-muted/35"
          />
          <circle
            cx="60"
            cy="60"
            r="28"
            stroke="currentColor"
            strokeWidth="7"
            fill="none"
            className="text-muted/35"
          />

          {/* Outer Ring: Daily Study Minutes (UPSA Gold) */}
          <circle
            cx="60"
            cy="60"
            r="48"
            stroke="#D89A06"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={cOuter}
            strokeDashoffset={offsetOuter}
            className="transition-all duration-700 ease-out"
          />

          {/* Middle Ring: Cards Mastered (Emerald) */}
          <circle
            cx="60"
            cy="60"
            r="38"
            stroke="#10B981"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={cMiddle}
            strokeDashoffset={offsetMiddle}
            className="transition-all duration-700 ease-out"
          />

          {/* Inner Ring: Study Credits (UPSA Deep Navy / White in dark) */}
          <circle
            cx="60"
            cy="60"
            r="28"
            stroke="#00004E"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={cInner}
            strokeDashoffset={offsetInner}
            className="transition-all duration-700 ease-out dark:stroke-white"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <Flame className="w-4 h-4 text-[#D89A06]" />
          <span className="text-[10px] font-mono font-black tabular-nums text-foreground leading-none mt-0.5">
            {minutesPct}%
          </span>
        </div>
      </div>

      {/* Ring Legend & Live Metrics */}
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground truncate">
            <span className="w-2 h-2 rounded-full bg-[#D89A06] shrink-0" />
            <Clock className="w-3 h-3 text-[#D89A06]" />
            <span className="truncate">Daily Study</span>
          </span>
          <span className="font-mono font-bold text-foreground tabular-nums shrink-0">
            {currentDailyMinutes}m / {targetMinutes}m
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground truncate">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
            <Layers className="w-3 h-3 text-[#10B981]" />
            <span className="truncate">Cards Mastered</span>
          </span>
          <span className="font-mono font-bold text-foreground tabular-nums shrink-0">
            {totalCards > 0 ? `${cardsPct}%` : '0 cards'}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground truncate">
            <span className="w-2 h-2 rounded-full bg-[#00004E] dark:bg-white shrink-0" />
            <Coins className="w-3 h-3 text-[#00004E] dark:text-white" />
            <span className="truncate">Study Credits</span>
          </span>
          <span className="font-mono font-bold text-foreground tabular-nums shrink-0">
            {creditBalance}
          </span>
        </div>
      </div>
    </div>
  );
}
