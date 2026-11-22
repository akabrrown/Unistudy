import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, ShieldCheck, Sparkles, BookOpen, GraduationCap } from 'lucide-react';
import { UniStudyLogo } from '@/components/brand/UniStudyLogo';

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  badge?: string;
  title: string;
  description: string;
  showcaseFeature?: string;
}

export function AuthSplitLayout({
  children,
  badge = 'UPSA Academic Excellence',
  title,
  description,
  showcaseFeature = 'AI-Grounded Studies',
}: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background">
      {/* ── Left Showcase Panel (Visible on lg+) ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 relative bg-gradient-to-br from-[#00004E] via-[#000038] to-[#05051C] text-white p-10 xl:p-14 flex-col justify-between overflow-hidden border-r border-[#D89A06]/20">
        {/* Ambient collegiate background glow */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-[#D89A06]/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 rounded-full bg-[#00004E]/50 blur-3xl pointer-events-none" />
        
        {/* Subtle grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none" 
          style={{ backgroundImage: 'radial-gradient(#D89A06 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
        />

        {/* Top Header: Brand + Return link */}
        <div className="relative z-10 space-y-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-white/70 hover:text-[#D89A06] transition-colors py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 hover:border-[#D89A06]/40 backdrop-blur-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to unistudy.ai</span>
          </Link>

          <div>
            <UniStudyLogo variant="primary" themeMode="dark" height={42} showSubtitle={false} />
          </div>
        </div>

        {/* Middle: Collegiate Academic Pitch */}
        <div className="relative z-10 my-auto py-8 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D89A06]/15 border border-[#D89A06]/30 text-[#D89A06] text-xs font-semibold tracking-wide uppercase">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>{badge}</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
            {title}
          </h1>

          <p className="text-white/80 text-sm xl:text-base leading-relaxed max-w-md">
            {description}
          </p>

          {/* Feature Highlights */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-[#D89A06]/20 border border-[#D89A06]/40 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#D89A06]" />
              </div>
              <p className="text-xs xl:text-sm text-white/90">
                <strong>100% Grounded in Official Slides:</strong> AI tutors retrieve exact paragraphs and slide citations for your UPSA course.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-[#D89A06]/20 border border-[#D89A06]/40 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#D89A06]" />
              </div>
              <p className="text-xs xl:text-sm text-white/90">
                <strong>Past Questions & Mock Solutions:</strong> Verified exam answers and instant grading across Level 100 to 400.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-[#D89A06]/20 border border-[#D89A06]/40 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#D89A06]" />
              </div>
              <p className="text-xs xl:text-sm text-white/90">
                <strong>All 4 UPSA Faculties Supported:</strong> Tailored paths for Accounting & Finance, Management, IT & Comm, and Law.
              </p>
            </div>
          </div>

          {/* Student Testimonial Quote */}
          <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-2">
            <p className="text-xs text-white/85 italic leading-relaxed">
              &ldquo;UniStudy helped me synthesize semester slide decks in hours rather than days. My GPA in Banking &amp; Finance leaped from 2.9 to 3.8.&rdquo;
            </p>
            <div className="flex items-center justify-between text-[11px] text-[#D89A06] font-medium pt-1">
              <span>Kwame A. • UPSA Level 300 Scholar</span>
              <span className="text-white/40">Verified Student</span>
            </div>
          </div>
        </div>

        {/* Bottom Footer: Security & Compliance */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-white/60">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#D89A06]" />
            <span>Row-Level Security &amp; End-to-End Encryption</span>
          </div>
          <span>&copy; {new Date().getFullYear()} UniStudy AI</span>
        </div>
      </div>

      {/* ── Right Action Panel (Forms) ── */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 md:px-12 lg:px-14 xl:px-20 py-8 lg:py-12 relative overflow-y-auto">
        {/* Mobile top navigation */}
        <div className="lg:hidden flex items-center justify-between pb-6 mb-4 border-b border-border/50">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
          <UniStudyLogo variant="primary" height={32} showSubtitle={false} />
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md mx-auto my-auto py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
