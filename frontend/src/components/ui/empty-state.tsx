'use client';

import React from 'react';
import Link from 'next/link';
import { LucideIcon, BookOpenCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  illustration?: React.ReactNode;
  badge?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = BookOpenCheck,
  illustration,
  badge,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-primary/25 bg-primary/2 backdrop-blur-xs overflow-hidden',
        className
      )}
    >
      {/* Ambient Collegiate Glow */}
      <div className="absolute inset-0 bg-radial from-primary/5 via-transparent to-transparent pointer-events-none" />

      {/* Decorative Visual / Illustration Well */}
      {illustration ? (
        <div className="relative mb-5 flex items-center justify-center">
          {illustration}
          {badge && (
            <span className="absolute -top-1 -right-2 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-full bg-[#D89A06] text-slate-950 shadow-xs">
              {badge}
            </span>
          )}
        </div>
      ) : (
        <div className="relative mb-4 flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xs text-primary transition-transform hover:scale-105 duration-200">
            <Icon className="w-8 h-8" />
          </div>
          {badge && (
            <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded-full bg-[#D89A06] text-slate-950 shadow-xs">
              {badge}
            </span>
          )}
        </div>
      )}

      {/* Editorial Content */}
      <h3 className="text-lg font-bold text-foreground tracking-tight max-w-sm mb-1.5">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md mb-6">
        {description}
      </p>

      {/* Action Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {action && (
          action.href ? (
            <Link href={action.href}>
              <Button size="default" className="shadow-xs font-semibold">
                {action.icon && <action.icon className="w-4 h-4 mr-1.5" />}
                {action.label}
              </Button>
            </Link>
          ) : (
            <Button onClick={action.onClick} size="default" className="shadow-xs font-semibold">
              {action.icon && <action.icon className="w-4 h-4 mr-1.5" />}
              {action.label}
            </Button>
          )
        )}

        {secondaryAction && (
          secondaryAction.href ? (
            <Link href={secondaryAction.href}>
              <Button variant="outline" size="default" className="border-primary/20 text-xs">
                {secondaryAction.label}
              </Button>
            </Link>
          ) : (
            <Button onClick={secondaryAction.onClick} variant="outline" size="default" className="border-primary/20 text-xs">
              {secondaryAction.label}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
