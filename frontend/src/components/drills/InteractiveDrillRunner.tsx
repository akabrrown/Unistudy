'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  BrainCircuit,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { RadialRing } from '@/components/ui/sparkline';
import { SPRING_SNAPPY, useAppReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface DrillQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
}

interface DrillRecord {
  id: string;
  course_id?: string | null;
  topic: string;
  mastered?: boolean;
}

interface InteractiveDrillRunnerProps {
  drillId: string;
  fallbackCourseId?: string;
}

export function InteractiveDrillRunner({
  drillId,
  fallbackCourseId,
}: InteractiveDrillRunnerProps) {
  const supabase = createClient();
  const reducedMotion = useAppReducedMotion();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [drill, setDrill] = useState<DrillRecord | null>(null);
  const [questions, setQuestions] = useState<DrillQuestion[]>([]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isPassed, setIsPassed] = useState(false);

  const loadDrill = useCallback(async () => {
    if (!drillId) return;
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005';
      const res = await fetch(`${baseUrl}/api/drills/${encodeURIComponent(drillId)}/practice`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setDrill(data.drill || null);
        setQuestions(Array.isArray(data.questions) ? data.questions : []);
        setCurrentIdx(0);
        setAnswers({});
        setRevealed({});
        setSubmitted(false);
      } else {
        toast.error(data?.error || 'Could not load practice drill questions');
      }
    } catch {
      toast.error('Unable to reach drill service right now');
    } finally {
      setLoading(false);
    }
  }, [drillId, supabase]);

  useEffect(() => {
    void loadDrill();
  }, [loadDrill]);

  const handleSelectOption = useCallback(
    (qIndex: number, option: string) => {
      if (submitted || revealed[qIndex]) return;
      setAnswers((prev) => ({ ...prev, [qIndex]: option }));
      setRevealed((prev) => ({ ...prev, [qIndex]: true }));
    },
    [submitted, revealed]
  );

  const handleFinishDrill = useCallback(async () => {
    if (questions.length === 0) return;
    if (Object.keys(answers).length < questions.length) {
      toast.error('Answer every question before finishing this drill.');
      return;
    }

    setSubmitting(true);
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correct_answer) {
        correctCount += 1;
      }
    });

    setScore(correctCount);
    setSubmitted(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005';
        const res = await fetch(`${baseUrl}/api/drills/${encodeURIComponent(drillId)}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ score: correctCount, total: questions.length }),
        });
        const data = await res.json();
        if (data?.success) {
          setIsPassed(Boolean(data.passed));
          if (data.drill?.mastered) {
            toast.success('Topic mastered and cleared from weak areas!');
          } else if (data.passed) {
            toast.success('Drill passed! Keep building mastery.');
          }
        }
      }
    } catch {
      // Score still shown locally
    } finally {
      setSubmitting(false);
    }
  }, [answers, drillId, questions, supabase]);

  // Keyboard shortcuts: 1-4 / A-D to select option, Enter / ArrowRight to advance
  useEffect(() => {
    if (loading || submitted || questions.length === 0) return;
    const activeQ = questions[currentIdx];
    if (!activeQ) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toUpperCase();
      const opts = activeQ.options || [];

      if (!revealed[currentIdx]) {
        const numIdx = ['1', '2', '3', '4'].indexOf(key);
        const letterIdx = ['A', 'B', 'C', 'D'].indexOf(key);
        const chosenIdx = numIdx !== -1 ? numIdx : letterIdx;
        if (chosenIdx !== -1 && opts[chosenIdx]) {
          e.preventDefault();
          handleSelectOption(currentIdx, opts[chosenIdx]);
        }
      } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentIdx < questions.length - 1) {
          setCurrentIdx((i) => i + 1);
        } else {
          void handleFinishDrill();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loading, submitted, questions, currentIdx, revealed, handleSelectOption, handleFinishDrill]);

  const resolvedCourseId = drill?.course_id || fallbackCourseId;
  const backHref = resolvedCourseId
    ? `/dashboard/courses/${resolvedCourseId}/past-papers`
    : '/dashboard/past-papers';

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        <Skeleton className="h-8 w-44 rounded-lg" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (!drill || questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <EmptyState
          icon={BrainCircuit}
          title="Practice Drill Not Found"
          description="This targeted drill has no active questions right now. Return to your past papers hub to select another revision topic."
          action={{ label: 'Back to Past Papers', href: backHref }}
        />
      </div>
    );
  }

  const pct = Math.round((score / Math.max(1, questions.length)) * 100);

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-10 space-y-6">
        <div className="rounded-2xl border border-border/80 bg-card p-8 text-center space-y-5 shadow-xs">
          <div className="flex justify-center">
            <RadialRing
              percent={pct}
              size={108}
              strokeWidth={8}
              label={`${pct}%`}
              sublabel={`${score}/${questions.length}`}
              accentColor={pct >= 70 ? '#10B981' : '#D89A06'}
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#D89A06] font-bold">
              {drill.topic}
            </span>
            <h1 className="text-2xl font-black text-foreground">
              {isPassed || pct >= 70 ? 'Targeted Drill Passed' : 'Keep Reviewing This Topic'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              You answered {score} of {questions.length} targeted practice questions accurately.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => void loadDrill()}
              className="gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Practice New Set
            </Button>
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#00004E] text-white hover:bg-[#000038] dark:bg-[#D89A06] dark:text-[#00004E] px-5 py-2.5 text-xs font-bold shadow-xs transition-colors"
            >
              Return to Past Papers
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeQ = questions[currentIdx];
  const isCurrentRevealed = Boolean(revealed[currentIdx]);
  const selectedOpt = answers[currentIdx];
  const progressPct = Math.round(((currentIdx + 1) / questions.length) * 100);

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      {/* Top Breadcrumb & Topic Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div className="space-y-1">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Past Papers
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {drill.topic}
          </h1>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
          <span className="hidden sm:inline-flex items-center gap-1 text-muted-foreground bg-muted/50 px-2 py-1 rounded border border-border/60">
            <kbd className="font-bold text-foreground">A–D</kbd> answer ·{' '}
            <kbd className="font-bold text-foreground">Enter</kbd> next
          </span>
          <span className="font-bold text-foreground">
            {currentIdx + 1} / {questions.length}
          </span>
        </div>
      </div>

      {/* Step Progress Strip */}
      <div className="space-y-2">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-[#00004E] dark:bg-[#D89A06] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          {questions.map((_, idx) => {
            const ans = answers[idx];
            const rev = revealed[idx];
            const ok = rev && ans === questions[idx].correct_answer;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIdx(idx)}
                className={cn(
                  'h-7 min-w-7 px-2 rounded-md font-mono text-[11px] font-bold border transition-colors cursor-pointer tabular-nums',
                  idx === currentIdx && 'ring-2 ring-[#D89A06]/50',
                  !rev && 'border-border bg-card text-muted-foreground',
                  rev && ok && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                  rev && !ok && 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                )}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
          transition={SPRING_SNAPPY}
          className="rounded-2xl border border-border/80 bg-card p-6 md:p-8 space-y-6 shadow-xs"
        >
          <div className="space-y-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#D89A06] font-bold">
              Question {currentIdx + 1}
            </span>
            <div className="text-base sm:text-lg font-bold text-foreground leading-relaxed prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {activeQ.question}
              </ReactMarkdown>
            </div>
          </div>

          <div className="space-y-2.5">
            {(activeQ.options || []).map((opt, i) => {
              const letter = String.fromCharCode(65 + i);
              const isSelected = selectedOpt === opt;
              const isCorrectOpt = opt === activeQ.correct_answer;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectOption(currentIdx, opt)}
                  disabled={isCurrentRevealed}
                  className={cn(
                    'w-full rounded-xl border p-4 text-left flex items-start gap-3 transition-all cursor-pointer disabled:cursor-default',
                    !isCurrentRevealed &&
                      'border-border bg-background hover:border-[#00004E]/50 dark:hover:border-[#D89A06]/50 hover:bg-muted/30',
                    isCurrentRevealed &&
                      isCorrectOpt &&
                      'border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
                    isCurrentRevealed &&
                      isSelected &&
                      !isCorrectOpt &&
                      'border-rose-500/50 bg-rose-500/10 text-rose-800 dark:text-rose-200',
                    isCurrentRevealed &&
                      !isSelected &&
                      !isCorrectOpt &&
                      'border-border/50 bg-background opacity-55'
                  )}
                >
                  <kbd
                    className={cn(
                      'w-6 h-6 rounded-md border font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5',
                      isCurrentRevealed && isCorrectOpt
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : isCurrentRevealed && isSelected && !isCorrectOpt
                        ? 'border-rose-500 bg-rose-500 text-white'
                        : 'border-border bg-muted/60 text-foreground'
                    )}
                  >
                    {letter}
                  </kbd>
                  <div className="flex-1 text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-0">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {opt}
                    </ReactMarkdown>
                  </div>
                  {isCurrentRevealed && isCorrectOpt && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  )}
                  {isCurrentRevealed && isSelected && !isCorrectOpt && (
                    <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {isCurrentRevealed && activeQ.explanation && (
            <div className="rounded-xl border border-border/70 bg-muted/25 p-4 space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-bold">
                Worked Explanation
              </span>
              <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {activeQ.explanation}
                </ReactMarkdown>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              className="text-xs cursor-pointer"
            >
              Previous
            </Button>

            {currentIdx < questions.length - 1 ? (
              <Button
                size="sm"
                disabled={!isCurrentRevealed}
                onClick={() => setCurrentIdx((i) => i + 1)}
                className="bg-[#00004E] text-white hover:bg-[#000038] dark:bg-[#D89A06] dark:text-[#00004E] text-xs font-bold gap-1.5 cursor-pointer"
              >
                Next Question
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={submitting || Object.keys(answers).length < questions.length}
                onClick={() => void handleFinishDrill()}
                className="bg-[#00004E] text-white hover:bg-[#000038] dark:bg-[#D89A06] dark:text-[#00004E] text-xs font-bold gap-1.5 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving Score...
                  </>
                ) : (
                  <>
                    Complete Drill
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
