import Link from 'next/link';
import { MarketingNavbar } from '@/components/layout/MarketingNavbar';
import { MarketingFooter } from '@/components/layout/MarketingFooter';
import { LiveCmsSections } from '@/components/landing/LiveCmsSections';
import { HeroInteractiveSpecimen, SlideExamMatcherCard } from '@/components/landing/HeroInteractiveSpecimen';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

export const revalidate = 60;

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-[#F8F9FD] dark:bg-[#040416] text-[#00004E] dark:text-white transition-colors selection:bg-[#D89A06] selection:text-[#00004E]">
      <MarketingNavbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 md:pt-20 pb-16 md:pb-24 border-b border-border/60 dark:border-white/10">
        <div className="absolute top-0 right-1/4 w-[520px] h-[520px] bg-gradient-to-br from-[#FEF8E7] to-[#D89A06]/10 dark:from-[#D89A06]/10 dark:to-transparent rounded-full blur-[130px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#00004E] dark:text-[#D89A06] border-l-2 border-[#D89A06] pl-3">
                <span>University of Professional Studies, Accra · Academic Study Suite</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-black leading-[1.06] tracking-tight text-[#00004E] dark:text-white text-balance">
                Master Your Coursework.{' '}
                <span className="text-[#D89A06]">Walk Into Finals Ready.</span>
              </h1>

              <p className="text-base md:text-lg text-[#3A4363] dark:text-[#A3A8C2] leading-relaxed max-w-lg">
                Upload your lecture slides and past papers for cited slide notes, 120-minute timed mock exams, and step-by-step math solutions.
              </p>

              <div className="pt-1 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 bg-[#00004E] hover:bg-[#000038] text-white border border-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#C28905] px-6 py-3.5 rounded-xl font-bold text-sm transition-all shadow-xs cursor-pointer active:scale-[0.98]"
                >
                  <span>Open Student Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/features"
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-muted dark:bg-white/5 dark:hover:bg-white/10 text-[#00004E] dark:text-white border border-border px-6 py-3.5 rounded-xl font-semibold text-sm transition-colors cursor-pointer active:scale-[0.98]"
                >
                  <span>Explore Academic Tools</span>
                </Link>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-[#4B526B] dark:text-[#A3A8C2]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#D89A06]" />
                  Cited directly to your slides
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#D89A06]" />
                  Level 100–400 past exam archive
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#D89A06]" />
                  20 free credits on sign-up
                </span>
              </div>
            </div>

            {/* Interactive Client Study Specimen */}
            <div className="lg:col-span-5 relative">
              <HeroInteractiveSpecimen />
            </div>
          </div>
        </div>
      </section>

      {/* Asymmetric Study Architecture */}
      <section className="py-20 md:py-24 max-w-7xl mx-auto px-6 sm:px-8">
        <div className="max-w-2xl mb-10 space-y-2">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[#00004E] dark:text-white">
            Anchored to Your Lecturer&apos;s Slides.
          </h2>
          <p className="text-sm md:text-base text-[#4B526B] dark:text-[#A3A8C2]">
            Click any topic below to inspect how slide decks connect directly to past examination papers.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-white dark:bg-[#0A0A28] p-6 md:p-7 flex flex-col justify-between space-y-5 shadow-2xs">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                <span>SLIDE-TO-EXAM MATCHER</span>
                <span>PDF · PPTX · Photos</span>
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-[#00004E] dark:text-white tracking-tight">
                Match lecture slides to past exam questions automatically
              </h3>
            </div>

            <SlideExamMatcherCard />

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                Generates printable A4 cheat sheets &amp; SM-2 flashcards
              </span>
              <Link
                href="/signup"
                className="text-xs font-bold text-[#00004E] dark:text-[#D89A06] hover:underline inline-flex items-center gap-1"
              >
                Try With Your Slides <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-between gap-6">
            <div className="flex-1 rounded-2xl border border-border/80 bg-white dark:bg-[#0A0A28] p-6 flex flex-col justify-between space-y-3 shadow-2xs">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span className="text-[#D89A06] font-semibold">120-MIN EXAM SIMULATOR</span>
                  <span>Section A &amp; B</span>
                </div>
                <h3 className="text-lg font-bold text-[#00004E] dark:text-white">
                  Real Past Papers with Sub-Part Grading
                </h3>
                <p className="text-xs text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed">
                  Instant rubric marking for parts <code className="font-mono">(a)</code>, <code className="font-mono">(b)</code>, <code className="font-mono">(i)</code>, and <code className="font-mono">(ii)</code> alongside worked model solutions.
                </p>
              </div>
              <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Level 100–400 Archive</span>
                <Link href="/signup" className="font-bold text-[#00004E] dark:text-[#D89A06] hover:underline">
                  Browse Papers &rarr;
                </Link>
              </div>
            </div>

            <div className="flex-1 rounded-2xl border border-border/80 bg-[#00004E] text-white p-6 flex flex-col justify-between space-y-3 shadow-2xs">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono text-white/70">
                  <span className="text-[#D89A06] font-semibold">MATH &amp; GRAPH STUDIO</span>
                  <span>Calculus · Matrices · Stats</span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Symbolic Derivations &amp; 2mm Graph Sheets
                </h3>
                <p className="text-xs text-white/80 leading-relaxed">
                  Plot multi-curve coordinate graphs with exact roots and intersections, or scan handwritten derivations to LaTeX.
                </p>
              </div>
              <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs">
                <span className="text-white/70">KaTeX &amp; Handwriting OCR</span>
                <Link href="/features" className="font-bold text-[#D89A06] hover:underline">
                  Preview Plotter &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Academic Integrity Callout */}
      <section className="py-10 max-w-7xl mx-auto px-6 sm:px-8">
        <div className="rounded-2xl bg-white dark:bg-[#0A0A28] border border-border/80 p-8 md:p-12 shadow-xs">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-3">
              <h3 className="text-2xl md:text-3xl font-black text-[#00004E] dark:text-white tracking-tight">
                Built Around Active Recall, Never Homework Shortcuts.
              </h3>
              <p className="text-sm md:text-base text-[#3A4363] dark:text-[#A3A8C2] leading-relaxed max-w-2xl">
                UniStudy guides comprehension through step-by-step Socratic hints, slide-cited breakdowns, and spaced repetition so you master the material before stepping into the examination hall.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-2.5 justify-center">
              <Link
                href="/academic-integrity"
                className="text-center px-5 py-3 rounded-xl font-bold text-xs bg-[#00004E] text-white hover:bg-[#000038] dark:bg-[#D89A06] dark:text-[#00004E] transition-colors cursor-pointer"
              >
                Academic Integrity Policy
              </Link>
              <Link
                href="/how-it-works"
                className="text-center px-5 py-3 rounded-xl font-semibold text-xs bg-muted/50 hover:bg-muted text-foreground border border-border transition-colors cursor-pointer"
              >
                See the 3-Step Workflow
              </Link>
            </div>
          </div>
        </div>
      </section>

      <LiveCmsSections />
      <MarketingFooter />
    </div>
  );
}
