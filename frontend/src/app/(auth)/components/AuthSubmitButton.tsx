'use client';

import React from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthSubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  loadingText?: string;
  className?: string;
  icon?: React.ReactNode;
}

export function AuthSubmitButton({
  children = 'Sign In',
  loadingText = 'Signing in...',
  className,
  icon = <ArrowRight className="w-4 h-4" />,
  ...props
}: AuthSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending || props.disabled}
      aria-busy={pending}
      className={cn(
        'w-full h-11 rounded-xl bg-[#00004E] hover:bg-[#000038] text-white dark:bg-[#D89A06] dark:hover:bg-[#c48b05] dark:text-[#00004E] font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 mt-2 select-none disabled:opacity-75 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          <span>{children}</span>
          {icon}
        </>
      )}
    </Button>
  );
}
