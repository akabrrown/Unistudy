'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CopyableIdProps {
  value?: string;
  id?: string;
  displayValue?: string;
  truncateLength?: number;
  toastMessage?: string;
  className?: string;
}

export function CopyableId({
  value,
  id,
  displayValue,
  truncateLength = 8,
  toastMessage,
  className,
}: CopyableIdProps) {
  const [copied, setCopied] = useState(false);
  const targetVal = value ?? id ?? '';

  if (!targetVal) return <span className="text-xs text-muted-foreground font-mono">—</span>;

  const shown =
    displayValue ??
    (targetVal.length > truncateLength * 2
      ? `${targetVal.slice(0, truncateLength)}…${targetVal.slice(-4)}`
      : targetVal);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(targetVal);
      setCopied(true);
      if (toastMessage) toast.success(toastMessage);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Copy ${value}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-transparent hover:border-border/60 transition-colors cursor-pointer tabular-nums active:scale-[0.98]',
        className
      )}
    >
      <span className="truncate">{shown}</span>
      {copied ? (
        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 animate-in zoom-in-75 duration-150" />
      ) : (
        <Copy className="w-3 h-3 opacity-60 shrink-0" />
      )}
    </button>
  );
}
