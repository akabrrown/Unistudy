'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AdminPageHeaderProps {
  title: string;
  count?: number | string;
  subtitle?: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  count,
  subtitle,
  description,
  badge,
  actions,
  className,
}: AdminPageHeaderProps) {
  const sub = subtitle ?? description;
  return (
    <header
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60',
        className
      )}
    >
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground truncate">
            {title}
          </h1>
          {count !== undefined && (
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-muted-foreground tabular-nums">
              {count}
            </span>
          )}
          {badge}
        </div>
        {sub ? (
          <p className="text-xs text-muted-foreground max-w-2xl">{sub}</p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      ) : null}
    </header>
  );
}
