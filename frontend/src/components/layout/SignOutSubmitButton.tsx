'use client';

import React from 'react';
import { useFormStatus } from 'react-dom';
import { LogOut, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SignOutSubmitButtonProps {
  collapsed?: boolean;
  label?: string;
  className?: string;
}

export function SignOutSubmitButton({
  collapsed = false,
  label = 'Sign Out',
  className,
}: SignOutSubmitButtonProps) {
  const { pending } = useFormStatus();

  if (collapsed) {
    return (
      <button
        type="submit"
        disabled={pending}
        aria-label={label}
        className={cn(
          'w-9 h-9 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-border/70 flex items-center justify-center transition-colors focus:outline-hidden disabled:opacity-60 cursor-pointer active:scale-[0.97]',
          className
        )}
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border/80 bg-background px-3 h-8 text-xs font-semibold text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive transition-colors disabled:opacity-60 cursor-pointer active:scale-[0.98]',
        className
      )}
    >
      {pending ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Signing out...</span>
        </>
      ) : (
        <>
          <LogOut className="w-3.5 h-3.5" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
