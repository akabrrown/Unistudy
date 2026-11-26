'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RadialRing } from '@/components/ui/sparkline';
import { CheckCircle2, RefreshCw, ChevronDown, ChevronUp, FileCheck2, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { isModelAnswerIncomplete } from '../../../../../../../shared/lib/pastPaperGrader';
import { cn } from '@/lib/utils';
import { StructuredQuestionView } from '@/components/past-papers/StructuredQuestionView';
import { StructuredSolutionView } from '@/components/past-papers/StructuredSolutionView';

interface GradedAnswerRow {
  id: string;
  user_answer_text?: string | null;
  marks_awarded: number | null;
  feedback?: string | null;
  model_answer?: string | null;
  past_paper_questions: {
    question_number?: string | null;
    text_content: string;
    marks_available: number | null;
    extracted_topic?: string | null;
  };
}

type ResultFilter = 'all' | 'incorrect' | 'partial' | 'full';

export default function ExamResults() {
  const params = useParams();
  const attemptId = params.attemptId as string;
  const [answers, setAnswers] = useState<GradedAnswerRow[]>([]);
  const [attempt, setAttempt] = useState<{
    past_papers?: {
      year?: number;
      exam_type?: string;
      course_id?: string;
    } | null;
  } | null>(null);
  const [grading, setGrading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [overallScore, setOverallScore] = useState(0);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [collapsedModels, setCollapsedModels] = useState<Record<string, boolean>>({});
  const [supabase] = useState(() => createClient());

  const runGradingAndPersist = useCallback(
    async (forceAll = false, fromEffect = false) => {
      if (!attemptId) return;
      if (!fromEffect) {
        if (forceAll) {
          setRegenerating(true);
        } else {
          setGrading(true);
        }
      }

      try {
        const { data: attData } = await supabase
          .from('past_paper_attempts')
          .select('*, past_papers!past_paper_attempts_past_paper_id_fkey(*)')
          .eq('id', attemptId)
          .single();

        if (attData) setAttempt(attData);

        const { data: ansData } = await supabase
          .from('past_paper_answers')
          .select('*, past_paper_questions(*)')
          .eq('attempt_id', attemptId)
          .order('id', { ascending: true });

        if (!ansData) {
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        const gradedAnswers: GradedAnswerRow[] = ansData.map((row) => ({
          ...(row as GradedAnswerRow),
        }));

        const needsGrading = gradedAnswers.filter(
          (a) =>
            forceAll ||
            a.marks_awarded === null ||
            isModelAnswerIncomplete(a.past_paper_questions?.text_content || '', a.model_answer)
        );

        if (needsGrading.length > 0) {
          const courseId = attData?.past_papers?.course_id;
          let remainingToGrade = [...needsGrading];

          const applyResults = async (
            items: Array<{
              id: string;
              marks_awarded: number;
              feedback: string;
              model_answer: string;
            }>
          ) => {
            for (const gradedItem of items) {
              const ans = gradedAnswers.find((a) => a.id === gradedItem.id);
              if (!ans) continue;
              ans.marks_awarded = gradedItem.marks_awarded;
              ans.feedback = gradedItem.feedback;
              ans.model_answer = gradedItem.model_answer;

              await supabase
                .from('past_paper_answers')
                .update({
                  marks_awarded: ans.marks_awarded,
                  feedback: ans.feedback,
                  model_answer: ans.model_answer,
                })
                .eq('id', ans.id);
            }
          };

          const toPayload = (rows: GradedAnswerRow[]) =>
            rows.map((ans) => ({
              id: ans.id,
              question_content: ans.past_paper_questions?.text_content || '',
              marks_available: ans.past_paper_questions?.marks_available || 0,
              student_answer: ans.user_answer_text?.trim()
                ? ans.user_answer_text
                : '[No answer provided]',
            }));

          if (session?.access_token) {
            try {
              const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'}/api/past-papers/grade-batch`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({
                    answers: toPayload(remainingToGrade),
                    is_ultra: false,
                    course_id: courseId,
                  }),
                }
              );
              if (res.ok) {
                const result = await res.json();
                if (result.success && Array.isArray(result.data)) {
                  await applyResults(result.data);
                }
              }
            } catch {}
          }

          remainingToGrade = gradedAnswers.filter(
            (a) =>
              a.marks_awarded === null ||
              isModelAnswerIncomplete(a.past_paper_questions?.text_content || '', a.model_answer)
          );

          if (remainingToGrade.length > 0) {
            try {
              const localRes = await fetch('/api/ai/grade-past-paper', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  answers: toPayload(remainingToGrade),
                  is_ultra: false,
                  course_id: courseId,
                }),
              });
              if (localRes.ok) {
                const localJson = await localRes.json();
                if (
                  typeof localJson.remainingCredits === 'number' &&
                  typeof window !== 'undefined'
                ) {
                  window.dispatchEvent(
                    new CustomEvent('unistudy-credits-changed', {
                      detail: { balance: localJson.remainingCredits },
                    })
                  );
                }
                if (localJson.success && Array.isArray(localJson.data)) {
                  await applyResults(localJson.data);
                }
              }
            } catch {
              toast.error('Some model answers could not be generated. Click Re-grade All to retry.');
            }
          }
        }

        let totalAwarded = 0;
        let totalAvail = 0;
        for (const ans of gradedAnswers) {
          totalAvail += ans.past_paper_questions?.marks_available || 0;
          totalAwarded += ans.marks_awarded || 0;
        }

        setAnswers(gradedAnswers);
        setTotalAvailable(totalAvail);
        setOverallScore(totalAwarded);

        if (totalAvail > 0 && attData) {
          const pct = (totalAwarded / totalAvail) * 100;
          await supabase
            .from('past_paper_attempts')
            .update({ score_percentage: pct })
            .eq('id', attemptId);

          if (needsGrading.length > 0 && session?.access_token) {
            fetch(
              `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'}/api/drills/generate-from-attempt`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ attemptId }),
              }
            ).catch(() => {});
          }
        }
      } finally {
        setGrading(false);
        setRegenerating(false);
      }
    },
    [attemptId, supabase]
  );

  useEffect(() => {
    if (!attemptId) return;
    const timer = setTimeout(() => {
      void runGradingAndPersist(false, true);
    }, 0);
    return () => clearTimeout(timer);
  }, [attemptId, runGradingAndPersist]);

  const percentage = totalAvailable > 0 ? Math.round((overallScore / totalAvailable) * 100) : 0;
  const hasAnyMissingAnswer = answers.some((a) =>
    isModelAnswerIncomplete(a.past_paper_questions?.text_content || '', a.model_answer)
  );

  // Section A (<=2 marks / MCQ) vs Section B (>2 marks / Theory) breakdown
  const sectionBreakdown = useMemo(() => {
    let secAEarned = 0;
    let secAMax = 0;
    let secBEarned = 0;
    let secBMax = 0;
    for (const a of answers) {
      const max = a.past_paper_questions?.marks_available || 0;
      const got = a.marks_awarded || 0;
      const isObj =
        max <= 2 || Boolean(a.past_paper_questions?.extracted_topic?.startsWith('MCQ|'));
      if (isObj) {
        secAEarned += got;
        secAMax += max;
      } else {
        secBEarned += got;
        secBMax += max;
      }
    }
    return {
      secAEarned,
      secAMax,
      secAPct: secAMax > 0 ? Math.round((secAEarned / secAMax) * 100) : 0,
      secBEarned,
      secBMax,
      secBPct: secBMax > 0 ? Math.round((secBEarned / secBMax) * 100) : 0,
    };
  }, [answers]);

  const filteredAnswers = useMemo(() => {
    if (resultFilter === 'all') return answers;
    return answers.filter((a) => {
      const got = a.marks_awarded || 0;
      const max = a.past_paper_questions?.marks_available || 0;
      if (resultFilter === 'incorrect') return got === 0;
      if (resultFilter === 'full') return max > 0 && got === max;
      return got > 0 && got < max;
    });
  }, [answers, resultFilter]);

  if (grading) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-6">
        <div className="rounded-2xl border border-border/80 bg-card p-8 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-56 rounded-lg" />
              <Skeleton className="h-4 w-80 rounded-lg" />
              <p className="text-xs font-mono text-muted-foreground pt-2">
                Marking scripts and preparing complete model solutions...
              </p>
            </div>
            <Skeleton className="h-28 w-28 rounded-full shrink-0" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Report Card Header */}
      <section className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
          <div className="space-y-3 text-center md:text-left flex-1">
            <Link
              href="/dashboard/past-papers"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Past Question Bank
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Examination Marking Report
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-lg">
              {attempt?.past_papers?.year ? `${attempt.past_papers.year} ` : ''}
              {attempt?.past_papers?.exam_type || 'Official'} Examination · Question-by-question
              rubric breakdown and full worked solutions.
            </p>
            <div className="flex flex-wrap gap-2.5 justify-center md:justify-start pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => runGradingAndPersist(hasAnyMissingAnswer ? false : true)}
                disabled={regenerating}
                className="gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', regenerating && 'animate-spin')} />
                {regenerating
                  ? 'Updating Marks...'
                  : hasAnyMissingAnswer
                  ? 'Complete Missing Solutions'
                  : 'Re-grade Paper'}
              </Button>
              {attempt?.past_papers?.course_id && (
                <Link href={`/dashboard/courses/${attempt.past_papers.course_id}/past-papers`}>
                  <Button
                    size="sm"
                    className="bg-[#00004E] text-white hover:bg-[#000038] dark:bg-[#D89A06] dark:text-[#00004E] text-xs font-bold cursor-pointer"
                  >
                    Practice Weak Topics
                  </Button>
                </Link>
              )}
            </div>
          </div>

          <RadialRing
            percent={percentage}
            size={128}
            strokeWidth={9}
            label={`${percentage}%`}
            sublabel={`${overallScore}/${totalAvailable}`}
            accentColor={percentage >= 70 ? '#10B981' : percentage >= 50 ? '#D89A06' : '#EF4444'}
          />
        </div>

        {/* Visual Section A vs Section B Score Bars */}
        {(sectionBreakdown.secAMax > 0 || sectionBreakdown.secBMax > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border/60 tabular-nums">
            {sectionBreakdown.secAMax > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Section A (Objective)</span>
                  <span className="font-mono font-bold text-foreground">
                    {sectionBreakdown.secAEarned}/{sectionBreakdown.secAMax} ({sectionBreakdown.secAPct}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#00004E] dark:bg-[#D89A06] transition-all"
                    style={{ width: `${sectionBreakdown.secAPct}%` }}
                  />
                </div>
              </div>
            )}

            {sectionBreakdown.secBMax > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Section B (Theory &amp; Workings)</span>
                  <span className="font-mono font-bold text-foreground">
                    {sectionBreakdown.secBEarned}/{sectionBreakdown.secBMax} ({sectionBreakdown.secBPct}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all"
                    style={{ width: `${sectionBreakdown.secBPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
          <FileCheck2 className="w-5 h-5 text-primary" /> Question Breakdown
        </h2>
        <div className="inline-flex items-center rounded-xl border border-border bg-muted/30 p-1 gap-1 text-xs">
          {(
            [
              { id: 'all', label: `All (${answers.length})` },
              {
                id: 'incorrect',
                label: `Zero Marks (${answers.filter((a) => (a.marks_awarded || 0) === 0).length})`,
              },
              {
                id: 'partial',
                label: `Partial (${
                  answers.filter((a) => {
                    const g = a.marks_awarded || 0;
                    const m = a.past_paper_questions?.marks_available || 0;
                    return g > 0 && g < m;
                  }).length
                })`,
              },
              {
                id: 'full',
                label: `Full Marks (${
                  answers.filter((a) => {
                    const g = a.marks_awarded || 0;
                    const m = a.past_paper_questions?.marks_available || 0;
                    return m > 0 && g === m;
                  }).length
                })`,
              },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setResultFilter(f.id)}
              className={cn(
                'px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer tabular-nums',
                resultFilter === f.id
                  ? 'bg-background text-foreground shadow-2xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Detailed Feedback Cards */}
      <div className="space-y-5">
        {filteredAnswers.map((ans, idx) => {
          const q = ans.past_paper_questions;
          const marksAwarded = ans.marks_awarded || 0;
          const maxMarks = q.marks_available || 0;
          const isPerfect = maxMarks > 0 && marksAwarded === maxMarks;
          const isZero = marksAwarded === 0;
          const isModelHidden = Boolean(collapsedModels[ans.id]);

          return (
            <Card
              key={ans.id}
              className={cn(
                'border-l-4 overflow-hidden',
                isPerfect
                  ? 'border-l-emerald-500'
                  : isZero
                  ? 'border-l-rose-500'
                  : 'border-l-[#D89A06]'
              )}
            >
              <CardHeader className="pb-3 border-b border-border/50 bg-muted/15">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <CardTitle className="text-sm font-mono font-bold">
                      Question {q.question_number || idx + 1}
                    </CardTitle>
                    <StructuredQuestionView content={q.text_content} questionNumber={q.question_number || idx + 1} />
                  </div>
                  <div
                    className={cn(
                      'px-3 py-1 rounded-lg font-mono font-bold text-xs shrink-0 tabular-nums',
                      isPerfect
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                        : isZero
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                    )}
                  >
                    {marksAwarded} / {maxMarks}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-sm">
                <div>
                  <h4 className="font-mono font-semibold text-muted-foreground mb-1 uppercase tracking-wider text-[10px]">
                    Submitted Response
                  </h4>
                  <div className="bg-background border border-border/80 p-3 rounded-xl font-mono text-xs text-foreground/90 whitespace-pre-wrap">
                    {ans.user_answer_text?.trim() || (
                      <span className="italic text-muted-foreground">No answer submitted.</span>
                    )}
                  </div>
                </div>

                {ans.feedback && (
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl">
                    <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-primary mb-1.5">
                      Marking Breakdown
                    </h4>
                    <div className="text-foreground/90 leading-relaxed text-sm prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {ans.feedback}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {ans.model_answer?.trim() ? (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedModels((prev) => ({ ...prev, [ans.id]: !prev[ans.id] }))
                      }
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-emerald-500/10 transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-mono uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Official Model Solution
                      </span>
                      {isModelHidden ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    {!isModelHidden && (
                      <div className="px-4 pb-4 pt-2 border-t border-emerald-500/15">
                        <StructuredSolutionView modelAnswer={ans.model_answer} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-muted/40 border border-border/50 p-3 rounded-xl text-xs text-muted-foreground flex items-center justify-between gap-2">
                    <span>Model solution is pending for this question.</span>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => runGradingAndPersist(false)}
                      disabled={regenerating}
                    >
                      Generate Solution
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
