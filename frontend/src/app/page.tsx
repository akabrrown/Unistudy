import Link from 'next/link'
import { MarketingNavbar } from '@/components/layout/MarketingNavbar'
import { MarketingFooter } from '@/components/layout/MarketingFooter'
import {
  ArrowRight,
  BookOpen,
  Layers,
  Award,
  Target,
  Calculator,
  CheckCircle2,
  ShieldCheck,
  GraduationCap,
  DownloadCloud,
  FileText,
  Star,
  Brain,
  Zap,
} from "lucide-react"

export const dynamic = 'force-static';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FD] dark:bg-[#040416] text-[#00004E] dark:text-white transition-colors selection:bg-[#D89A06] selection:text-[#00004E]" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Navbar */}
      <MarketingNavbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 md:pt-20 pb-16 md:pb-24 border-b border-[#D89A06]/20 dark:border-white/10">
        {/* Ambient UPSA Gold & Navy Light-Bending Orbs */}
        <div className="absolute top-0 right-1/4 w-[550px] h-[550px] bg-gradient-to-br from-[#FEF8E7] to-[#D89A06]/15 dark:from-[#D89A06]/10 dark:to-transparent rounded-full blur-[130px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-0 w-[450px] h-[450px] bg-gradient-to-tr from-[#00004E]/5 to-transparent dark:from-[#00004E]/30 rounded-full blur-[110px] pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Hero Narrative */}
            <div className="lg:col-span-7 space-y-6">
              {/* Collegiate Seal Pill */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#FEF8E7] dark:bg-[#00004E] border-2 border-[#D89A06] shadow-xs">
                <GraduationCap className="w-4 h-4 text-[#D89A06] shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#00004E] dark:text-[#D89A06]">
                  UPSA AI Academic Excellence Suite
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#D89A06] animate-pulse" />
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[62px] font-black leading-[1.08] tracking-tight text-[#00004E] dark:text-white">
                Master Your Modules. <br />
                <span className="relative inline-block bg-gradient-to-r from-[#D89A06] via-[#E8B028] to-[#B88205] bg-clip-text text-transparent">
                  Excel at UPSA.
                  <svg className="absolute -bottom-2 left-0 w-full h-3 text-[#D89A06]/40" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M0 15 Q 50 0 100 15" stroke="currentColor" strokeWidth="4" fill="none" />
                  </svg>
                </span>
              </h1>

              {/* Subheading with High Light-Theme Contrast */}
              <p className="text-lg md:text-xl text-[#3A4363] dark:text-[#A3A8C2] leading-relaxed max-w-xl font-normal">
                Ingest your UPSA lecture slides, syllabus topics, and past exam archives. Get instant slide explanations, formula breakdowns, step-by-step math solver, and AI-graded mock attempts tailored to your degree.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2.5 bg-[#00004E] hover:bg-[#000038] text-white border-2 border-[#D89A06] px-7 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 shadow-[0_10px_30px_rgba(0,0,78,0.22)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                >
                  <span>Start Studying for Free</span>
                  <ArrowRight className="w-4 h-4 text-[#D89A06]" />
                </Link>

                <Link
                  href="/features"
                  className="inline-flex items-center justify-center gap-2 bg-[#FEF8E7] hover:bg-[#FDF2D0] dark:bg-white/5 dark:hover:bg-white/10 text-[#00004E] dark:text-white border border-[#D89A06]/50 dark:border-white/15 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer"
                >
                  <span>Explore Academic Tools</span>
                </Link>
              </div>

              {/* Trust Micro-Copy */}
              <div className="pt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-[#4B526B] dark:text-[#A3A8C2]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#D89A06]" />
                  Direct Moodle &amp; Portal Sync
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#D89A06]" />
                  Zero Hallucination Grounding
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#D89A06]" />
                  Free Forever Student Tier
                </span>
              </div>
            </div>

            {/* Right Hero Interactive Preview Showcase */}
            <div className="lg:col-span-5 relative">
              {/* Outer Golden Glow Rim */}
              <div className="relative rounded-2xl p-1 bg-gradient-to-b from-[#D89A06] via-[#00004E]/20 to-[#00004E] shadow-[0_20px_50px_rgba(0,0,78,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
                <div className="rounded-[14px] bg-white dark:bg-[#0A0A28] border border-[#D89A06]/30 overflow-hidden">
                  
                  {/* Mock Window Top Bar in UPSA Navy */}
                  <div className="bg-[#00004E] px-4 py-3 flex items-center justify-between text-white border-b border-[#D89A06]/40">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full bg-[#D89A06]" />
                      <div className="w-3 h-3 rounded-full bg-white/30" />
                      <div className="w-3 h-3 rounded-full bg-white/20" />
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#D89A06] ml-2">
                        UPSA · BCPC 208
                      </span>
                    </div>
                    <span className="text-[10px] bg-[#D89A06] text-[#00004E] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Verified
                    </span>
                  </div>

                  {/* Mock Deck Body */}
                  <div className="p-5 space-y-4">
                    {/* Course Title Strip */}
                    <div className="flex items-start justify-between gap-3 border-b border-[#D89A06]/20 pb-3">
                      <div>
                        <div className="text-xs font-mono uppercase text-[#D89A06] font-bold">
                          Lecture 04 · Slide 14 of 42
                        </div>
                        <h2 className="text-sm font-bold text-[#00004E] dark:text-white mt-0.5">
                          Working Capital &amp; Cash Conversion Cycle
                        </h2>
                      </div>
                      <span className="shrink-0 p-1.5 rounded-lg bg-[#FEF8E7] dark:bg-white/10 text-[#00004E] dark:text-[#D89A06] border border-[#D89A06]/30">
                        <Award className="w-4 h-4" />
                      </span>
                    </div>

                    {/* Active Recall Key Takeaway Box with UPSA Gold Accent */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#FEF8E7] to-white dark:from-[#00004E]/40 dark:to-white/5 border-l-4 border-l-[#D89A06] border border-[#D89A06]/30">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#00004E] dark:text-[#D89A06] uppercase tracking-wider mb-1">
                        <GraduationCap className="w-3.5 h-3.5 text-[#D89A06]" />
                        Key Exam Takeaway
                      </div>
                      <p className="text-xs text-[#2A314E] dark:text-white/90 leading-relaxed font-mono">
                        CCC = Days Inventory Outstanding + Days Sales Outstanding - Days Payables Outstanding.
                      </p>
                    </div>

                    {/* 4 Interactive Study Feature Pills */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2.5 rounded-lg bg-[#00004E] text-white flex items-center gap-2 shadow-xs">
                        <Layers className="w-4 h-4 text-[#D89A06] shrink-0" />
                        <span className="text-[11px] font-bold">Slide Ingestion</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#FEF8E7] dark:bg-white/5 border border-[#D89A06]/40 text-[#00004E] dark:text-[#D89A06] flex items-center gap-2">
                        <Target className="w-4 h-4 text-[#D89A06] shrink-0" />
                        <span className="text-[11px] font-bold">Exam Areas</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#FEF8E7] dark:bg-white/5 border border-[#D89A06]/40 text-[#00004E] dark:text-[#D89A06] flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-[#D89A06] shrink-0" />
                        <span className="text-[11px] font-bold">Math Solver</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#00004E] text-white flex items-center gap-2 shadow-xs">
                        <FileText className="w-4 h-4 text-[#D89A06] shrink-0" />
                        <span className="text-[11px] font-bold">Past Paper Bank</span>
                      </div>
                    </div>

                    {/* Bottom Status Ribbon */}
                    <div className="pt-2 flex items-center justify-between text-xs text-[#5A6484] dark:text-[#A3A8C2] border-t border-[#D89A06]/20">
                      <span className="flex items-center gap-1.5 font-semibold text-[#00004E] dark:text-white">
                        <ShieldCheck className="w-4 h-4 text-[#D89A06]" />
                        96% Mastery Confidence
                      </span>
                      <span className="text-[#D89A06] font-mono font-bold">UPSA Spring 2026</span>
                    </div>

                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4 Academic Pillars (Bento Grid) with Rich Gold & Navy Card Styling */}
      <section className="py-20 md:py-28 max-w-7xl mx-auto px-6 sm:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FEF8E7] dark:bg-[#00004E] border border-[#D89A06] text-[#00004E] dark:text-[#D89A06] text-xs font-bold uppercase tracking-wider">
            <Star className="w-3.5 h-3.5 fill-[#D89A06] text-[#D89A06]" />
            Purpose-Built For University Students
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-[#00004E] dark:text-white">
            Everything You Need to Finish at the Top of Your Class
          </h2>
          <p className="text-base md:text-lg text-[#4B526B] dark:text-[#A3A8C2]">
            Generic chatbots hallucinate. UniStudy AI is anchored directly to your lecturer&apos;s exact slides, formulas, and department marking schemes.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Slide Decks */}
          <div className="rounded-2xl border-2 border-[#D89A06]/30 bg-white dark:bg-[#0A0A28] p-6 shadow-sm hover:shadow-md hover:border-[#D89A06] transition-all duration-200 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#00004E] text-[#D89A06] flex items-center justify-center border border-[#D89A06]/40 group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#00004E] dark:text-white">
                Interactive Slide Ingestion
              </h3>
              <p className="text-sm text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed">
                Upload 80+ slide PDF decks. Review with visual slide thumbnails, instant section summaries, and active recall Q&amp;A.
              </p>
            </div>
            <div className="pt-6 border-t border-[#D89A06]/20 mt-6">
              <span className="text-xs font-bold text-[#D89A06] uppercase tracking-wider flex items-center gap-1">
                Visual Decks <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>

          {/* Card 2: Exam Areas */}
          <div className="rounded-2xl border-2 border-[#D89A06]/30 bg-white dark:bg-[#0A0A28] p-6 shadow-sm hover:shadow-md hover:border-[#D89A06] transition-all duration-200 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#FEF8E7] dark:bg-[#00004E] text-[#00004E] dark:text-[#D89A06] flex items-center justify-center border-2 border-[#D89A06] group-hover:scale-105 transition-transform">
                <Target className="w-6 h-6 text-[#D89A06]" />
              </div>
              <h3 className="text-lg font-bold text-[#00004E] dark:text-white">
                Exam Areas of Concentration
              </h3>
              <p className="text-sm text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed">
                Paste lecturer exam hints or syllabus chapters. Our AI correlates them against all past papers to pinpoint high-yield exam topics.
              </p>
            </div>
            <div className="pt-6 border-t border-[#D89A06]/20 mt-6">
              <span className="text-xs font-bold text-[#00004E] dark:text-[#D89A06] uppercase tracking-wider flex items-center gap-1">
                Targeted Revision <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>

          {/* Card 3: Past Papers */}
          <div className="rounded-2xl border-2 border-[#D89A06]/30 bg-white dark:bg-[#0A0A28] p-6 shadow-sm hover:shadow-md hover:border-[#D89A06] transition-all duration-200 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#00004E] text-[#D89A06] flex items-center justify-center border border-[#D89A06]/40 group-hover:scale-105 transition-transform">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#00004E] dark:text-white">
                Real UPSA Past Papers
              </h3>
              <p className="text-sm text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed">
                Take timed simulated exams. Receive instant grading, rubrics, mark breakdowns, and weakness drills on tricky questions.
              </p>
            </div>
            <div className="pt-6 border-t border-[#D89A06]/20 mt-6">
              <span className="text-xs font-bold text-[#D89A06] uppercase tracking-wider flex items-center gap-1">
                Simulated Exams <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>

          {/* Card 4: Math & STEM */}
          <div className="rounded-2xl border-2 border-[#D89A06]/30 bg-white dark:bg-[#0A0A28] p-6 shadow-sm hover:shadow-md hover:border-[#D89A06] transition-all duration-200 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-[#FEF8E7] dark:bg-[#00004E] text-[#00004E] dark:text-[#D89A06] flex items-center justify-center border-2 border-[#D89A06] group-hover:scale-105 transition-transform">
                <Calculator className="w-6 h-6 text-[#D89A06]" />
              </div>
              <h3 className="text-lg font-bold text-[#00004E] dark:text-white">
                STEM Math &amp; Graph Solver
              </h3>
              <p className="text-sm text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed">
                Step-by-step calculus, economics, financial math, and curve plotting powered by MathJS and KaTeX formula rendering.
              </p>
            </div>
            <div className="pt-6 border-t border-[#D89A06]/20 mt-6">
              <span className="text-xs font-bold text-[#00004E] dark:text-[#D89A06] uppercase tracking-wider flex items-center gap-1">
                Math Toolkit <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured UPSA Showcase Card (The "Why We Built This" Highlight) */}
      <section className="py-12 max-w-7xl mx-auto px-6 sm:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-[#FEF8E7] via-white to-[#F0F3F9] dark:from-[#00004E]/50 dark:via-[#0A0A28] dark:to-[#040416] border-2 border-[#D89A06] p-8 md:p-14 shadow-lg">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D89A06] bg-[#00004E] px-3 py-1 rounded-full inline-block">
                Honor-Code &amp; Academic Integrity
              </span>
              <h3 className="text-2xl md:text-4xl font-extrabold text-[#00004E] dark:text-white tracking-tight">
                Built Around Active Recall, Never Homework Cheating.
              </h3>
              <p className="text-sm md:text-base text-[#3A4363] dark:text-[#A3A8C2] leading-relaxed">
                UniStudy AI enforces structured pedagogy: step-by-step Socratic hints, spaced repetition flashcards, and concept testing so you genuinely comprehend the material before you step into the examination hall.
              </p>
            </div>
            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 justify-center">
              <Link
                href="/academic-integrity"
                className="text-center px-6 py-3.5 rounded-xl font-bold text-xs bg-[#00004E] text-white hover:bg-[#000038] border border-[#D89A06] transition-all cursor-pointer"
              >
                Read Academic Integrity Policy
              </Link>
              <Link
                href="/how-it-works"
                className="text-center px-6 py-3.5 rounded-xl font-semibold text-xs bg-white dark:bg-white/10 text-[#00004E] dark:text-white border border-[#D89A06]/40 hover:bg-[#FEF8E7] transition-all cursor-pointer"
              >
                Learn How The System Works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <MarketingFooter />
    </div>
  )
}
