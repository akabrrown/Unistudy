import Link from 'next/link'
import { MarketingNavbar } from '@/components/layout/MarketingNavbar'
import { MarketingFooter } from '@/components/layout/MarketingFooter'
import { LiveCmsSections } from '@/components/landing/LiveCmsSections'
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

export const revalidate = 60; // Incremental Static Regeneration at the Edge

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
              {/* Collegiate Eyebrow */}
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#00004E] dark:text-[#D89A06] border-l-2 border-[#D89A06] pl-3">
                <span>University of Professional Studies, Accra · Study Workspace</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-[60px] font-black leading-[1.06] tracking-tight text-[#00004E] dark:text-white">
                Master Your Coursework. <br />
                <span className="text-[#D89A06]">
                  Walk Into Finals Ready.
                </span>
              </h1>

              {/* Subheading with High Light-Theme Contrast */}
              <p className="text-lg md:text-xl text-[#3A4363] dark:text-[#A3A8C2] leading-relaxed max-w-xl font-normal">
                Upload your lecturer&apos;s slides, course outlines, and past question papers. Get clear slide-by-slide explanations, timed mock exams with full marking schemes, and step-by-step accounting and math solutions.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2.5 bg-[#00004E] hover:bg-[#000038] text-white border-2 border-[#D89A06] px-7 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 shadow-sm cursor-pointer"
                >
                  <span>Open Student Workspace</span>
                  <ArrowRight className="w-4 h-4 text-[#D89A06]" />
                </Link>

                <Link
                  href="/features"
                  className="inline-flex items-center justify-center gap-2 bg-white hover:bg-[#FEF8E7] dark:bg-white/5 dark:hover:bg-white/10 text-[#00004E] dark:text-white border border-border px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer"
                >
                  <span>See How It Works</span>
                </Link>
              </div>

              {/* Trust Micro-Copy */}
              <div className="pt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-[#4B526B] dark:text-[#A3A8C2]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#D89A06]" />
                  Every Answer Cited to Your Slides
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#D89A06]" />
                  Level 100–400 Past Question Archive
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#D89A06]" />
                  20 Free Study Credits on Sign-Up
                </span>
              </div>
            </div>

            {/* Right Hero Authentic Study Workspace Specimen */}
            <div className="lg:col-span-5 relative">
              <div className="rounded-2xl bg-white dark:bg-[#0A0A28] border-2 border-[#00004E]/15 dark:border-[#D89A06]/35 shadow-xl overflow-hidden">
                {/* Authentic Course Header Bar (No Fake macOS Dots) */}
                <div className="bg-[#00004E] px-5 py-3.5 flex items-center justify-between text-white border-b border-[#D89A06]/40">
                  <div>
                    <span className="text-[11px] font-mono font-bold text-[#D89A06] block">
                      BCPC 208 · CORPORATE FINANCE
                    </span>
                    <span className="text-xs font-semibold text-white/90">
                      Week 4 Lecture Deck · Slide 14 of 42
                    </span>
                  </div>
                  <span className="text-[11px] bg-white/10 text-white font-medium px-2.5 py-1 rounded-md border border-white/15">
                    Cited to Slide 14
                  </span>
                </div>

                {/* Live Slide + Worked Exam Question Specimen */}
                <div className="p-5 space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-[#00004E] dark:text-white">
                      Working Capital &amp; Cash Conversion Cycle (CCC)
                    </h2>
                    <p className="text-xs text-[#4B526B] dark:text-[#A3A8C2] mt-1 leading-relaxed">
                      Measures the time (in days) it takes for a company to convert its investments in inventory and other resources into cash flows from sales.
                    </p>
                  </div>

                  {/* Worked Formula Card */}
                  <div className="p-3.5 rounded-xl bg-[#F8F9FD] dark:bg-white/5 border border-border space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#00004E] dark:text-[#D89A06]">
                      <span>Core Formula (Slide 14)</span>
                      <span className="font-mono">2023 Final Exam · Q2(b)</span>
                    </div>
                    <p className="text-xs font-mono text-[#00004E] dark:text-white bg-white dark:bg-[#040416] p-2.5 rounded-lg border border-border/80">
                      CCC = DIO (45d) + DSO (38d) − DPO (30d) = 53 Days
                    </p>
                  </div>

                  {/* Linked Past Question Callout */}
                  <div className="p-3.5 rounded-xl bg-[#FEF8E7]/70 dark:bg-[#00004E]/40 border-l-4 border-l-[#D89A06] space-y-1">
                    <div className="text-xs font-bold text-[#00004E] dark:text-[#D89A06]">
                      Examiner&apos;s Marking Note (5 Marks)
                    </div>
                    <p className="text-xs text-[#2A314E] dark:text-white/90 leading-relaxed">
                      A shorter or negative CCC indicates stronger liquidity because supplier credit finances operations before cash is tied up.
                    </p>
                  </div>

                  {/* Bottom Footer Bar */}
                  <div className="pt-2 flex items-center justify-between text-xs text-[#5A6484] dark:text-[#A3A8C2] border-t border-border">
                    <span className="font-medium text-[#00004E] dark:text-white">
                      Matched with 4 past exam papers (2019–2024)
                    </span>
                    <Link href="/signup" className="text-[#00004E] dark:text-[#D89A06] font-bold hover:underline">
                      Practice Q2(b) &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Asymmetric Editorial Study Architecture (Replaces Symmetrical 4-Icon Bento Grid) */}
      <section className="py-20 md:py-24 max-w-7xl mx-auto px-6 sm:px-8">
        <div className="max-w-2xl mb-12 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[#D89A06]">
            Built for UPSA Coursework &amp; Examinations
          </p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[#00004E] dark:text-white">
            Study From Your Lecturer&apos;s Exact Material—Not Generic Web Answers.
          </h2>
          <p className="text-base text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed">
            General chatbots guess when asked about specific university modules. UniStudy reads your uploaded PDF slides and past question papers line by line.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Lead Editorial Showcase (7 columns) */}
          <div className="lg:col-span-7 rounded-2xl border border-border bg-white dark:bg-[#0A0A28] p-6 md:p-8 flex flex-col justify-between space-y-6 shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#00004E] dark:text-[#D89A06]">
                  Slide Studio &amp; Exam Topic Matcher
                </span>
                <span className="text-xs font-mono text-muted-foreground">PDF · PPTX · Handwritten Notes</span>
              </div>
              <h3 className="text-2xl font-bold text-[#00004E] dark:text-white tracking-tight">
                Cross-reference 80-slide lecture decks with past exam questions in seconds
              </h3>
              <p className="text-sm text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed">
                Paste the revision areas your lecturer mentioned in class. UniStudy scans every slide in your course and every past paper in the archive to show you which slides carry the heaviest exam weight—and flags any topic missing from your notes.
              </p>
            </div>

            {/* Concrete Visual Artifact Table Inside Lead Card */}
            <div className="rounded-xl border border-border bg-[#F8F9FD] dark:bg-[#040416] overflow-hidden text-xs">
              <div className="grid grid-cols-12 bg-[#00004E] text-white px-4 py-2.5 font-semibold">
                <div className="col-span-5">Lecturer Revision Topic</div>
                <div className="col-span-4">Matched Lecture Slides</div>
                <div className="col-span-3 text-right">Past Exam Hits</div>
              </div>
              <div className="divide-y divide-border">
                <div className="grid grid-cols-12 px-4 py-2.5 items-center">
                  <div className="col-span-5 font-semibold text-[#00004E] dark:text-white">Capital Budgeting (NPV &amp; IRR)</div>
                  <div className="col-span-4 text-muted-foreground">Week 6 · Slides 8–24</div>
                  <div className="col-span-3 text-right font-mono font-bold text-[#00004E] dark:text-[#D89A06]">6 Papers</div>
                </div>
                <div className="grid grid-cols-12 px-4 py-2.5 items-center">
                  <div className="col-span-5 font-semibold text-[#00004E] dark:text-white">Weighted Average Cost of Capital</div>
                  <div className="col-span-4 text-muted-foreground">Week 8 · Slides 3–19</div>
                  <div className="col-span-3 text-right font-mono font-bold text-[#00004E] dark:text-[#D89A06]">5 Papers</div>
                </div>
                <div className="grid grid-cols-12 px-4 py-2.5 items-center">
                  <div className="col-span-5 font-semibold text-[#00004E] dark:text-white">Dividend Relevance (Gordon Model)</div>
                  <div className="col-span-4 text-muted-foreground">Week 10 · Slides 11–27</div>
                  <div className="col-span-3 text-right font-mono font-bold text-[#00004E] dark:text-[#D89A06]">4 Papers</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                Generates one-page printable A4 revision sheets &amp; SM-2 flashcards
              </span>
              <Link href="/signup" className="text-xs font-bold text-[#00004E] dark:text-[#D89A06] hover:underline inline-flex items-center gap-1">
                Try With Your Slides <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Stacked Column (5 columns) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-6">
            <div className="flex-1 rounded-2xl border border-border bg-white dark:bg-[#0A0A28] p-6 flex flex-col justify-between space-y-4 shadow-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#D89A06]">
                    Timed Examination Simulator
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">Section A &amp; B</span>
                </div>
                <h3 className="text-lg font-bold text-[#00004E] dark:text-white">
                  Real UPSA Past Papers with Sub-Question Grading
                </h3>
                <p className="text-sm text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed">
                  Practice authentic past papers under a 120-minute exam clock. Get part-by-part marking for `(a)`, `(b)`, `(i)`, and `(ii)` alongside complete model answers for any question you skip.
                </p>
              </div>
              <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Includes Accounting, Finance, Management, IT &amp; Law</span>
                <Link href="/signup" className="font-bold text-[#00004E] dark:text-[#D89A06] hover:underline">
                  Browse Papers &rarr;
                </Link>
              </div>
            </div>

            <div className="flex-1 rounded-2xl border border-border bg-[#00004E] text-white p-6 flex flex-col justify-between space-y-4 shadow-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#D89A06]">
                    Quantitative &amp; Graph Solver
                  </span>
                  <span className="text-xs font-mono text-white/70">Calculus · Matrices · Stats</span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  Exact Symbolic Math &amp; Coordinate Graph Sheets
                </h3>
                <p className="text-sm text-white/80 leading-relaxed">
                  Solve derivatives, definite integrals, simultaneous linear systems, and plot multi-curve coordinate graphs on interactive millimeter grid paper—or snap a photo of handwritten math notes.
                </p>
              </div>
              <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs">
                <span className="text-white/70">Verified symbolic steps with KaTeX notation</span>
                <Link href="/signup" className="font-bold text-[#D89A06] hover:underline">
                  Open Solver &rarr;
                </Link>
              </div>
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

      {/* Dynamic Live CMS Sections: Metrics, Testimonials & Knowledgebase FAQs */}
      <LiveCmsSections />

      {/* Footer */}
      <MarketingFooter />
    </div>
  )
}
