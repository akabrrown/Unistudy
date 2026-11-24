'use client';

import React from 'react';

export function CollegiateLibraryIllustration({ className = 'w-48 h-36' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Subtle ambient glow circle */}
      <circle cx="120" cy="90" r="70" fill="currentColor" className="text-[#D89A06]/10" />

      {/* Base Platform Shelf */}
      <rect x="24" y="142" width="192" height="4" rx="2" fill="currentColor" className="text-border" />
      <rect x="36" y="146" width="168" height="2" rx="1" fill="currentColor" className="text-border/40" />

      {/* Book 1 (Left Angled) */}
      <g transform="rotate(-8 60 142)">
        <rect x="52" y="70" width="16" height="72" rx="2" fill="#00004E" className="dark:fill-[#00004E]/80" />
        <rect x="54" y="74" width="12" height="64" rx="1" fill="currentColor" className="text-white/10" />
        <line x1="56" y1="84" x2="64" y2="84" stroke="#D89A06" strokeWidth="2" strokeLinecap="round" />
        <line x1="56" y1="90" x2="62" y2="90" stroke="#D89A06" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Book 2 (Left Upright) */}
      <rect x="74" y="58" width="18" height="84" rx="2" fill="currentColor" className="text-[#D89A06]" />
      <rect x="77" y="62" width="12" height="76" rx="1" fill="currentColor" className="text-black/10" />
      <line x1="80" y1="72" x2="86" y2="72" stroke="#00004E" strokeWidth="2" strokeLinecap="round" />

      {/* Book 3 (Middle Main Ledger) */}
      <rect x="98" y="46" width="22" height="96" rx="2" fill="#00004E" className="dark:fill-[#1E234A]" />
      <rect x="101" y="50" width="16" height="88" rx="1" fill="currentColor" className="text-white/5" />
      <circle cx="109" cy="64" r="3" fill="#D89A06" />
      <line x1="104" y1="74" x2="114" y2="74" stroke="currentColor" strokeWidth="1.5" className="text-white/30" />
      <line x1="104" y1="80" x2="114" y2="80" stroke="currentColor" strokeWidth="1.5" className="text-white/30" />
      <line x1="104" y1="86" x2="112" y2="86" stroke="currentColor" strokeWidth="1.5" className="text-white/30" />

      {/* Book 4 (Accent) */}
      <rect x="126" y="64" width="16" height="78" rx="2" fill="currentColor" className="text-muted-foreground/30" />
      <line x1="130" y1="74" x2="138" y2="74" stroke="#D89A06" strokeWidth="1.5" strokeLinecap="round" />

      {/* Stacked Horizontal Books on Right */}
      <rect x="148" y="126" width="56" height="16" rx="2" fill="#00004E" className="dark:fill-[#00004E]/90" />
      <line x1="156" y1="134" x2="188" y2="134" stroke="#D89A06" strokeWidth="2" strokeLinecap="round" />

      <rect x="152" y="110" width="48" height="15" rx="2" fill="currentColor" className="text-[#D89A06]" />
      <line x1="160" y1="117" x2="184" y2="117" stroke="#00004E" strokeWidth="1.5" strokeLinecap="round" />

      <rect x="156" y="96" width="40" height="13" rx="2" fill="currentColor" className="text-muted-foreground/40" />

      {/* Graduation Cap / Scholarly Seal on top stack */}
      <path
        d="M176 80L164 86L176 92L188 86L176 80Z"
        fill="#00004E"
        className="dark:fill-[#D89A06]"
      />
      <path d="M170 89V93C170 94.6569 172.686 96 176 96C179.314 96 182 94.6569 182 93V89" stroke="#00004E" className="dark:stroke-[#D89A06]" strokeWidth="1.5" />
      <path d="M188 86V92" stroke="#D89A06" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
