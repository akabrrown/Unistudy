"use client";

import { useState } from "react";
import Link from "next/link";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { CheckCircle, ArrowRight } from "lucide-react";

const WORKSPACE_TABS = [
  {
    id: "slides",
    label: "1. Slide & Lecture Studio",
    heading: "Upload 80-page PDF slide decks and get clear, slide-cited breakdowns",
    summary:
      "Every explanation points back to the exact slide number in your lecturer's deck so you never study unverified definitions before an exam.",
    bullets: [
      ["Slide-by-Slide Explanations", "Switch between simplified intuition, standard exam notes, and worked numerical examples."],
      ["Lecturer Focus Area Matcher", "Paste the exam hints your lecturer gave in class to see which slides and past questions match each topic."],
      ["Printable A4 Cheat Sheets", "Condense an entire 12-week course into a clean, two-column printable formula and definition sheet."],
    ],
    specimen: {
      header: "BCPC 208 · Corporate Finance — Week 6, Slide 18",
      badge: "Cited to Slide 18",
      title: "Net Present Value (NPV) Decision Rule",
      formula: "NPV = ∑ [ CF_t / (1 + r)^t ] − C_0",
      note: "Accept independent projects when NPV > 0. If projects are mutually exclusive, select the alternative with the highest positive NPV even if a smaller project has a higher IRR.",
      footerLeft: "Matched in 2021, 2022, 2024 End-of-Semester Papers",
      footerRight: "14 Flashcards Generated",
    },
  },
  {
    id: "exams",
    label: "2. Past Paper Simulator",
    heading: "Practice real UPSA past questions under exam clock conditions",
    summary:
      "Attempt Section A (MCQs) and Section B (Theory & Calculations) with sub-part grading for (a), (b), (i), and (ii).",
    bullets: [
      ["Official Past Paper Archive", "Search Level 100 to 400 past examination papers by course code, academic year, and semester."],
      ["Sub-Part Rubric Marking", "Get mark allocations for each sub-question plus a complete worked solution for any question you leave blank."],
      ["Targeted Weakness Drills", "Topics where you score below 65% are automatically queued into 5-minute revision drills."],
    ],
    specimen: {
      header: "PDBA 111 · Principles of Marketing — First Semester Exam",
      badge: "120:00 Timed Trial",
      title: "Question 3(a) · Product Life Cycle Stages (12 Marks)",
      formula: "Your Score: 10.5 / 12 Marks · Grade A",
      note: "Examiner Feedback: Strong distinction between Growth and Maturity pricing strategies. To earn the final 1.5 marks in part (ii), state a concrete Ghanaian FMCG example when discussing market saturation.",
      footerLeft: "Model Answer Included for Part 3(b)",
      footerRight: "Saved to Revision History",
    },
  },
  {
    id: "math",
    label: "3. Math, Graph & Note Scanner",
    heading: "Solve symbolic calculus, matrix algebra, and plot WASSCE/University graphs",
    summary:
      "Snap a photo of handwritten board notes or type equations directly to get verified symbolic derivations and millimeter-grid coordinate plots.",
    bullets: [
      ["Symbolic Calculus & Linear Algebra", "Derivatives, definite integrals, determinants, eigenvalues, and simultaneous equations."],
      ["Interactive Coordinate Graph Sheet", "Plot multiple quadratic, trigonometric, or linear functions with roots and intersection points labeled."],
      ["Handwritten Note Digitizer", "Convert notebook photos and whiteboard derivations into clean, editable LaTeX and Markdown notes."],
    ],
    specimen: {
      header: "Quantitative Methods · Symbolic Solver & Graph Sheet",
      badge: "Exact Symbolic Verify",
      title: "Simultaneous Equilibrium & Derivative Check",
      formula: "f(x) = x³ − 6x² + 9x + 2  ⇒  f'(x) = 3(x − 1)(x − 3)",
      note: "Stationary points verified at (1, 6) [Local Maximum] and (3, 2) [Local Minimum]. Point of inflection confirmed at f''(x) = 0 ⇒ x = 2.",
      footerLeft: "Plotted on 2mm Coordinate Grid",
      footerRight: "LaTeX Ready to Copy",
    },
  },
  {
    id: "essay",
    label: "4. Essay & Law Rubric Grader",
    heading: "Draft stronger argumentative, law, and policy essays before submission",
    summary:
      "Check your thesis clarity, statutory/textual evidence, sentence density, and argument structure against university marking rubrics.",
    bullets: [
      ["4-Pillar University Rubric", "Scored across Thesis & Argument (25%), Evidence & Citations (25%), Structure (25%), and Clarity (25%)."],
      ["Sentence X-Ray Highlighter", "Highlights overly dense sentences (>35 words) and under-developed paragraphs right inside your draft."],
      ["Side-by-Side First-Class Exemplar", "Compare your draft paragraph-by-paragraph against a 95%+ honors rewrite on your exact topic."],
    ],
    specimen: {
      header: "Commercial Law & Policy · Essay Rubric Evaluation",
      badge: "84 / 100 · First Class",
      title: "Thesis: Strict Liability in Autonomous Transport Collisions",
      formula: "Thesis: 22/25 · Evidence: 21/25 · Structure: 20/25 · Clarity: 21/25",
      note: "Strength: Clear contrast between traditional tort negligence and statutory product liability. Revision Tip: Expand Paragraph 3 to address comparative-fault carve-outs when third-party tampering occurs.",
      footerLeft: "0 Dense Sentences Flagged",
      footerRight: "Side-by-Side Diff Available",
    },
  },
];

