import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, BookOpen, GraduationCap, FileCheck2, Layers } from 'lucide-react';
import { UniStudyLogo } from '@/components/brand/UniStudyLogo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  badge?: string;
  title: string;
  description: string;
  showcaseFeature?: string;
}

export function AuthSplitLayout({
  children,
  badge = 'UPSA Academic Portal',
  title,
  description,
}: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background">
      {/* ── Left Showcase Panel (Visible on lg+) ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 relative bg-[#00004E] text-white p-10 xl:p-14 flex-col justify-between overflow-hidden border-r border-[#D89A06]/25">
        {/* Subtle architectural dot matrix */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#D89A06 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="absolute -top-28 -right-28 w-80 h-80 rounded-full bg-[#D89A06]/12 blur-3xl pointer-events-none" />

        {/* Top Header: Brand + Return link */}
        <div className="relative z-10 space-y-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-white/75 hover:text-[#D89A06] transition-colors py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#D89A06]/40"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to unistudy.ai</span>
          </Link>

          <div>
            <UniStudyLogo variant="primary" themeMode="dark" height={40} showSubtitle={false} />
          </div>
        </div>

        {/* Middle: Collegiate Specimen Showcase */}
        <div className="relative z-10 my-auto py-8 space-y-6">
          <div className="inline-flex items-center gap-2 text-[#D89A06] text-xs font-mono uppercase tracking-wider">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>{badge}</span>
          </div>

          <div className="space-y-2.5">
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {title}
            </h1>
            <p className="text-white/75 text-sm leading-relaxed max-w-md">
              {description}
            </p>
          </div>

          {/* Visual Specimen Card instead of verbose bullet paragraphs */}
          <div className="rounded-2xl bg-white/[0.06] border border-white/12 p-4 space-y-3.5 backdrop-blur-xs max-w-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-[#D89A06]" />
                <span className="text-xs font-mono font-semibold text-white">
                  BCPC 204 · Financial Accounting
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#D89A06]">[Slide 14]</span>
            </div>

            <div className="rounded-xl bg-[#04042E]/80 border border-white/10 p-3 space-y-1.5">
              <div className="text-[11px] text-white/60 font-mono">IAS 2 Inventory Valuation</div>
              <p className="text-xs text-white/90 leading-relaxed">
                Measure closing stock at the lower of <strong className="text-white">historical cost</strong> and{' '}
                <strong className="text-[#D89A06]">net realizable value (NRV)</strong>.
              </p>
            </div>

            {/* Visual Readiness & Exam Metrics */}
            <div className="grid grid-cols-2 gap-2.5 pt-0.5">
              <div className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono text-white/70">
                  <span className="inline-flex items-center gap-1">
                    <Layers className="w-3 h-3 text-[#D89A06]" />
                    Flashcard Mastery
                  </span>
                  <span className="text-white font-bold tabular-nums">88%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full w-[88%] rounded-full bg-[#D89A06]" />
                </div>
              </div>

              <div className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 flex flex-col justify-between">
                <div className="flex items-center gap-1 text-[10px] font-mono text-white/70">
                  <FileCheck2 className="w-3 h-3 text-emerald-400" />
                  <span>Past Paper Link</span>
                </div>
                <div className="text-xs font-semibold text-white font-mono tabular-nums">
                  2024 Sem 2 · Q2(b)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer: Security & Compliance */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/60">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#D89A06]" />
            <span>Encrypted Student Records</span>
          </div>
          <span className="font-mono tabular-nums">&copy; {new Date().getFullYear()} UniStudy</span>
        </div>
      </div>

      {/* ── Right Action Panel (Forms) ── */}
      <div className="flex-1 flex flex-col justify-between px-4 sm:px-8 md:px-12 lg:px-14 xl:px-20 py-6 lg:py-10 relative overflow-y-auto">
        {/* Desktop subtle ThemeToggle */}
        <div className="hidden lg:flex items-center justify-end">
          <ThemeToggle />
        </div>

        {/* Mobile top navigation */}
        <div className="lg:hidden flex items-center justify-between pb-5 mb-4 border-b border-border/50">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
          <UniStudyLogo variant="primary" height={30} showSubtitle={false} />
          <ThemeToggle />
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md mx-auto my-auto py-4">
          {children}
        </div>

        <div className="hidden lg:block h-4" aria-hidden="true" />
      </div>
    </div>
  );
}
