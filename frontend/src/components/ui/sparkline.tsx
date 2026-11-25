'use client';

import React, { useId } from 'react';
import { cn } from '@/lib/utils';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  strokeColor?: string;
  color?: string;
  className?: string;
}

export function Sparkline({
  data,
  width = 84,
  height = 28,
  strokeColor,
  color,
  className,
}: SparklineProps) {
  const effectiveColor = color ?? strokeColor ?? '#D89A06';
  const gradId = useId();
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const points = data.map((val, idx) => {
    const x = pad + (idx / (data.length - 1)) * innerW;
    const y = pad + innerH - ((val - min) / range) * innerH;
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible shrink-0', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.24" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface RadialRingProps {
  percent?: number;
  value?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  accentColor?: string;
  color?: string;
  className?: string;
}

export function RadialRing({
  percent,
  value,
  size = 64,
  strokeWidth = 5.5,
  label,
  sublabel,
  accentColor,
  color,
  className,
}: RadialRingProps) {
  const effectivePercent = percent ?? value ?? 0;
  const effectiveStroke = color ?? accentColor ?? '#D89A06';
  const clamped = Math.max(0, Math.min(100, Math.round(effectivePercent)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center shrink-0', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/50"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={effectiveStroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
        <span className="font-mono text-xs font-bold text-foreground tabular-nums">
          {label ?? `${clamped}%`}
        </span>
        {sublabel ? (
          <span className="text-[9px] text-muted-foreground mt-0.5">{sublabel}</span>
        ) : null}
      </div>
    </div>
  );
}
