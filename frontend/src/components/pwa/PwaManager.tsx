'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Download, WifiOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker on window load
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      const registerSW = async () => {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });

          // Check for service worker updates
          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (installing) {
              installing.addEventListener('statechange', () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  toast.info('A new version of UniStudy is available.', {
                    action: {
                      label: 'Update',
                      onClick: () => {
                        installing.postMessage({ type: 'SKIP_WAITING' });
                        window.location.reload();
                      },
                    },
                  });
                }
              });
            }
          });
        } catch (err) {
          console.warn('[PWA] Service worker registration notice:', err);
        }
      };

      if (document.readyState === 'complete') {
        void registerSW();
      } else {
        window.addEventListener('load', registerSW, { once: true });
      }
    }

    // 2. Online / Offline network status listeners
    const handleOnline = () => {
      toast.success('Back online', {
        description: 'Connection restored. Syncing your notes and updates.',
        duration: 3500,
      });
    };

    const handleOffline = () => {
      toast.warning('Working offline', {
        icon: <WifiOff className="w-4 h-4 text-[#D89A06]" />,
        description: 'Cached slides, notes, and past papers remain available.',
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 3. PWA Install Prompt capture
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // Check if user previously dismissed prompt within 7 days
      const lastDismissed = localStorage.getItem('unistudy_pwa_dismissed');
      if (lastDismissed) {
        const timeDiff = Date.now() - parseInt(lastDismissed, 10);
        if (timeDiff < 7 * 24 * 60 * 60 * 1000) {
          return;
        }
      }

      // Show install banner smoothly after initial engagement (6s)
      const timer = setTimeout(() => {
        setShowInstallBanner(true);
      }, 6000);

      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Track when app is installed
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
      toast.success('UniStudy App installed successfully!');
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowInstallBanner(false);
      }
    } catch (err) {
      console.warn('[PWA] Install prompt error:', err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    try {
      localStorage.setItem('unistudy_pwa_dismissed', Date.now().toString());
    } catch {}
  };

  if (!showInstallBanner || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm w-[calc(100vw-32px)] bg-[#00004E] text-white p-3.5 rounded-xl border border-[#D89A06]/40 shadow-xl shadow-black/40 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-[#D89A06]/20 border border-[#D89A06]/40 flex items-center justify-center shrink-0">
          <Download className="w-4 h-4 text-[#D89A06]" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate">Install UniStudy App</p>
          <p className="text-[11px] text-white/70 truncate">Fast access & offline study</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          onClick={handleInstallClick}
          className="h-8 px-3 text-xs bg-[#D89A06] hover:bg-[#c28a05] text-[#00004E] font-semibold rounded-lg"
        >
          Install
        </Button>
        <button
          onClick={handleDismiss}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Dismiss install prompt"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
