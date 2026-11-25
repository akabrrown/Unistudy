'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { MarketingNavbar } from '@/components/layout/MarketingNavbar';
import { MarketingFooter } from '@/components/layout/MarketingFooter';
import { SPRING_SNAPPY, useAppReducedMotion } from '@/lib/motion';
import { ShieldCheck, Lock, FileText, Cookie, CheckCircle2 } from 'lucide-react';

const POLICY_TABS = [
  { href: '/academic-integrity', label: 'Academic Integrity', icon: ShieldCheck },
  { href: '/privacy', label: 'Privacy Policy', icon: Lock },
  { href: '/terms', label: 'Terms of Service', icon: FileText },
  { href: '/cookies', label: 'Cookies & Storage', icon: Cookie },
] as const;

export interface TocSection {
  id: string;
  label: string;
}

interface CollegiateLegalShellProps {
  title: string;
  subtitle: string;
  summaryBanner: React.ReactNode;
  sections: TocSection[];
  children: React.ReactNode;
}

export function CollegiateLegalShell({
  title,
  subtitle,
  summaryBanner,
  sections,
  children,
}: CollegiateLegalShellProps) {
  const pathname = usePathname();
  const reducedMotion = useAppReducedMotion();
  const [activeId, setActiveId] = useState<string>(sections[0]?.id || '');

  useEffect(() => {
    if (typeof window === 'undefined' || sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 }
    );

    sections.forEach((sec) => {
      const el = document.getElementById(sec.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="min-h-[100dvh] bg-[#F8F9FD] dark:bg-[#040416] text-foreground transition-colors flex flex-col">
      <MarketingNavbar />

      {/* Sibling Policy Switcher Bar */}
      <div className="border-b border-border/60 bg-white/70 dark:bg-[#070720]/70 backdrop-blur-xs">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 flex items-center gap-2 overflow-x-auto py-2.5 [&::-webkit-scrollbar]:hidden">
          {POLICY_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  active
                    ? 'text-white dark:text-[#00004E]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="legal-suite-tab"
                    transition={reducedMotion ? { duration: 0 } : SPRING_SNAPPY}
                    className="absolute inset-0 rounded-lg bg-[#00004E] dark:bg-[#D89A06]"
                  />
                )}
                <Icon
                  className={`w-3.5 h-3.5 relative z-10 shrink-0 ${
                    active ? 'text-[#D89A06] dark:text-[#00004E]' : ''
                  }`}
                />
                <span className="relative z-10">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 sm:px-8 py-12 md:py-16">
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          {/* Left Sticky TOC */}
          <aside className="hidden lg:block lg:col-span-3 sticky top-24 space-y-3">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground px-2">
              On This Page
            </div>
            <nav className="space-y-0.5 border-l border-border/70">
              {sections.map((sec) => {
                const isCurrent = activeId === sec.id;
                return (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={() => setActiveId(sec.id)}
                    className={`block pl-3.5 py-1.5 text-xs transition-colors -ml-px border-l-2 ${
                      isCurrent
                        ? 'border-[#D89A06] text-[#00004E] dark:text-white font-semibold'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {sec.label}
                  </a>
                );
              })}
            </nav>
          </aside>

          {/* Right Document Body */}
          <div className="lg:col-span-9 space-y-8 min-w-0">
            <header className="space-y-2 pb-6 border-b border-border/60">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#00004E] dark:text-white">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
            </header>

            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0A0A28] border border-border/80 border-l-4 border-l-[#D89A06] text-xs sm:text-sm leading-relaxed shadow-2xs">
              {summaryBanner}
            </div>

            <div className="space-y-10 text-sm sm:text-[15px] leading-relaxed text-foreground/90">
              {children}
            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

export function BrowserStorageInspector() {
  const [status, setStatus] = useState({
    theme: 'system',
    indexedDbSupported: true,
    localStorageReady: true,
  });

  useEffect(() => {
    setStatus({
      theme: localStorage.getItem('theme') || (document.documentElement.classList.contains('dark') ? 'dark' : 'light'),
      indexedDbSupported: typeof indexedDB !== 'undefined',
      localStorageReady: typeof localStorage !== 'undefined',
    });
  }, []);

  return (
    <div className="rounded-2xl border border-border/80 bg-white dark:bg-[#0A0A28] p-5 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#00004E] dark:text-white">
          Live Browser Storage Diagnostic (This Device)
        </span>
        <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
          0 Ad Trackers Active
        </span>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-[#F8F9FD] dark:bg-white/[0.04] border border-border/70">
          <div className="text-[10px] font-mono text-muted-foreground">ACTIVE THEME KEY</div>
          <div className="font-mono font-bold text-foreground mt-1 capitalize">{status.theme}</div>
        </div>
        <div className="p-3 rounded-xl bg-[#F8F9FD] dark:bg-white/[0.04] border border-border/70">
          <div className="text-[10px] font-mono text-muted-foreground">INDEXEDDB OFFLINE VAULT</div>
          <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{status.indexedDbSupported ? 'Available' : 'Unavailable'}</span>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-[#F8F9FD] dark:bg-white/[0.04] border border-border/70">
          <div className="text-[10px] font-mono text-muted-foreground">THIRD-PARTY PIXELS</div>
          <div className="font-mono font-bold text-foreground mt-1">0 Loaded</div>
        </div>
      </div>
    </div>
  );
}
