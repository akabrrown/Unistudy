import Link from "next/link";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { Upload, Layers, Award, Video, Camera, LineChart, FileText, ArrowRight, CheckCircle2 } from "lucide-react";

export const dynamic = 'force-static';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FD] dark:bg-[#040416] transition-colors" style={{ fontFamily: "Inter, sans-serif" }}>
      <MarketingNavbar />
      <main className="max-w-6xl mx-auto px-6 sm:px-8 py-16 md:py-24 space-y-20">
        {/* Concise Visual Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <p className="text-xs font-bold tracking-widest uppercase text-[#D89A06]">
            3-Step Study Workflow
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-[#00004E] dark:text-white tracking-tight">
            From Lecture Slides to Exam Ready
          </h1>
          <p className="text-base text-[#4B526B] dark:text-[#A3A8C2]">
            Drop in your course materials and practice directly against past exam papers.
          </p>
        </div>

        {/* 3-Step Visual Artifact Pipeline (Replaces 3 Prose Paragraphs) */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Step 1 Visual Card */}
          <div className="p-6 bg-white dark:bg-[#0A0A28] rounded-2xl border border-border hover:border-[#D89A06] transition-all flex flex-col justify-between space-y-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[#00004E] dark:text-[#D89A06]">
                <span className="w-6 h-6 rounded-full bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] flex items-center justify-center font-mono">1</span>
                Drop Course Material
              </span>
              <Upload className="w-4 h-4 text-[#D89A06]" />
            </div>

            {/* Visual Dropzone Specimen */}
            <div className="rounded-xl border-2 border-dashed border-[#D89A06]/40 bg-[#FEF8E7]/40 dark:bg-white/5 p-4 text-center space-y-2">
              <div className="mx-auto w-9 h-9 rounded-lg bg-[#00004E] text-[#D89A06] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-xs font-bold text-[#00004E] dark:text-white">
                BCPC_208_Week_4.pdf
              </div>
              <div className="flex justify-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                <span className="px-2 py-0.5 rounded bg-background border border-border">PDF</span>
                <span className="px-2 py-0.5 rounded bg-background border border-border">PPTX</span>
                <span className="px-2 py-0.5 rounded bg-background border border-border">Photo</span>
              </div>
            </div>

            <p className="text-xs text-[#4B526B] dark:text-[#A3A8C2]">
              Upload lecture decks, notebook photos, or YouTube links.
            </p>
          </div>

          {/* Step 2 Visual Card */}
          <div className="p-6 bg-white dark:bg-[#0A0A28] rounded-2xl border border-border hover:border-[#D89A06] transition-all flex flex-col justify-between space-y-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[#00004E] dark:text-[#D89A06]">
                <span className="w-6 h-6 rounded-full bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] flex items-center justify-center font-mono">2</span>
                Review Cited Breakdowns
              </span>
              <Layers className="w-4 h-4 text-[#D89A06]" />
            </div>

            {/* Visual Slide Citation Specimen */}
            <div className="rounded-xl border border-border bg-[#F8F9FD] dark:bg-[#040416] p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-[#D89A06] font-bold">SLIDE 14 / 42</span>
                <span className="px-1.5 py-0.5 rounded bg-[#00004E] text-white">Cited</span>
              </div>
              <div className="text-xs font-bold text-[#00004E] dark:text-white">
                Cash Conversion Cycle
              </div>
              <div className="text-[11px] font-mono text-[#00004E] dark:text-[#D89A06] bg-white dark:bg-[#0A0A28] px-2.5 py-1.5 rounded border border-border">
                CCC = DIO + DSO − DPO
              </div>
            </div>

            <p className="text-xs text-[#4B526B] dark:text-[#A3A8C2]">
              Every note and formula points to the exact slide number.
            </p>
          </div>

          {/* Step 3 Visual Card */}
          <div className="p-6 bg-white dark:bg-[#0A0A28] rounded-2xl border border-border hover:border-[#D89A06] transition-all flex flex-col justify-between space-y-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[#00004E] dark:text-[#D89A06]">
                <span className="w-6 h-6 rounded-full bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] flex items-center justify-center font-mono">3</span>
                Take Timed Mock Exams
              </span>
              <Award className="w-4 h-4 text-[#D89A06]" />
            </div>

            {/* Visual Grading Score Specimen */}
            <div className="rounded-xl border border-border bg-[#F8F9FD] dark:bg-[#040416] p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-muted-foreground">2023 FINAL EXAM</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">88% · Grade A</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-[88%] bg-[#D89A06] rounded-full" />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#00004E] dark:text-white font-medium">
                <span>Q1–Q4 Graded</span>
                <span className="text-[#D89A06] font-bold">Model Answers Ready</span>
              </div>
            </div>

            <p className="text-xs text-[#4B526B] dark:text-[#A3A8C2]">
              Instant part-by-part grading for `(a)`, `(b)`, `(i)`, and `(ii)`.
            </p>
          </div>
        </div>

        {/* Visual Input & Study Tools Strip (Replaces 5 Verbose Bottom Cards) */}
        <div className="rounded-2xl border border-border bg-white dark:bg-[#0A0A28] p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <h2 className="text-xl font-bold text-[#00004E] dark:text-white">
              Everything Connected in One Workspace
            </h2>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] px-4 py-2 rounded-xl"
            >
              <span>Start Free Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Video, title: "YouTube Lectures", tag: "Transcript + Timestamp Notes" },
              { icon: Camera, title: "Handwritten OCR", tag: "Photo to LaTeX & Markdown" },
              { icon: FileText, title: "Essay Rubric Grader", tag: "4-Pillar Score + 100% Exemplar" },
              { icon: LineChart, title: "Weakness Radar", tag: "Flags Topics Below 70%" },
            ].map(({ icon: Icon, title, tag }) => (
              <div key={title} className="p-4 rounded-xl bg-[#F8F9FD] dark:bg-white/5 border border-border/80 space-y-2">
                <div className="w-9 h-9 rounded-lg bg-[#00004E] text-[#D89A06] flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-sm font-bold text-[#00004E] dark:text-white">{title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#D89A06] shrink-0" />
                  <span className="truncate">{tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
