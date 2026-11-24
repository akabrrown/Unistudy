'use client';

import React from 'react';

export function StudyTutorDeskIllustration({ className = 'w-48 h-36' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Background Soft Glow */}
      <circle cx="120" cy="85" r="64" fill="currentColor" className="text-[#D89A06]/10" />

      {/* Desk Surface */}
      <rect x="28" y="136" width="184" height="4" rx="2" fill="currentColor" className="text-border" />

      {/* Laptop / Tablet Stage */}
      <rect x="74" y="66" width="92" height="64" rx="4" fill="#00004E" className="dark:fill-[#0A0E2A]" stroke="#00004E" strokeWidth="2" />
      <rect x="78" y="70" width="84" height="52" rx="2" fill="currentColor" className="text-card" />
      
      {/* Screen Content: Grounded Tutor Discussion Preview */}
      <rect x="84" y="76" width="28" height="4" rx="2" fill="#D89A06" />
      <rect x="84" y="84" width="48" height="8" rx="2" fill="#00004E" className="dark:fill-[#D89A06]/20" />
      <rect x="84" y="96" width="72" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground/40" />
      <rect x="84" y="102" width="60" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground/30" />
      <rect x="84" y="108" width="40" height="3" rx="1.5" fill="currentColor" className="text-muted-foreground/30" />

      {/* Laptop Base */}
      <path d="M64 130H176L168 136H72L64 130Z" fill="currentColor" className="text-border" />
      <rect x="110" y="132" width="20" height="2" rx="1" fill="#D89A06" />

      {/* Academic Notepad on Left */}
      <g transform="rotate(-8 52 118)">
        <rect x="42" y="98" width="28" height="36" rx="2" fill="currentColor" className="text-card" stroke="currentColor" strokeWidth="1.5" />
        <line x1="46" y1="104" x2="62" y2="104" stroke="#D89A06" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="46" y1="110" x2="64" y2="110" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/40" />
        <line x1="46" y1="116" x2="60" y2="116" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/40" />
        <line x1="46" y1="122" x2="58" y2="122" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/40" />
      </g>

      {/* Coffee Cup on Right */}
      <rect x="180" y="112" width="14" height="20" rx="3" fill="currentColor" className="text-muted/80" stroke="currentColor" strokeWidth="1.5" />
      <path d="M194 116C196.209 116 198 117.791 198 120C198 122.209 196.209 124 194 124" stroke="currentColor" strokeWidth="1.5" className="text-muted/80" />
      <path d="M184 104C184 102 186 100 186 98" stroke="#D89A06" strokeWidth="1" strokeLinecap="round" />
      <path d="M188 106C188 104 190 102 190 100" stroke="#D89A06" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}
