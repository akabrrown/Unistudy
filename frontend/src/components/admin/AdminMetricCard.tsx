'use client';

import React from 'react';
import { Sparkline } from '@/components/ui/sparkline';
import { cn } from '@/lib/utils';

interface AdminMetricCardProps {
  label: string;
  value: React.ReactNode;
  subtext?: string;
  delta?: string;
  deltaTone?: 'positive' | 'negative' | 'neutral';
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger' | string;
  icon?: React.ElementType;
  sparklineData?: number[];
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export function AdminMetricCard({
  label,
  value,
  subtext,
  delta,
  deltaTone = 'neutral',
  tone,
  icon: Icon,
  sparklineData,
  active = false,
  onClick,
  className,
}: AdminMetricCardProps) {
  const Comp = onClick ? 'button' : 'div';

  const toneClass =
    tone === 'danger'
      ? 'border-rose-500/40 bg-rose-500/5'
      : tone === 'warning'
      ? 'border-amber-500/40 bg-amber-500/5'
      : tone === 'success'
      ? 'border-emerald-500/40 bg-emerald-500/5'
      : tone === 'accent'
      ? 'border-[#00004E]/30 dark:border-[#D89A06]/40'
      : '';

  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'group relative rounded-xl border bg-card p-4 text-left transition-all',
        onClick && 'cursor-pointer active:scale-[0.99]',
        active
          ? 'border-[#00004E] dark:border-[#D89A06] ring-1 ring-[#00004E]/15 dark:ring-[#D89A06]/25 shadow-xs'
          : 'border-border/70 hover:border-[#D89A06]/50',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-muted-foreground truncate">{label}</span>
        {Icon ? (
          <Icon
            className={cn(
              'w-3.5 h-3.5 shrink-0 transition-colors',
              active ? 'text-[#D89A06]' : 'text-muted-foreground/70 group-hover:text-foreground'
            )}
          />
        ) : null}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xl md:text-2xl font-bold tracking-tight text-foreground font-mono tabular-nums truncate">
            {value}
          </div>
          {(delta || subtext) && (
            <div className="flex items-center gap-1.5 mt-1 text-[11px] truncate">
              {delta ? (
                <span
                  className={cn(
                    'font-mono font-semibold tabular-nums',
                    deltaTone === 'positive' && 'text-emerald-600 dark:text-emerald-400',
                    deltaTone === 'negative' && 'text-rose-600 dark:text-rose-400',
                    deltaTone === 'neutral' && 'text-muted-foreground'
                  )}
                >
                  {delta}
                </span>
              ) : null}
              {subtext ? <span className="text-muted-foreground truncate">{subtext}</span> : null}
            </div>
          )}
        </div>

        {sparklineData && sparklineData.length >= 2 ? (
          <Sparkline
            data={sparklineData}
            width={72}
            height={26}
            strokeColor={deltaTone === 'negative' ? '#e11d48' : '#D89A06'}
          />
        ) : null}
      </div>
    </Comp>
  );
}
