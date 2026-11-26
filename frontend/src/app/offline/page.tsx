'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WifiOff, RefreshCw, LayoutDashboard, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    const handleOnline = () => {
      setIsOnline(true);
      window.location.reload();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    if (typeof window !== 'undefined') {
      if (navigator.onLine) {
        window.location.reload();
      } else {
        setTimeout(() => setIsRetrying(false), 800);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#00004E] text-white flex flex-col items-center justify-center p-6 selection:bg-[#D89A06]/30">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#D89A06]/15 border border-[#D89A06]/30 flex items-center justify-center text-[#D89A06]">
            <WifiOff className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-white">You are currently offline</h1>
            <p className="text-sm text-white/70">
              Check your connection or access your locally saved study materials.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-white/80 space-y-2">
          <div className="flex items-center gap-2 font-medium text-[#D89A06]">
            <span className="w-2 h-2 rounded-full bg-[#D89A06] animate-pulse" />
            Offline Mode Active
          </div>
          <p className="leading-relaxed">
            Slide notes, recent lecture decks, and past question previews you previously opened remain available from your local browser cache.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full bg-[#D89A06] hover:bg-[#c28a05] text-[#00004E] font-semibold h-11 rounded-xl gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Checking connection...' : 'Retry Connection'}
          </Button>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link href="/dashboard" className="w-full">
              <Button
                variant="outline"
                className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white h-10 rounded-xl text-xs gap-1.5"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-[#D89A06]" />
                Dashboard
              </Button>
            </Link>
            <Link href="/dashboard/past-papers" className="w-full">
              <Button
                variant="outline"
                className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white h-10 rounded-xl text-xs gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-[#D89A06]" />
                Past Papers
              </Button>
            </Link>
          </div>
        </div>

        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
          <span>UniStudy AI Companion</span>
          <span className="font-mono">{isOnline ? 'Online' : 'Disconnected'}</span>
        </div>
      </div>
    </div>
  );
}
