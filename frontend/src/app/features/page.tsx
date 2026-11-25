"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { SPRING_SNAPPY, useAppReducedMotion } from "@/lib/motion";
import {
  CheckCircle2,
  ArrowRight,
  Layers,
  Award,
  Calculator,
  FileText,
  Clock,
  RotateCcw,
  Eye,
} from "lucide-react";

const WORKSPACE_TABS = [
  {
    id: "slides",
    label: "Slide Studio",
    icon: Layers,
    heading: "Upload 80-page PDF slide decks and get clear, slide-cited breakdowns",
    summary:
      "Every explanation points back to the exact slide number in your lecturer's deck so you never study unverified definitions before an exam.",
    bullets: [
      ["Slide-by-Slide Explanations", "Switch between simplified intuition, standard exam notes, and worked numerical examples."],
      ["Lecturer Focus Area Matcher", "Paste the exam hints your lecturer gave in class to see which slides and past questions match each topic."],
      ["Printable A4 Cheat Sheets", "Condense an entire 12-week course into a clean, two-column printable formula and definition sheet."],
    ],
    href: "/signup",
  },
  {
    id: "exams",
    label: "Past Paper Simulator",
    icon: Award,
    heading: "Practice real university past questions under timed exam conditions",
    summary:
      "Attempt Section A (MCQs) and Section B (Theory & Calculations) with sub-part grading for (a), (b), (i), and (ii).",
    bullets: [
      ["Official Past Paper Archive", "Search Level 100 to 400 past examination papers by course code, academic year, and semester."],
      ["Sub-Part Rubric Marking", "Get mark allocations for each sub-question plus a complete worked solution for any question you leave blank."],
      ["Targeted Weakness Drills", "Topics where you score below 65% are automatically queued into 5-minute interactive revision drills."],
    ],
    href: "/signup",
  },
  {
    id: "math",
    label: "2mm Graph & CAS",
    icon: Calculator,
    heading: "Solve symbolic calculus, matrix algebra, and plot 2mm coordinate graphs",
    summary:
      "Snap a photo of handwritten board notes or enter equations directly to inspect verified symbolic derivations and millimeter-grid coordinate plots.",
    bullets: [
      ["Symbolic Calculus & Linear Algebra", "Derivatives, definite integrals, determinants, eigenvalues, and simultaneous equations."],
      ["Interactive Coordinate Graph Sheet", "Plot multiple quadratic, trigonometric, or linear functions with roots and intersections labeled."],
      ["Handwritten Note Digitizer", "Convert notebook photos and whiteboard derivations into clean, editable LaTeX and Markdown notes."],
    ],
    href: "/signup",
  },
  {
    id: "essay",
    label: "Essay Rubric X-Ray",
    icon: FileText,
    heading: "Draft stronger argumentative, law, and policy essays before submission",
    summary:
      "Check your thesis clarity, statutory/textual evidence, sentence density, and argument structure against 4-pillar university marking rubrics.",
    bullets: [
      ["4-Pillar University Rubric", "Scored across Thesis & Argument (25%), Evidence & Citations (25%), Structure (25%), and Clarity (25%)."],
      ["Sentence Clarity X-Ray", "Highlights overly dense sentences (>35 words) and under-developed paragraphs right inside your draft."],
      ["Side-by-Side Honors Exemplar", "Compare your draft paragraph-by-paragraph against a 95%+ honors rewrite on your exact topic."],
    ],
    href: "/signup",
  },
] as const;

const GRAPH_POINTS = [
  { id: "r1", label: "Root (1, 0)", cx: 110, cy: 130, desc: "Parabola crosses x-axis: y₁(1) = 1 − 4 + 3 = 0" },
  { id: "v", label: "Vertex (2, −1)", cx: 160, cy: 155, desc: "Global minimum at dy₁/dx = 2x − 4 = 0 ⇒ x = 2" },
  { id: "r2", label: "Root (3, 0)", cx: 210, cy: 130, desc: "Second x-intercept: y₁(3) = 9 − 12 + 3 = 0" },
  { id: "i", label: "Intersection (5, 8)", cx: 270, cy: 35, desc: "Simultaneous solution where x² − 4x + 3 = 2x − 2" },
] as const;

