'use client';

import React from 'react';
import { Flame, Clock, BrainCircuit, Coins } from 'lucide-react';

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
  compact = false,
}: StudyProgressRingsProps) {
  // Target calculations (e.g. daily target: 60 mins study, 100% cards cleared, 20 credits)
  const targetMinutes = 60;
  const currentDailyMinutes = Math.min(targetMinutes, Math.round(weeklyMinutes / 7) || 20);
  const minutesPct = Math.min(100, Math.round((currentDailyMinutes / targetMinutes) * 100));

  const masteredCards = Math.max(0, totalCards - dueCards);
  const cardsPct = totalCards > 0 ? Math.min(100, Math.round((masteredCards / totalCards) * 100)) : 100;

  const targetCredits = 20;
  const creditsPct = Math.min(100, Math.round((creditBalance / targetCredits) * 100));

  // Circular ring geometry (size 120x120)
  // Outer Ring: Study Minutes (r = 48) -> circumference = 2 * PI * 48 = 301.6
  // Middle Ring: Cards Mastered (r = 38) -> circumference = 2 * PI * 38 = 238.7
  // Inner Ring: Credits Available (r = 28) -> circumference = 2 * PI * 28 = 175.9
  const cOuter = 301.6;
  const offsetOuter = cOuter - (minutesPct / 100) * cOuter;

  const cMiddle = 238.7;
  const offsetMiddle = cMiddle - (cardsPct / 100) * cMiddle;

  const cInner = 175.9;
  const offsetInner = cInner - (creditsPct / 100) * cInner;

  return (
    <div className="flex items-center gap-4 p-3 rounded-2xl bg-card border border-[#D89A06]/25 shadow-2xs">
      {/* Concentric SVG Rings */}
      <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
          {/* Background Tracks */}
          <circle cx="60" cy="60" r="48" stroke="currentColor" strokeWidth="7" fill="none" className="text-muted/30" />
          <circle cx="60" cy="60" r="38" stroke="currentColor" strokeWidth="7" fill="none" className="text-muted/30" />
          <circle cx="60" cy="60" r="28" stroke="currentColor" strokeWidth="7" fill="none" className="text-muted/30" />

          {/* Active Rings with smooth strokeDashoffset */}
          {/* Outer Ring: Minutes (Gold) */}
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

          {/* Inner Ring: Credits (Deep Navy / Cyan) */}
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
            className="transition-all duration-700 ease-out dark:stroke-[#38bdf8]"
          />
        </svg>

        {/* Center Icon Badge */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <Flame className="w-4 h-4 text-[#D89A06] animate-pulse" />
          <span className="text-[10px] font-mono font-black text-[#00004E] dark:text-white leading-none mt-0.5">
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
            <span className="truncate">Focus Velocity</span>
          </span>
          <span className="font-mono font-bold text-foreground tabular-nums shrink-0">
            {currentDailyMinutes}m / {targetMinutes}m
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground truncate">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
            <BrainCircuit className="w-3 h-3 text-[#10B981]" />
            <span className="truncate">Cards Mastered</span>
          </span>
          <span className="font-mono font-bold text-foreground tabular-nums shrink-0">
            {cardsPct}%
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground truncate">
            <span className="w-2 h-2 rounded-full bg-[#00004E] dark:bg-[#38bdf8] shrink-0" />
            <Coins className="w-3 h-3 text-[#00004E] dark:text-[#38bdf8]" />
            <span className="truncate">AI Fuel (Credits)</span>
          </span>
          <span className="font-mono font-bold text-[#00004E] dark:text-[#D89A06] tabular-nums shrink-0">
            {creditBalance}
          </span>
        </div>
      </div>
    </div>
  );
}
