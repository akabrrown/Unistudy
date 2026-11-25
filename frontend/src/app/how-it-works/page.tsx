'use client';

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { SPRING_SNAPPY, useAppReducedMotion } from "@/lib/motion";
import {
  Upload,
  Layers,
  Award,
  Video,
  Camera,
  LineChart,
  FileText,
  ArrowRight,
} from "lucide-react";

const PIPELINE_STEPS = [
  {
    step: 1,
    title: "Drop Course Material",
    icon: Upload,
    summary: "Upload lecture slide decks (PDF/PPTX), handwritten board photos, or YouTube lecture links.",
    detail: "Slides are indexed page-by-page and cached locally in IndexedDB so you can revise even when campus Wi-Fi drops.",
  },
  {
    step: 2,
    title: "Review Cited Breakdowns",
    icon: Layers,
    summary: "Read clear explanations, formulas, and SM-2 flashcards—each linked to its exact slide number.",
    detail: "Click any [Slide N] badge to jump straight to the lecturer's original diagram or formula derivation.",
  },
  {
    step: 3,
    title: "Simulate Timed Exams",
    icon: Award,
    summary: "Sit 120-minute past exam papers with instant MCQ scoring and part-by-part theory rubrics.",
    detail: "Sub-questions (a), (b), (i), and (ii) are graded individually with worked model solutions for any missed marks.",
  },
] as const;

export default function HowItWorksPage() {
  const [activeStep, setActiveStep] = useState<number>(1);
  const reducedMotion = useAppReducedMotion();
  const currentStep = PIPELINE_STEPS.find((s) => s.step === activeStep) || PIPELINE_STEPS[0];

  return (
    <div className="min-h-[100dvh] bg-[#F8F9FD] dark:bg-[#040416] transition-colors">
      <MarketingNavbar />
      <main className="max-w-6xl mx-auto px-6 sm:px-8 py-16 md:py-24 space-y-16">
        {/* Header */}
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#00004E] dark:text-[#D89A06] border-l-2 border-[#D89A06] pl-3">
            Three-Stage Study Pipeline
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-[#00004E] dark:text-white tracking-tight">
            From Lecture Slides to Exam Ready.
          </h1>
          <p className="text-base text-[#4B526B] dark:text-[#A3A8C2]">
            Select any stage below to inspect how your uploaded course materials flow into timed mock examination practice.
          </p>
        </div>

        {/* Connected 3-Stage Interactive Pipeline */}
        <section className="space-y-6">
          <div className="relative grid md:grid-cols-3 gap-6">
            {/* Desktop Horizontal Connector Hairline */}
            <div
              aria-hidden="true"
              className="hidden md:block absolute top-11 left-[16%] right-[16%] h-[2px] bg-border/80 -z-0"
            />

            {PIPELINE_STEPS.map((item) => {
              const Icon = item.icon;
              const isSelected = activeStep === item.step;
              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => setActiveStep(item.step)}
                  className={`relative z-10 text-left p-6 bg-white dark:bg-[#0A0A28] rounded-2xl border transition-all flex flex-col justify-between space-y-5 cursor-pointer ${
                    isSelected
                      ? "border-[#00004E] dark:border-[#D89A06] shadow-md"
                      : "border-border/80 hover:border-[#D89A06]/50 shadow-2xs"
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="how-it-works-active-ring"
                      transition={reducedMotion ? { duration: 0 } : SPRING_SNAPPY}
                      className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-[#D89A06]"
                    />
                  )}

                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2.5 text-xs font-bold text-[#00004E] dark:text-white">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                          isSelected
                            ? "bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E]"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        0{item.step}
                      </span>
                      <span>{item.title}</span>
                    </span>
                    <Icon className="w-4 h-4 text-[#D89A06]" />
                  </div>

                  {/* Stage Visual Artifact */}
                  {item.step === 1 && (
                    <div className="rounded-xl border border-dashed border-border bg-[#F8F9FD] dark:bg-white/[0.04] p-4 text-center space-y-2">
                      <div className="mx-auto w-8 h-8 rounded-lg bg-[#00004E] text-[#D89A06] flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-[#00004E] dark:text-white font-mono">
                        BCPC_208_Week_4.pdf
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        42 Slides · PDF, PPTX, or Photo
                      </div>
                    </div>
                  )}

                  {item.step === 2 && (
                    <div className="rounded-xl border border-border/80 bg-[#F8F9FD] dark:bg-[#040416] p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-[#D89A06] font-bold">SLIDE 14 OF 42</span>
                        <span className="px-1.5 py-0.5 rounded bg-[#00004E] text-white">[Cited]</span>
                      </div>
                      <div className="text-xs font-bold text-[#00004E] dark:text-white">
                        Cash Conversion Cycle
                      </div>
                      <div className="text-[11px] font-mono text-[#00004E] dark:text-[#D89A06] bg-white dark:bg-[#0A0A28] px-2.5 py-1.5 rounded border border-border/70">
                        CCC = DIO + DSO − DPO
                      </div>
                    </div>
                  )}

                  {item.step === 3 && (
                    <div className="rounded-xl border border-border/80 bg-[#F8F9FD] dark:bg-[#040416] p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-muted-foreground">2023 FINAL EXAM</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">88% · Grade A</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full w-[88%] bg-[#D89A06] rounded-full" />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-foreground font-medium">
                        <span>Q1–Q4 Graded</span>
                        <span className="text-[#D89A06] font-semibold">Worked Solutions</span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed">
                    {item.summary}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Focused Step Detail Strip */}
          <div className="rounded-2xl border border-border/80 bg-white dark:bg-[#0A0A28] p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-mono font-semibold text-[#D89A06]">
                STAGE 0{currentStep.step} · {currentStep.title.toUpperCase()}
              </div>
              <p className="text-xs sm:text-sm text-foreground/90">{currentStep.detail}</p>
            </div>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] px-4 py-2.5 rounded-xl shrink-0 hover:opacity-95 transition-opacity"
            >
              <span>Open Free Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Open Hair-Line Connected Capabilities Strip (Zero Truncation) */}
        <section className="pt-8 border-t border-border/60 space-y-6">
          <h2 className="text-xl font-bold text-[#00004E] dark:text-white">
            Connected Study Studios Included
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Video, title: "YouTube Lecture Notes", desc: "Capture live video timestamps and KaTeX formula notes alongside course recordings." },
              { icon: Camera, title: "Handwritten Note OCR", desc: "Scan whiteboard or notebook derivations directly into clean LaTeX and Markdown." },
              { icon: FileText, title: "Essay Rubric Grader", desc: "Evaluate thesis, citations, structure, and clarity with an honors-level comparison draft." },
              { icon: LineChart, title: "Weakness Drills", desc: "Automatically convert missed past-paper topics into focused 5-minute active recall drills." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="space-y-2 border-l border-border/80 pl-4">
                <div className="w-8 h-8 rounded-lg bg-[#00004E] text-[#D89A06] dark:bg-white/10 dark:text-[#D89A06] flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-sm font-bold text-[#00004E] dark:text-white">{title}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
