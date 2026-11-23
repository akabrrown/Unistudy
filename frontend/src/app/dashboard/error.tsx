'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[DashboardError Boundary]:', error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto my-16 p-6 md:p-8 rounded-2xl border border-border bg-card text-center space-y-5 shadow-xs">
      <div className="w-12 h-12 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center mx-auto">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold text-foreground">
          Unable to Load Workspace Section
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {error?.message || 'A temporary network or server interruption occurred while loading this view.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Button
          onClick={() => reset()}
          className="gap-1.5 bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Reload View
        </Button>
        <Link href="/dashboard">
          <Button variant="outline" className="gap-1.5 cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
