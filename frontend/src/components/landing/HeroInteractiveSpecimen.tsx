'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, RotateCcw, CheckCircle2, Layers, Award, Calculator } from 'lucide-react';
import { SPRING_SNAPPY, useAppReducedMotion } from '@/lib/motion';

const HERO_MODES = [
  { id: 'slide', label: 'Slide 14', icon: Layers },
  { id: 'formula', label: 'Worked Math', icon: Calculator },
  { id: 'rubric', label: '2023 Q2(b)', icon: Award },
] as const;

type HeroModeId = (typeof HERO_MODES)[number]['id'];

export function HeroInteractiveSpecimen() {
  const [mode, setMode] = useState<HeroModeId>('slide');
  const [cardFlipped, setCardFlipped] = useState(false);
  const reducedMotion = useAppReducedMotion();

  return (
    <div className="rounded-2xl bg-white dark:bg-[#0A0A28] border border-border/80 dark:border-white/10 shadow-xl overflow-hidden">
      {/* Course Header + Interactive Specimen Tabs */}
      <div className="bg-[#00004E] px-5 pt-4 pb-3 text-white border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-mono font-semibold text-[#D89A06] block">
              BCPC 208 · CORPORATE FINANCE
            </span>
            <span className="text-xs font-medium text-white/85">
              Week 4 Deck · Slide 14 of 42
            </span>
          </div>
          <span className="text-[11px] font-mono text-white/80 bg-white/10 px-2 py-0.5 rounded border border-white/15">
            [Slide 14]
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-lg bg-white/10 p-1">
          {HERO_MODES.map((tab) => {
            const Icon = tab.icon;
            const active = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id)}
                className={`relative py-1.5 px-2 rounded-md text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  active ? 'text-[#00004E]' : 'text-white/75 hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="hero-specimen-tab"
                    transition={reducedMotion ? { duration: 0 } : SPRING_SNAPPY}
                    className="absolute inset-0 rounded-md bg-[#D89A06]"
                  />
                )}
                <Icon className="w-3 h-3 relative z-10 shrink-0" />
                <span className="relative z-10 truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Specimen Body */}
      <div className="p-5 min-h-[255px] flex flex-col justify-between">
        <AnimatePresence mode="wait" initial={false}>
          {mode === 'slide' && (
            <motion.div
              key="slide"
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: reducedMotion ? 0 : 0.16, ease: 'easeOut' }}
              className="space-y-3.5"
            >
              <div>
                <h2 className="text-base font-bold text-[#00004E] dark:text-white">
                  Working Capital &amp; Cash Conversion Cycle (CCC)
                </h2>
                <p className="text-xs text-[#4B526B] dark:text-[#A3A8C2] mt-1 leading-relaxed">
                  Measures the days required to convert inventory and receivables into cash inflows after accounting for supplier credit terms.
                </p>
              </div>

              {/* Interactive Mini Flashcard Flip */}
              <button
                type="button"
                onClick={() => setCardFlipped((prev) => !prev)}
                className="w-full text-left p-3.5 rounded-xl bg-[#F8F9FD] dark:bg-white/[0.04] border border-border/80 hover:border-[#D89A06]/60 transition-colors cursor-pointer space-y-1.5 group"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span>{cardFlipped ? 'ANSWER · [Slide 14]' : 'ACTIVE RECALL CARD · CLICK TO FLIP'}</span>
                  <RotateCcw className="w-3 h-3 text-[#D89A06] group-hover:rotate-45 transition-transform" />
                </div>
                <p className="text-xs font-semibold text-[#00004E] dark:text-white leading-relaxed">
                  {cardFlipped
                    ? 'A negative CCC means customers pay before suppliers must be paid, so supplier credit funds working capital.'
                    : 'Why can a retail supermarket operate profitably with a negative Cash Conversion Cycle?'}
                </p>
              </button>
            </motion.div>
          )}

          {mode === 'formula' && (
            <motion.div
              key="formula"
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: reducedMotion ? 0 : 0.16, ease: 'easeOut' }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#00004E] dark:text-white">
                  Step-by-Step Numerical Solution
                </h2>
                <span className="font-mono text-[11px] text-[#D89A06] font-semibold">53 Days</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                <div className="p-2.5 rounded-lg bg-[#F8F9FD] dark:bg-white/[0.04] border border-border/70">
                  <div className="text-[10px] text-muted-foreground">DIO</div>
                  <div className="font-bold text-[#00004E] dark:text-white mt-0.5">45d</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#F8F9FD] dark:bg-white/[0.04] border border-border/70">
                  <div className="text-[10px] text-muted-foreground">+ DSO</div>
                  <div className="font-bold text-[#00004E] dark:text-white mt-0.5">38d</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#F8F9FD] dark:bg-white/[0.04] border border-border/70">
                  <div className="text-[10px] text-muted-foreground">− DPO</div>
                  <div className="font-bold text-[#00004E] dark:text-white mt-0.5">30d</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#00004E] text-white font-mono text-xs flex items-center justify-between">
                <span>CCC = 45 + 38 − 30</span>
                <span className="text-[#D89A06] font-bold">= 53 Days</span>
              </div>
            </motion.div>
          )}

          {mode === 'rubric' && (
            <motion.div
              key="rubric"
              initial={reducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: reducedMotion ? 0 : 0.16, ease: 'easeOut' }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#00004E] dark:text-white">
                  2023 Final Exam · Question 2(b) Rubric
                </h2>
                <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  5 / 5 Marks
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  ['State correct CCC formula [Slide 14]', '1.5m'],
                  ['Substitute DIO, DSO & DPO day counts', '2.0m'],
                  ['Interpret liquidity impact on overdraft need', '1.5m'],
                ].map(([criterion, marks]) => (
                  <div
                    key={criterion}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#F8F9FD] dark:bg-white/[0.04] border border-border/60"
                  >
                    <span className="flex items-center gap-2 text-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{criterion}</span>
                    </span>
                    <span className="font-mono font-bold text-[#00004E] dark:text-[#D89A06] tabular-nums">
                      {marks}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pt-3 mt-4 flex items-center justify-between text-xs border-t border-border/60">
          <span className="text-muted-foreground">
            Matched across 4 past papers (2019–2024)
          </span>
          <Link
            href="/signup"
            className="text-[#00004E] dark:text-[#D89A06] font-semibold hover:underline inline-flex items-center gap-1"
          >
            Try Q2(b) <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

const MATCHER_TOPICS = [
  {
    id: 'npv',
    topic: 'Capital Budgeting (NPV & IRR)',
    slides: 'Week 6 · Slides 8–24',
    papers: '6 Papers',
    preview: '2024 End-of-Sem Q1(b): Evaluate mutually exclusive Equipment A vs B at 14% cost of capital [15 Marks].',
  },
  {
    id: 'wacc',
    topic: 'Weighted Average Cost of Capital',
    slides: 'Week 8 · Slides 3–19',
    papers: '5 Papers',
    preview: '2023 Final Exam Q3(a): Compute post-tax WACC using market value weights of equity and redeemable debt [12 Marks].',
  },
  {
    id: 'dividend',
    topic: 'Dividend Relevance (Gordon Model)',
    slides: 'Week 10 · Slides 11–27',
    papers: '4 Papers',
    preview: '2022 Resit Paper Q4: Contrast Modigliani-Miller irrelevance with bird-in-the-hand signalling [10 Marks].',
  },
] as const;

export function SlideExamMatcherCard() {
  const [selectedId, setSelectedId] = useState<string>('npv');
  const active = MATCHER_TOPICS.find((t) => t.id === selectedId) || MATCHER_TOPICS[0];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border/80 bg-[#F8F9FD] dark:bg-[#040416] overflow-hidden text-xs">
        <div className="grid grid-cols-12 bg-[#00004E] text-white px-4 py-2.5 font-semibold">
          <div className="col-span-6">Lecturer Revision Topic</div>
          <div className="col-span-4">Matched Slides</div>
          <div className="col-span-2 text-right">Exams</div>
        </div>
        <div className="divide-y divide-border/70">
          {MATCHER_TOPICS.map((row) => {
            const isSelected = row.id === selectedId;
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedId(row.id)}
                className={`w-full grid grid-cols-12 px-4 py-2.5 items-center text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#FEF8E7]/70 dark:bg-white/[0.06]'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="col-span-6 font-semibold text-[#00004E] dark:text-white flex items-center gap-2 truncate pr-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isSelected ? 'bg-[#D89A06]' : 'bg-muted-foreground/30'
                    }`}
                  />
                  <span className="truncate">{row.topic}</span>
                </div>
                <div className="col-span-4 text-muted-foreground truncate">{row.slides}</div>
                <div className="col-span-2 text-right font-mono font-bold text-[#00004E] dark:text-[#D89A06] tabular-nums">
                  {row.papers}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3 rounded-xl border border-border/70 bg-muted/30 text-xs flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] font-semibold text-[#D89A06] block mb-0.5">
            MATCHED PAST QUESTION SPECIMEN
          </span>
          <p className="text-foreground/90 leading-relaxed">{active.preview}</p>
        </div>
      </div>
    </div>
  );
}
