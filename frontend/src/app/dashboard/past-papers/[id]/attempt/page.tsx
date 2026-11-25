'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { Clock, Check, Loader2, UploadCloud, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/api/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';

function parseMcqContent(text: string): {
  stem: string;
  options: { letter: string; text: string }[];
} {
  const optionRx = /(?:^|\n)[ \t]*([A-Ea-e])[.)][ \t]+(.+)/g;
  const firstOptionIdx = text.search(/(?:^|\n)[ \t]*[A-Ea-e][.)][ \t]+\S/);
  const stem = firstOptionIdx > -1 ? text.slice(0, firstOptionIdx).trim() : text.trim();
  const options: { letter: string; text: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = optionRx.exec(text)) !== null) {
    options.push({ letter: m[1].toUpperCase(), text: m[2].trim() });
  }
  return { stem, options };
}

export default function ExamAttempt() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const attemptId = searchParams.get('attemptId');
  const paperId = String(params.id || '');
  const draftStorageKey = attemptId ? `unistudy_exam_draft_${attemptId}` : '';

  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [scanningQId, setScanningQId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(120 * 60);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  const answersRef = useRef<Record<string, string>>({});
  answersRef.current = answers;
  const questionsRef = useRef<any[]>([]);
  questionsRef.current = questions;
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const supabase = createClient();

  // Hydrate saved draft answers & flags on mount
  useEffect(() => {
    if (!draftStorageKey || typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(draftStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.answers && typeof parsed.answers === 'object') {
          setAnswers(parsed.answers);
        }
        if (parsed?.flagged && typeof parsed.flagged === 'object') {
          setFlagged(parsed.flagged);
        }
      }
    } catch {}
  }, [draftStorageKey]);

  // Persist draft answers & flags to localStorage on every change
  useEffect(() => {
    if (!draftStorageKey || typeof window === 'undefined') return;
    try {
      localStorage.setItem(draftStorageKey, JSON.stringify({ answers, flagged }));
    } catch {}
  }, [answers, flagged, draftStorageKey]);

  useEffect(() => {
    if (!attemptId) {
      router.push(`/dashboard/past-papers/${paperId}`);
      return;
    }

    const fetchExam = async () => {
      setLoading(true);
      let qData: any[] | null = null;
      try {
        const pData: any = await apiFetch(`/v1/past-questions/${paperId}`).catch(() =>
          apiFetch(`/past-papers/${paperId}`)
        );
        if (pData && Array.isArray(pData.past_paper_questions)) {
          qData = pData.past_paper_questions;
        }
      } catch {}

      if (!qData || qData.length === 0) {
        const { data: supaQ } = await supabase
          .from('past_paper_questions')
          .select('*')
          .eq('past_paper_id', paperId)
          .order('question_number', { ascending: true });
        qData = supaQ;
      }

      if (!qData || qData.length === 0) {
        try {
          const extRes = await fetch(`/api/v1/past-questions/${paperId}/extract`, {
            method: 'POST',
          });
          if (extRes.ok) {
            const extData = await extRes.json();
            if (Array.isArray(extData.questions) && extData.questions.length > 0) {
              qData = extData.questions;
            }
          }
        } catch {}
      }

      if (qData) {
        let sortedQs = [...qData].sort((a, b) =>
          String(a.question_number || '').localeCompare(String(b.question_number || ''), undefined, {
            numeric: true,
          })
        );
        sortedQs = sortedQs.map((q) => {
          const hasPrefix = q.extracted_topic && q.extracted_topic.includes('|');
          const isMcq = hasPrefix
            ? q.extracted_topic.startsWith('MCQ|')
            : /(?:^|\n)[ \t]*[A-Ea-e][.)][ \t]+\S/m.test(q.text_content || '');

          return isMcq
            ? { ...q, marks_available: q.marks_available || 1, isMcq: true }
            : { ...q, isMcq: false };
        });
        setQuestions(sortedQs);
      }

      const { data: aData } = await supabase
        .from('past_paper_attempts')
        .select('started_at, time_limit_minutes')
        .eq('id', attemptId)
        .maybeSingle();

      if (aData && aData.started_at) {
        const started = new Date(aData.started_at).getTime();
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - started) / 1000);
        const limitSeconds = (aData.time_limit_minutes || 120) * 60;
        setTimeLeft(Math.max(1, limitSeconds - elapsedSeconds));
      }
      setLoading(false);
    };

    void fetchExam();
  }, [paperId, attemptId, router, supabase]);

  const executeSubmit = useCallback(async () => {
    if (submitting || !attemptId) return;
    setSubmitting(true);

    const activeQuestions = questionsRef.current;
    const currentAnswers = answersRef.current;

    const inserts = activeQuestions.map((q, idx) => ({
      attempt_id: attemptId,
      question_id: q.id,
      question_num: parseInt(q.question_number, 10) || idx + 1,
      user_answer_text: currentAnswers[q.id] || '',
      marks_awarded: null,
    }));

    const { error: insertErr } = await supabase.from('past_paper_answers').insert(inserts);
    if (insertErr) {
      toast.error('Failed to submit exam answers: ' + insertErr.message);
      setSubmitting(false);
      return;
    }

    const { error: updateErr } = await supabase
      .from('past_paper_attempts')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', attemptId);

    if (updateErr) {
      toast.error('Failed to finalize exam attempt: ' + updateErr.message);
      setSubmitting(false);
      return;
    }

    if (draftStorageKey && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(draftStorageKey);
      } catch {}
    }

    router.push(`/dashboard/past-papers/results/${attemptId}`);
  }, [attemptId, draftStorageKey, router, submitting, supabase]);

  // Countdown timer using stable ref so auto-submit always reads latest answers
  useEffect(() => {
    if (loading || questions.length === 0) return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          void executeSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [loading, questions.length, executeSubmit]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')}`;
  };

  const handleAnswerChange = (qId: string, text: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: text }));
  };

  const toggleFlag = (qId: string) => {
    setFlagged((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleHandwritingUpload = async (qId: string, file?: File | null) => {
    if (!file) return;
    setScanningQId(qId);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/ai/scan-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Handwriting OCR failed');
      }
      const transcribed = String(data?.markdown || data?.text || '').trim();
      if (transcribed) {
        setAnswers((prev) => {
          const existing = (prev[qId] || '').trim();
          return {
            ...prev,
            [qId]: existing ? `${existing}\n\n${transcribed}` : transcribed,
          };
        });
        toast.success('Handwritten solution transcribed into your answer box');
      } else {
        toast.error('No legible handwriting detected in that image');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Could not transcribe handwritten notes');
    } finally {
      setScanningQId(null);
    }
  };

  const mcqQuestions = questions.filter((q) => q.isMcq);
  const theoryQuestions = questions.filter((q) => !q.isMcq);
  const answeredCount = questions.filter((q) => Boolean(answers[q.id]?.trim())).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);
  const flaggedCount = questions.filter((q) => flagged[q.id]).length;

  const handleRequestSubmit = () => {
    if (unansweredCount > 0 || flaggedCount > 0) {
      setConfirmSubmitOpen(true);
    } else {
      void executeSubmit();
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-6 space-y-6">
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-24 space-y-6">
      {/* Sticky Header Examination Timer */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/80 py-3 px-4 rounded-b-xl flex flex-wrap justify-between items-center gap-3 shadow-2xs">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#00004E] dark:text-[#D89A06] bg-muted px-2 py-0.5 rounded border border-border">
              Timed Examination
            </span>
            <span className="text-muted-foreground">
              <strong className="text-foreground">{answeredCount}</strong>/{questions.length} Answered
            </span>
            {flaggedCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400">· {flaggedCount} Flagged</span>
            )}
            <span className="text-emerald-600 dark:text-emerald-400 hidden sm:inline">
              · Auto-saved locally
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm sm:text-base font-bold border transition-colors tabular-nums',
              timeLeft < 300
                ? 'bg-rose-500/10 text-rose-600 border-rose-500/30 animate-pulse'
                : 'bg-[#00004E] text-[#D89A06] dark:bg-white/10 dark:text-[#D89A06] border-[#D89A06]/30'
            )}
          >
            <Clock className="w-4 h-4 text-[#D89A06]" />
            {formatTime(timeLeft)}
          </div>

          <Button
            size="sm"
            onClick={handleRequestSubmit}
            disabled={submitting || questions.length === 0}
            className="bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] font-bold text-xs cursor-pointer"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            Submit Paper
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Paper Sheet (8 Cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Official University Examination Paper Header */}
          <header className="rounded-2xl border border-border/80 bg-card p-6 space-y-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div>
                <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  University Examination Paper
                </span>
                <h1 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
                  Candidate Answer Booklet
                </h1>
              </div>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                Duration: 120 Minutes
              </span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground leading-relaxed">
              <li>Select one option for each Section A objective question.</li>
              <li>Show clear step-by-step workings or upload handwritten scans in Section B.</li>
              <li>Flag uncertain questions to revisit from the Question Navigator before submitting.</li>
            </ul>
          </header>

          {mcqQuestions.length > 0 && (
            <section className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-border/80">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Section A: Objective Questions ({mcqQuestions.length})
                </h3>
                <span className="font-mono text-xs text-muted-foreground">1 Mark Each</span>
              </div>

              {mcqQuestions.map((q) => {
                const isFlagged = Boolean(flagged[q.id]);
                return (
                  <Card
                    key={q.id}
                    id={`exam-q-${q.id}`}
                    className="border-border/80 rounded-2xl shadow-xs overflow-hidden scroll-mt-24"
                  >
                    <CardHeader className="bg-muted/30 border-b border-border/60 py-3 px-5">
                      <div className="flex justify-between items-center gap-2">
                        <CardTitle className="text-xs sm:text-sm font-bold font-mono">
                          Question {q.question_number}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleFlag(q.id)}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border transition-colors cursor-pointer',
                              isFlagged
                                ? 'border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                : 'border-border bg-background text-muted-foreground hover:text-foreground'
                            )}
                          >
                            <Flag className="w-3 h-3" />
                            {isFlagged ? 'Flagged' : 'Flag'}
                          </button>
                          <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                            [{q.marks_available} Mark]
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 md:p-6 space-y-4">
                      {(() => {
                        const { stem, options } = parseMcqContent(
                          (q.text_content || '').replace(/<br\s*\/?>/gi, '\n')
                        );
                        return (
                          <>
                            {stem && (
                              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground font-medium leading-relaxed">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm, remarkMath]}
                                  rehypePlugins={[rehypeKatex]}
                                >
                                  {stem}
                                </ReactMarkdown>
                              </div>
                            )}

                            {options.length > 0 && (
                              <div className="space-y-2 pt-1">
                                {options.map((opt) => {
                                  const isSelected = answers[q.id] === opt.letter;
                                  return (
                                    <button
                                      key={opt.letter}
                                      type="button"
                                      onClick={() => handleAnswerChange(q.id, opt.letter)}
                                      className={cn(
                                        'w-full flex items-start gap-3.5 rounded-xl border p-3.5 text-left text-xs sm:text-sm cursor-pointer transition-all',
                                        isSelected
                                          ? 'border-[#00004E] dark:border-[#D89A06] bg-[#00004E]/5 dark:bg-[#D89A06]/10'
                                          : 'border-border/80 bg-card hover:border-primary/40 hover:bg-muted/20'
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          'shrink-0 flex h-6 w-6 items-center justify-center rounded-md font-mono font-bold text-xs border',
                                          isSelected
                                            ? 'bg-[#00004E] text-[#D89A06] border-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E]'
                                            : 'bg-muted text-muted-foreground border-border'
                                        )}
                                      >
                                        {opt.letter}
                                      </span>
                                      <div className="text-foreground leading-relaxed pt-0.5 prose prose-sm dark:prose-invert max-w-none prose-p:my-0">
                                        <ReactMarkdown
                                          remarkPlugins={[remarkGfm, remarkMath]}
                                          rehypePlugins={[rehypeKatex]}
                                        >
                                          {opt.text}
                                        </ReactMarkdown>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                );
              })}
            </section>
          )}

          {theoryQuestions.length > 0 && (
            <section className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-border/80">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                  Section B: Theory &amp; Problem Solving ({theoryQuestions.length})
                </h3>
                <span className="font-mono text-xs text-muted-foreground">Show Workings</span>
              </div>

              {theoryQuestions.map((q) => {
                const isFlagged = Boolean(flagged[q.id]);
                const isScanning = scanningQId === q.id;
                return (
                  <Card
                    key={q.id}
                    id={`exam-q-${q.id}`}
                    className="border-border/80 rounded-2xl shadow-xs overflow-hidden scroll-mt-24"
                  >
                    <CardHeader className="bg-muted/30 border-b border-border/60 py-3 px-5">
                      <div className="flex justify-between items-center gap-2">
                        <CardTitle className="text-xs sm:text-sm font-bold font-mono">
                          Question {q.question_number}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleFlag(q.id)}
                            className={cn(
                              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border transition-colors cursor-pointer',
                              isFlagged
                                ? 'border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                : 'border-border bg-background text-muted-foreground hover:text-foreground'
                            )}
                          >
                            <Flag className="w-3 h-3" />
                            {isFlagged ? 'Flagged' : 'Flag'}
                          </button>
                          <span className="text-[11px] font-mono text-muted-foreground tabular-nums">
                            [{q.marks_available || 10} Marks]
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 md:p-6 space-y-4">
                      <div className="prose prose-sm dark:prose-invert max-w-none text-foreground font-medium leading-relaxed [&_table]:border-collapse [&_table]:w-full [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:p-2 [&_td]:border [&_td]:border-border [&_td]:p-2">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {(q.text_content || '').replace(/<br\s*\/?>/gi, '\n')}
                        </ReactMarkdown>
                      </div>

                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                          <span>Candidate Written Solution</span>
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              ref={(el) => {
                                fileInputRefs.current[q.id] = el;
                              }}
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                void handleHandwritingUpload(q.id, f);
                                e.currentTarget.value = '';
                              }}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isScanning}
                              onClick={() => fileInputRefs.current[q.id]?.click()}
                              className="h-7 gap-1.5 text-xs cursor-pointer"
                            >
                              {isScanning ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <UploadCloud className="w-3.5 h-3.5 text-primary" />
                              )}
                              {isScanning ? 'Scanning...' : 'Scan Handwriting'}
                            </Button>
                          </div>
                        </div>
                        <Textarea
                          placeholder="Type your structured solution here. Clearly label sub-parts (a), (b), (i), (ii) and show step-by-step workings."
                          className="min-h-[200px] font-mono text-xs leading-relaxed resize-y rounded-xl border-border/80 p-3.5"
                          value={answers[q.id] || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </section>
          )}
        </div>

        {/* Sticky UWorld-Style Question Navigator Palette (4 Cols) */}
        <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-foreground">
                Question Navigator
              </h3>
              <span className="text-xs font-mono text-muted-foreground tabular-nums">
                {answeredCount}/{questions.length}
              </span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5">
              {questions.map((q, idx) => {
                const isAns = Boolean(answers[q.id]?.trim());
                const isFlg = Boolean(flagged[q.id]);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      document
                        .getElementById(`exam-q-${q.id}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={cn(
                      'h-8 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer tabular-nums relative',
                      isFlg && 'ring-2 ring-amber-500 border-amber-500/60',
                      isAns
                        ? 'bg-[#00004E] text-[#D89A06] border-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E]'
                        : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted/50'
                    )}
                    title={`Jump to Question ${q.question_number || idx + 1}`}
                  >
                    {q.question_number || idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#00004E] dark:bg-[#D89A06]" />
                Answered ({answeredCount})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs border border-border bg-background" />
                Unanswered ({unansweredCount})
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs ring-2 ring-amber-500" />
                Flagged ({flaggedCount})
              </span>
            </div>

            <Button
              onClick={handleRequestSubmit}
              disabled={submitting || questions.length === 0}
              className="w-full bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] font-bold text-xs h-10 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting Paper...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1.5" /> Finish &amp; Submit Paper
                </>
              )}
            </Button>
          </div>
        </aside>
      </div>

      <ConfirmActionDialog
        open={confirmSubmitOpen}
        onOpenChange={setConfirmSubmitOpen}
        title="Submit Examination Paper?"
        description={
          unansweredCount > 0
            ? `You still have ${unansweredCount} unanswered ${
                unansweredCount === 1 ? 'question' : 'questions'
              }${
                flaggedCount > 0 ? ` and ${flaggedCount} flagged for review` : ''
              }. Unanswered questions receive 0 marks.`
            : `You have ${flaggedCount} ${
                flaggedCount === 1 ? 'question' : 'questions'
              } flagged for review. Submit your paper for marking now?`
        }
        confirmLabel="Submit Paper Now"
        onConfirm={() => {
          setConfirmSubmitOpen(false);
          void executeSubmit();
        }}
      />
    </div>
  );
}
