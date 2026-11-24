'use client';

import React from 'react';

export function FlashcardStackIllustration({ className = 'w-48 h-36' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Background Soft Glow */}
      <circle cx="120" cy="90" r="66" fill="currentColor" className="text-[#D89A06]/10" />

      {/* Shadow Base */}
      <ellipse cx="120" cy="150" rx="60" ry="5" fill="currentColor" className="text-border/40" />

      {/* Card 3 (Bottom Stack) */}
      <rect x="68" y="60" width="104" height="68" rx="8" fill="currentColor" className="text-muted/40" stroke="currentColor" strokeWidth="1.5" />

      {/* Card 2 (Middle Angled Stack) */}
      <g transform="rotate(4 120 90)">
        <rect x="66" y="52" width="104" height="68" rx="8" fill="currentColor" className="text-muted/80" stroke="currentColor" strokeWidth="1.5" />
      </g>

      {/* Card 1 (Top Hero Active Flashcard) */}
      <g transform="rotate(-3 120 86)">
        <rect x="64" y="44" width="108" height="72" rx="8" fill="currentColor" className="text-card" stroke="#00004E" strokeWidth="2" />
        
        {/* Card Header Tag */}
        <rect x="74" y="54" width="36" height="6" rx="3" fill="#D89A06" />
        <circle cx="158" cy="57" r="3" fill="#00004E" className="dark:fill-[#D89A06]" />

        {/* Question Concept Typography Simulation */}
        <line x1="74" y1="70" x2="148" y2="70" stroke="currentColor" strokeWidth="2" className="text-foreground" strokeLinecap="round" />
        <line x1="74" y1="78" x2="134" y2="78" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/60" strokeLinecap="round" />
        
        {/* Bottom SM-2 Spaced Repetition Quality Indicators */}
        <circle cx="80" cy="102" r="3" fill="#EF4444" />
        <circle cx="92" cy="102" r="3" fill="#F59E0B" />
        <circle cx="104" cy="102" r="3" fill="#10B981" />
        <line x1="120" y1="102" x2="158" y2="102" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/40" strokeLinecap="round" />
      </g>
    </svg>
  );
}