export default function FeaturesPage() {
  const [activeTab, setActiveTab] = useState(0);
  const current = WORKSPACE_TABS[activeTab];

  return (
    <div className="min-h-screen bg-[#F8F9FD] dark:bg-[#040416] transition-colors" style={{ fontFamily: "Inter, sans-serif" }}>
      <MarketingNavbar />
      <main className="max-w-7xl mx-auto px-6 sm:px-8 py-16 md:py-24 space-y-20">
        {/* Editorial Page Header */}
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-bold tracking-widest uppercase text-[#D89A06] border-l-2 border-[#D89A06] pl-3">
            Academic Workspace Capabilities
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-[#00004E] dark:text-white tracking-tight leading-tight">
            Purpose-Built Tools for Lecture Slides, Past Papers, and Quantitative Exams.
          </h1>
          <p className="text-lg text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed">
            Explore how each workspace tool connects your course slides to real examination questions without generic chatbot guesswork.
          </p>
        </div>

        {/* Interactive 4-Workspace Specimen Switcher */}
        <section className="bg-white dark:bg-[#0A0A28] rounded-2xl border border-border shadow-sm p-6 md:p-10 space-y-8">
          <div className="flex gap-2.5 flex-wrap border-b border-border pb-5">
            {WORKSPACE_TABS.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                  activeTab === i
                    ? "bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E]"
                    : "bg-[#F8F9FD] dark:bg-white/5 text-[#00004E] dark:text-[#A3A8C2] hover:bg-[#FEF8E7] dark:hover:bg-white/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-12 gap-10 items-start">
            {/* Left Explanation Column */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-[#00004E] dark:text-white tracking-tight">
                  {current.heading}
                </h2>
                <p className="text-sm text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed">
                  {current.summary}
                </p>
              </div>

              <div className="space-y-4">
                {current.bullets.map(([title, desc]) => (
                  <div key={title} className="flex gap-3.5">
                    <CheckCircle className="w-4 h-4 text-[#D89A06] shrink-0 mt-1" />
                    <div>
                      <p className="text-sm font-bold text-[#00004E] dark:text-white">{title}</p>
                      <p className="text-xs sm:text-sm text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] px-5 py-2.5 rounded-xl text-xs font-bold hover:opacity-95 transition-opacity"
                >
                  <span>Open This Tool in Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Right Authentic Specimen Card (Replaces Empty 320px Icon Box) */}
            <div className="lg:col-span-6 rounded-2xl border-2 border-[#00004E]/15 dark:border-[#D89A06]/35 bg-[#F8F9FD] dark:bg-[#040416] overflow-hidden shadow-md">
              <div className="bg-[#00004E] text-white px-5 py-3.5 flex items-center justify-between border-b border-[#D89A06]/40">
                <span className="text-xs font-mono font-semibold text-white/90 truncate">
                  {current.specimen.header}
                </span>
                <span className="text-[11px] font-bold bg-[#D89A06] text-[#00004E] px-2.5 py-0.5 rounded-md shrink-0">
                  {current.specimen.badge}
                </span>
              </div>

              <div className="p-6 space-y-4">
                <h3 className="text-base font-bold text-[#00004E] dark:text-white">
                  {current.specimen.title}
                </h3>

                <div className="p-3.5 rounded-xl bg-white dark:bg-[#0A0A28] border border-border font-mono text-xs text-[#00004E] dark:text-[#D89A06] font-semibold">
                  {current.specimen.formula}
                </div>

                <div className="p-4 rounded-xl bg-[#FEF8E7]/80 dark:bg-[#00004E]/40 border-l-4 border-l-[#D89A06] text-xs text-[#2A314E] dark:text-white/90 leading-relaxed">
                  {current.specimen.note}
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>{current.specimen.footerLeft}</span>
                  <span className="font-semibold text-[#00004E] dark:text-[#D89A06]">{current.specimen.footerRight}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Visual Study Artifact Tiles (Replaces Text-Heavy 6-Row Specification Table) */}
        <section className="grid md:grid-cols-3 gap-6">
          {/* Artifact 1: SM-2 Flashcard Stack */}
          <div className="rounded-2xl border border-border bg-white dark:bg-[#0A0A28] p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#00004E] dark:text-[#D89A06]">SM-2 Flashcards</span>
              <span className="font-mono text-muted-foreground">Active Recall</span>
            </div>
            <div className="rounded-xl border-2 border-[#D89A06]/40 bg-[#FEF8E7]/50 dark:bg-white/5 p-4 space-y-2">
              <div className="text-[10px] font-mono uppercase text-[#D89A06] font-bold">BCPC 208 · Card 12</div>
              <div className="text-xs font-bold text-[#00004E] dark:text-white">
                When does IRR conflict with NPV on mutually exclusive projects?
              </div>
              <div className="pt-2 flex gap-1.5 text-[10px] font-bold">
                <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600">Again (1d)</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">Good (4d)</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">Easy (9d)</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Auto-generated from your slides and cached offline.
            </p>
          </div>

          {/* Artifact 2: 2mm Coordinate Graph Sheet */}
          <div className="rounded-2xl border border-border bg-white dark:bg-[#0A0A28] p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#00004E] dark:text-[#D89A06]">2mm Graph Sheet</span>
              <span className="font-mono text-muted-foreground">Multi-Curve Plotter</span>
            </div>
            <div className="rounded-xl border border-border bg-[#F8F9FD] dark:bg-[#040416] p-4 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">y₁ = x² − 4x + 3</span>
                <span className="text-sky-600 dark:text-sky-400 font-bold">y₂ = 2x − 2</span>
              </div>
              <div className="h-14 rounded-lg border border-dashed border-[#D89A06]/40 flex items-center justify-around px-3 text-[10px] font-mono text-[#00004E] dark:text-white bg-white dark:bg-[#0A0A28]">
                <span>Root: (1, 0)</span>
                <span>•</span>
                <span>Vertex: (2, −1)</span>
                <span>•</span>
                <span>Root: (3, 0)</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Plots roots, intersections, and coordinate transformations.
            </p>
          </div>

          {/* Artifact 3: Printable A4 Cheat Sheet */}
          <div className="rounded-2xl border border-border bg-white dark:bg-[#0A0A28] p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#00004E] dark:text-[#D89A06]">A4 Revision Sheet</span>
              <span className="font-mono text-muted-foreground">1-Click Print</span>
            </div>
            <div className="rounded-xl border border-border bg-[#F8F9FD] dark:bg-[#040416] p-4 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono border-b border-border pb-1">
                <span className="font-bold text-[#00004E] dark:text-white">WEEK 1–12 SUMMARY</span>
                <span className="text-[#D89A06] font-bold">A4 PDF</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-muted-foreground pt-1">
                <div className="p-1.5 rounded bg-white dark:bg-[#0A0A28] border border-border">18 Core Formulas</div>
                <div className="p-1.5 rounded bg-white dark:bg-[#0A0A28] border border-border">24 Key Definitions</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Condenses 80-slide decks into a two-column exam sheet.
            </p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
