'use client';

import React from 'react';

export function ExamArchiveIllustration({ className = 'w-48 h-36' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Background radial glow */}
      <circle cx="120" cy="90" r="68" fill="currentColor" className="text-[#D89A06]/10" />

      {/* Shadow Base */}
      <ellipse cx="120" cy="154" rx="72" ry="6" fill="currentColor" className="text-border/40" />

      {/* Background Examination Paper Sheet (Tilted) */}
      <g transform="rotate(-6 100 95)">
        <rect x="68" y="38" width="80" height="106" rx="4" fill="currentColor" className="text-muted/60" stroke="currentColor" strokeWidth="1.5" />
        <line x1="80" y1="56" x2="120" y2="56" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/30" />
        <line x1="80" y1="66" x2="136" y2="66" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/20" />
        <line x1="80" y1="74" x2="130" y2="74" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/20" />
      </g>

      {/* Main Official Examination Paper Sheet */}
      <rect x="80" y="32" width="88" height="116" rx="4" fill="currentColor" className="text-card" stroke="#00004E" strokeWidth="2" />
      
      {/* University Header Banner */}
      <rect x="80" y="32" width="88" height="22" rx="4" fill="#00004E" />
      <circle cx="94" cy="43" r="5" fill="#D89A06" />
      <line x1="104" y1="41" x2="148" y2="41" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="104" y1="46" x2="132" y2="46" stroke="#D89A06" strokeWidth="1" strokeLinecap="round" />

      {/* Question Lines & Rubric Geometry */}
      <line x1="92" y1="64" x2="156" y2="64" stroke="currentColor" strokeWidth="2" className="text-foreground/80" strokeLinecap="round" />
      <line x1="92" y1="72" x2="148" y2="72" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/50" strokeLinecap="round" />
      <line x1="92" y1="80" x2="140" y2="80" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/50" strokeLinecap="round" />

      {/* Multiple Choice Bubbles / Ticks */}
      <circle cx="96" cy="94" r="3.5" fill="#00004E" className="dark:fill-[#D89A06]" />
      <line x1="104" y1="94" x2="144" y2="94" stroke="currentColor" strokeWidth="1.5" className="text-foreground/70" strokeLinecap="round" />

      <circle cx="96" cy="106" r="3.5" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/60" />
      <line x1="104" y1="106" x2="136" y2="106" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/50" strokeLinecap="round" />

      <circle cx="96" cy="118" r="3.5" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/60" />
      <line x1="104" y1="118" x2="148" y2="118" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/50" strokeLinecap="round" />

      {/* Official Score Stamp Badge (Bottom Right) */}
      <g transform="rotate(12 152 132)">
        <circle cx="152" cy="132" r="16" fill="#FEF8E7" stroke="#D89A06" strokeWidth="2" />
        <path d="M145 132L150 137L160 127" stroke="#00004E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