export default function FeaturesPage() {
  const [activeTab, setActiveTab] = useState(0);
  const reducedMotion = useAppReducedMotion();
  const current = WORKSPACE_TABS[activeTab];

  // Interactive Playground states
  const [selectedSlideDepth, setSelectedSlideDepth] = useState<"intuition" | "exam">("exam");
  const [selectedMcq, setSelectedMcq] = useState<string>("B");
  const [secondsLeft, setSecondsLeft] = useState(7184);
  const [selectedPin, setSelectedPin] = useState<string>("v");
  const [xrayActive, setXrayActive] = useState(true);

  // Bottom mini flashcard flip state
  const [cardFlipped, setCardFlipped] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== 1) return;
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 7200)), 1000);
    return () => clearInterval(t);
  }, [activeTab]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(3, "0")}:${String(s).padStart(2, "0")}`;
  };

  const activePinObj = GRAPH_POINTS.find((p) => p.id === selectedPin) || GRAPH_POINTS[1];

  return (
    <div className="min-h-[100dvh] bg-[#F8F9FD] dark:bg-[#040416] transition-colors">
      <MarketingNavbar />
      <main className="max-w-7xl mx-auto px-6 sm:px-8 py-16 md:py-24 space-y-20">
        {/* Header */}
        <div className="max-w-3xl space-y-3.5">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#00004E] dark:text-[#D89A06] border-l-2 border-[#D89A06] pl-3">
            Interactive Workspace Capabilities
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#00004E] dark:text-white tracking-tight leading-tight text-balance">
            Purpose-Built Tools for Slides, Past Papers, and Quantitative Exams.
          </h1>
          <p className="text-base md:text-lg text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed">
            Interact with each live workspace preview below to see how your course slides connect directly to exam preparation.
          </p>
        </div>

        {/* Brilliant-Style Interactive 4-Workspace Playground */}
        <section className="bg-white dark:bg-[#0A0A28] rounded-2xl border border-border/80 shadow-xs p-6 md:p-10 space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-1.5 rounded-xl bg-muted/50 border border-border/60">
            {WORKSPACE_TABS.map((tab, i) => {
              const Icon = tab.icon;
              const isActive = activeTab === i;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(i)}
                  className={`relative px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                    isActive
                      ? "text-white dark:text-[#00004E]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="features-playground-tab"
                      transition={reducedMotion ? { duration: 0 } : SPRING_SNAPPY}
                      className="absolute inset-0 rounded-lg bg-[#00004E] dark:bg-[#D89A06] shadow-2xs"
                    />
                  )}
                  <Icon
                    className={`w-4 h-4 relative z-10 shrink-0 ${
                      isActive ? "text-[#D89A06] dark:text-[#00004E]" : ""
                    }`}
                  />
                  <span className="relative z-10 truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-12 gap-10 items-start">
            {/* Left Explanation Column */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-[#00004E] dark:text-white tracking-tight">
                  {current.heading}
                </h2>
                <p className="text-sm text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed">
                  {current.summary}
                </p>
              </div>

              <div className="space-y-3.5">
                {current.bullets.map(([title, desc]) => (
                  <div key={title} className="flex gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#D89A06] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-[#00004E] dark:text-white">{title}</p>
                      <p className="text-xs text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed mt-0.5">
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-1">
                <Link
                  href={current.href}
                  className="inline-flex items-center gap-2 bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] px-5 py-2.5 rounded-xl text-xs font-bold hover:opacity-95 transition-opacity active:scale-[0.98]"
                >
                  <span>Open in Student Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Right Interactive Visual Canvas */}
            <div className="lg:col-span-7 rounded-2xl border border-border/80 bg-[#F8F9FD] dark:bg-[#040416] overflow-hidden shadow-sm">
              <AnimatePresence mode="wait" initial={false}>
                {activeTab === 0 && (
                  <motion.div
                    key="tab-slides"
                    initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={{ duration: reducedMotion ? 0 : 0.18 }}
                  >
                    <div className="bg-[#00004E] text-white px-5 py-3 flex items-center justify-between">
                      <span className="text-xs font-mono">BCPC 208 · Week 6, Slide 18</span>
                      <div className="inline-flex rounded-md bg-white/10 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSelectedSlideDepth("intuition")}
                          className={`px-2.5 py-0.5 rounded cursor-pointer ${
                            selectedSlideDepth === "intuition" ? "bg-[#D89A06] text-[#00004E] font-bold" : "text-white/80"
                          }`}
                        >
                          Intuition
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSlideDepth("exam")}
                          className={`px-2.5 py-0.5 rounded cursor-pointer ${
                            selectedSlideDepth === "exam" ? "bg-[#D89A06] text-[#00004E] font-bold" : "text-white/80"
                          }`}
                        >
                          Exam Rigor
                        </button>
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-[#00004E] dark:text-white">
                          Net Present Value (NPV) Decision Rule
                        </h3>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#FEF8E7] dark:bg-white/10 text-[#00004E] dark:text-[#D89A06] border border-[#D89A06]/30">
                          [Slide 18]
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white dark:bg-[#0A0A28] border border-border font-mono text-xs text-[#00004E] dark:text-[#D89A06] font-semibold">
                        NPV = ∑ [ CF_t / (1 + r)^t ] − C_0
                      </div>

                      <p className="text-xs text-[#2A314E] dark:text-white/85 leading-relaxed p-4 rounded-xl bg-white dark:bg-[#0A0A28] border-l-2 border-l-[#D89A06] border border-border/70">
                        {selectedSlideDepth === "intuition"
                          ? "Plain Intuition: Discount future cash inflows back into today's Cedis. If total present value exceeds the upfront machine cost (C₀), the project creates net wealth."
                          : "Exam Rule [Slide 18]: Accept independent projects when NPV > 0. For mutually exclusive projects, choose the highest positive NPV even when a smaller project exhibits a higher IRR."}
                      </p>
                    </div>
                  </motion.div>
                )}

                {activeTab === 1 && (
                  <motion.div
                    key="tab-exams"
                    initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={{ duration: reducedMotion ? 0 : 0.18 }}
                  >
                    <div className="bg-[#00004E] text-white px-5 py-3 flex items-center justify-between">
                      <span className="text-xs font-mono">PDBA 204 · Timed Mock Paper</span>
                      <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-[#D89A06] tabular-nums">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTimer(secondsLeft)}
                      </span>
                    </div>

                    <div className="p-6 space-y-4">
                      <p className="text-xs sm:text-sm font-semibold text-[#00004E] dark:text-white">
                        Q4. Which discount rate sets the Net Present Value of a project&apos;s cash flows equal to zero?
                      </p>

                      <div className="space-y-2">
                        {[
                          { id: "A", label: "Accounting Rate of Return (ARR)" },
                          { id: "B", label: "Internal Rate of Return (IRR)" },
                          { id: "C", label: "Profitability Index (PI)" },
                        ].map((opt) => {
                          const picked = selectedMcq === opt.id;
                          const isCorrect = opt.id === "B";
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setSelectedMcq(opt.id)}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                                picked
                                  ? isCorrect
                                    ? "border-emerald-500 bg-emerald-500/10 text-foreground"
                                    : "border-rose-500 bg-rose-500/10 text-foreground"
                                  : "border-border bg-white dark:bg-[#0A0A28] hover:border-[#D89A06]/50"
                              }`}
                            >
                              <span className="flex items-center gap-2.5">
                                <span className="w-6 h-6 rounded-md bg-muted font-mono font-bold flex items-center justify-center text-[11px]">
                                  {opt.id}
                                </span>
                                <span>{opt.label}</span>
                              </span>
                              {picked && (
                                <span className={`font-mono text-[11px] font-bold ${isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}>
                                  {isCorrect ? "Correct · [1/1 Mark]" : "Review Slide 19"}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 2 && (
                  <motion.div
                    key="tab-math"
                    initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={{ duration: reducedMotion ? 0 : 0.18 }}
                  >
                    <div className="bg-[#00004E] text-white px-5 py-3 flex items-center justify-between text-xs font-mono">
                      <span>2mm Coordinate Graph Sheet</span>
                      <span className="text-[#D89A06]">Click any node to inspect</span>
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                        <span className="text-[#00004E] dark:text-[#D89A06] font-bold">y₁ = x² − 4x + 3</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">y₂ = 2x − 2</span>
                      </div>

                      {/* Real Interactive SVG 2mm Coordinate Sheet */}
                      <div className="rounded-xl border border-border bg-white dark:bg-[#070720] p-2 overflow-hidden">
                        <svg viewBox="0 0 340 180" className="w-full h-44">
                          <defs>
                            <pattern id="grid2mm" width="10" height="10" patternUnits="userSpaceOnUse">
                              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.4" className="text-slate-200 dark:text-white/10" />
                            </pattern>
                            <pattern id="grid1cm" width="50" height="50" patternUnits="userSpaceOnUse">
                              <rect width="50" height="50" fill="url(#grid2mm)" />
                              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="0.9" className="text-slate-300 dark:text-white/15" />
                            </pattern>
                          </defs>
                          <rect width="340" height="180" fill="url(#grid1cm)" />
                          {/* Axes */}
                          <line x1="60" y1="10" x2="60" y2="170" stroke="currentColor" strokeWidth="1.2" className="text-slate-500" />
                          <line x1="20" y1="130" x2="320" y2="130" stroke="currentColor" strokeWidth="1.2" className="text-slate-500" />
                          {/* Parabola y1 = x^2 - 4x + 3 */}
                          <path
                            d="M 60 55 Q 160 255 270 35"
                            fill="none"
                            stroke="#D89A06"
                            strokeWidth="2.4"
                          />
                          {/* Line y2 = 2x - 2 */}
                          <line x1="85" y1="155" x2="280" y2="25" stroke="#10B981" strokeWidth="2" strokeDasharray="4 3" />

                          {/* Interactive Nodes */}
                          {GRAPH_POINTS.map((pt) => {
                            const active = pt.id === selectedPin;
                            return (
                              <g
                                key={pt.id}
                                onClick={() => setSelectedPin(pt.id)}
                                className="cursor-pointer"
                              >
                                <circle
                                  cx={pt.cx}
                                  cy={pt.cy}
                                  r={active ? 7 : 5}
                                  fill={active ? "#00004E" : "#D89A06"}
                                  stroke="#FFFFFF"
                                  strokeWidth="2"
                                />
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      <div className="p-3 rounded-xl bg-white dark:bg-[#0A0A28] border border-border/80 flex items-center justify-between gap-3 text-xs">
                        <div>
                          <span className="font-mono font-bold text-[#00004E] dark:text-[#D89A06]">
                            {activePinObj.label}:
                          </span>{" "}
                          <span className="text-muted-foreground">{activePinObj.desc}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 3 && (
                  <motion.div
                    key="tab-essay"
                    initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={{ duration: reducedMotion ? 0 : 0.18 }}
                  >
                    <div className="bg-[#00004E] text-white px-5 py-3 flex items-center justify-between">
                      <span className="text-xs font-mono">Commercial Law · Rubric X-Ray</span>
                      <button
                        type="button"
                        onClick={() => setXrayActive((v) => !v)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-[#D89A06] text-[#00004E] px-2.5 py-0.5 rounded cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        {xrayActive ? "Show Honors Rewrite" : "Show Draft X-Ray"}
                      </button>
                    </div>

                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
                        {[
                          ["Thesis", "22/25"],
                          ["Evidence", "21/25"],
                          ["Structure", "20/25"],
                          ["Clarity", "21/25"],
                        ].map(([k, v]) => (
                          <div key={k} className="p-2 rounded-lg bg-white dark:bg-[#0A0A28] border border-border/70">
                            <div className="text-[10px] text-muted-foreground">{k}</div>
                            <div className="font-bold text-[#00004E] dark:text-[#D89A06]">{v}</div>
                          </div>
                        ))}
                      </div>

                      <div className="p-4 rounded-xl bg-white dark:bg-[#0A0A28] border border-border text-xs leading-relaxed">
                        {xrayActive ? (
                          <p className="text-foreground">
                            <span className="bg-amber-500/20 border-b-2 border-amber-500 px-1 rounded">
                              Draft (42 words — Dense Sentence Flagged): Whilst traditional negligence principles under Donoghue v Stevenson require proof of breach of duty of care, autonomous vehicle software malfunctions complicate causation whenever over-the-air updates alter operational logic without driver intervention.
                            </span>
                          </p>
                        ) : (
                          <p className="text-foreground">
                            <span className="bg-emerald-500/15 border-b-2 border-emerald-500 px-1 rounded">
                              First-Class Rewrite (Crisp 2-Sentence Argument): Traditional negligence under Donoghue v Stevenson requires proving a direct breach of duty. Over-the-air autonomous software updates shift causation from the driver toward statutory product liability.
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* 3 Interactive Visual Artifact Tiles */}
        <section className="grid md:grid-cols-3 gap-6">
          {/* Tile 1: Flippable SM-2 Flashcard */}
          <div className="rounded-2xl border border-border/80 bg-white dark:bg-[#0A0A28] p-6 flex flex-col justify-between space-y-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#00004E] dark:text-[#D89A06]">SM-2 Flashcards</span>
              <span className="font-mono text-muted-foreground">Click card to flip</span>
            </div>

            <button
              type="button"
              onClick={() => setCardFlipped((f) => !f)}
              className="text-left rounded-xl border border-[#D89A06]/40 bg-[#FEF8E7]/40 dark:bg-white/[0.04] p-4 space-y-2 cursor-pointer hover:border-[#D89A06] transition-colors"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-[#D89A06] font-bold">
                <span>{cardFlipped ? "BACK · ANSWER" : "FRONT · QUESTION"}</span>
                <RotateCcw className="w-3 h-3" />
              </div>
              <div className="text-xs font-semibold text-[#00004E] dark:text-white leading-relaxed min-h-[42px]">
                {cardFlipped
                  ? "Scale differences or unequal cash-flow timing cause IRR and NPV rankings to diverge."
                  : "When does IRR conflict with NPV on mutually exclusive projects?"}
              </div>
            </button>

            <div className="flex items-center justify-between gap-1.5 text-[11px] font-mono">
              {[
                { label: "Again · 10m", tone: "hover:border-rose-500 text-rose-600 dark:text-rose-400" },
                { label: "Good · 3d", tone: "hover:border-[#00004E] text-[#00004E] dark:text-[#D89A06]" },
                { label: "Easy · 7d", tone: "hover:border-emerald-500 text-emerald-600 dark:text-emerald-400" },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => setSelectedInterval(btn.label)}
                  className={`flex-1 py-1.5 rounded-lg border bg-muted/30 font-semibold transition-colors cursor-pointer ${
                    selectedInterval === btn.label ? "border-[#D89A06] bg-[#FEF8E7]/60 dark:bg-white/10" : "border-border/70"
                  } ${btn.tone}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tile 2: Real SVG Curve Specimen */}
          <div className="rounded-2xl border border-border/80 bg-white dark:bg-[#0A0A28] p-6 flex flex-col justify-between space-y-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#00004E] dark:text-[#D89A06]">2mm Graph Sheet</span>
              <span className="font-mono text-muted-foreground">Multi-Curve Plot</span>
            </div>

            <div className="rounded-xl border border-border bg-[#F8F9FD] dark:bg-[#040416] p-3 space-y-2">
              <svg viewBox="0 0 220 82" className="w-full h-20">
                <line x1="20" y1="65" x2="205" y2="65" stroke="currentColor" strokeWidth="1" className="text-slate-400" />
                <line x1="40" y1="8" x2="40" y2="76" stroke="currentColor" strokeWidth="1" className="text-slate-400" />
                <path d="M 45 20 Q 115 110 185 16" fill="none" stroke="#D89A06" strokeWidth="2.2" />
                <line x1="55" y1="72" x2="185" y2="16" stroke="#10B981" strokeWidth="1.8" strokeDasharray="3 3" />
                <circle cx="80" cy="65" r="3.5" fill="#00004E" />
                <circle cx="115" cy="65" r="3.5" fill="#D89A06" />
                <circle cx="150" cy="65" r="3.5" fill="#00004E" />
              </svg>
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span>Roots: (1, 0), (3, 0)</span>
                <span className="text-[#00004E] dark:text-[#D89A06] font-bold">Vertex: (2, −1)</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Plots exact roots, turning points, and geometric transformations.
            </p>
          </div>

          {/* Tile 3: Printable A4 Cheat Sheet */}
          <div className="rounded-2xl border border-border/80 bg-white dark:bg-[#0A0A28] p-6 flex flex-col justify-between space-y-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#00004E] dark:text-[#D89A06]">A4 Revision Sheet</span>
              <span className="font-mono text-muted-foreground">Print Ready</span>
            </div>

            <div className="rounded-xl border border-border bg-[#F8F9FD] dark:bg-[#040416] p-4 space-y-2.5">
              <div className="flex items-center justify-between text-[10px] font-mono border-b border-border pb-1.5">
                <span className="font-bold text-[#00004E] dark:text-white">WEEKS 1–12 SUMMARY</span>
                <span className="text-[#D89A06] font-bold">2-COL A4</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="p-2 rounded-lg bg-white dark:bg-[#0A0A28] border border-border/70">
                  <div className="text-foreground font-bold">18 Formulas</div>
                  <div className="text-muted-foreground mt-0.5">KaTeX typeset</div>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-[#0A0A28] border border-border/70">
                  <div className="text-foreground font-bold">24 Definitions</div>
                  <div className="text-muted-foreground mt-0.5">Slide cited</div>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Condenses full-semester slide decks into a crisp revision sheet.
            </p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
