'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api/client';
import { createClient } from '@/lib/supabase/client';
import { generateQuiz } from '@/app/actions/quizzes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { RadialRing } from '@/components/ui/sparkline';
import { CollegiateLibraryIllustration } from '@/components/illustrations';
import {
  ChevronLeft,
  Loader2,
  PlayCircle,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function QuizPage() {
  const params = useParams();
  const courseId = params.courseId as string;

  const [lectures, setLectures] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  // Quiz mode state
  const [quizMode, setQuizMode] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [theorySelfGrade, setTheorySelfGrade] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const quizStartRef = useRef<number>(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let lecs: any[] = [];
    try {
      lecs = await apiFetch(`/lectures/${courseId}`);
    } catch {
      // Fallback to Supabase direct read
    }

    if (!Array.isArray(lecs) || lecs.length === 0) {
      try {
        const supabase = createClient();
        const { data: dbLectures } = await supabase
          .from('lectures')
          .select('*')
          .eq('course_id', courseId)
          .order('week', { ascending: true });
        if (Array.isArray(dbLectures)) {
          lecs = dbLectures;
        }
      } catch {}
    }

    const cleanLecs = (lecs || []).filter((l: any) => !l.title?.startsWith('[FAILED'));
    setLectures(cleanLecs);
    const lecIds = cleanLecs.map((l: any) => l.id);

    if (lecIds.length > 0) {
      const { getQuizzes } = await import('@/app/actions/quizzes');
      const res = await getQuizzes(lecIds);
      if (res.data) setQuizzes(res.data);
    } else {
      setQuizzes([]);
    }

    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Live stopwatch during active quiz
  useEffect(() => {
    if (!quizMode || showResults) return;
    const id = window.setInterval(() => {
      setElapsedSeconds(Math.max(1, Math.floor((Date.now() - quizStartRef.current) / 1000)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [quizMode, showResults]);

  async function handleGenerate(lectureId: string) {
    setGeneratingFor(lectureId);
    const res = await generateQuiz(lectureId, 5);
    if (res.error) {
      toast.error(typeof res.error === 'string' ? res.error : 'Failed to generate quiz');
    } else {
      toast.success('Generated 5 practice questions!');
      await fetchData();
    }
    setGeneratingFor(null);
  }

  function startQuiz(lectureId: string) {
    const lectureQs = quizzes.filter((q) => q.lecture_id === lectureId);
    if (lectureQs.length === 0) {
      toast.error('No questions generated for this lecture yet.');
      return;
    }

    setActiveQuestions(lectureQs);
    setCurrentQIndex(0);
    setUserAnswer('');
    setIsSubmitted(false);
    setTheorySelfGrade(null);
    setScore(0);
    setShowResults(false);
    quizStartRef.current = Date.now();
    setElapsedSeconds(0);
    setQuizMode(true);
  }

  const handleOptionSelect = useCallback(
    (label: string) => {
      if (isSubmitted) return;
      setUserAnswer(label);
      setIsSubmitted(true);

      if (label === activeQuestions[currentQIndex]?.correct_option) {
        setScore((s) => s + 1);
      }
    },
    [isSubmitted, activeQuestions, currentQIndex]
  );

  function handleTextSubmit() {
    if (isSubmitted || !userAnswer.trim()) return;
    setIsSubmitted(true);

    const q = activeQuestions[currentQIndex];
    if (q.type === 'fill_in') {
      const isCorrect =
        userAnswer.trim().toLowerCase() === String(q.correct_option || '').trim().toLowerCase();
      if (isCorrect) setScore((s) => s + 1);
    }
  }

  function handleTheoryGrade(correct: boolean) {
    setTheorySelfGrade(correct);
    if (correct) setScore((s) => s + 1);
  }

  const nextQuestion = useCallback(async () => {
    if (currentQIndex < activeQuestions.length - 1) {
      setCurrentQIndex((prev) => prev + 1);
      setUserAnswer('');
      setIsSubmitted(false);
      setTheorySelfGrade(null);
    } else {
      const timeTakenSeconds = Math.max(
        5,
        Math.round((Date.now() - quizStartRef.current) / 1000)
      );
      setElapsedSeconds(timeTakenSeconds);
      const percentage = Math.round((score / Math.max(1, activeQuestions.length)) * 100);
      const { submitQuizAttempt } = await import('@/app/actions/quizzes');
      await submitQuizAttempt(
        activeQuestions[0].lecture_id,
        percentage,
        activeQuestions.length,
        timeTakenSeconds
      );
      setShowResults(true);
    }
  }, [currentQIndex, activeQuestions, score]);

  // Keyboard shortcuts: 1-4 / A-D for MCQ options, Enter for Next
  useEffect(() => {
    if (!quizMode || showResults || activeQuestions.length === 0) return;
    const q = activeQuestions[currentQIndex];
    if (!q) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!isSubmitted && (!q.type || q.type === 'mcq') && Array.isArray(q.options)) {
        const key = e.key.toUpperCase();
        const numIdx = ['1', '2', '3', '4'].indexOf(key);
        const letIdx = ['A', 'B', 'C', 'D'].indexOf(key);
        const idx = numIdx !== -1 ? numIdx : letIdx;
        if (idx !== -1 && q.options[idx]) {
          e.preventDefault();
          handleOptionSelect(q.options[idx].label);
        }
      } else if (
        isSubmitted &&
        (e.key === 'Enter' || e.key === 'ArrowRight') &&
        (q.type !== 'theory' || theorySelfGrade !== null)
      ) {
        e.preventDefault();
        void nextQuestion();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [quizMode, showResults, activeQuestions, currentQIndex, isSubmitted, theorySelfGrade, handleOptionSelect, nextQuestion]);

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-60 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (quizMode) {
    if (showResults) {
      const percentage = Math.round((score / Math.max(1, activeQuestions.length)) * 100);
      const mins = Math.floor(elapsedSeconds / 60);
      const secs = elapsedSeconds % 60;
      return (
        <div className="p-6 md:p-10 max-w-2xl mx-auto min-h-[calc(100vh-theme(spacing.16))] flex flex-col items-center justify-center text-center">
          <div className="w-full rounded-3xl border border-border/80 bg-card p-8 space-y-6 shadow-xs">
            <div className="flex justify-center">
              <RadialRing
                percent={percentage}
                size={112}
                strokeWidth={8}
                label={`${percentage}%`}
                sublabel={`${score}/${activeQuestions.length}`}
                accentColor={percentage >= 70 ? '#10B981' : '#D89A06'}
              />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-foreground">Quiz Complete</h2>
              <p className="text-xs sm:text-sm text-muted-foreground tabular-nums">
                Scored {score} of {activeQuestions.length} in {mins > 0 ? `${mins}m ` : ''}
                {secs}s.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => startQuiz(activeQuestions[0].lecture_id)}
                className="gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retake Quiz
              </Button>
              <Button
                onClick={() => setQuizMode(false)}
                className="bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] text-xs font-bold px-5 cursor-pointer"
              >
                Back to Quizzes
              </Button>
            </div>
          </div>
        </div>
      );
    }

    const q = activeQuestions[currentQIndex];
    const hasAnswered = isSubmitted;
    const progressPct = Math.round(((currentQIndex + 1) / activeQuestions.length) * 100);

    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto min-h-[calc(100vh-theme(spacing.16))] flex flex-col">
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setQuizMode(false)} className="cursor-pointer">
              <ChevronLeft size={16} className="mr-1" /> Exit Quiz
            </Button>
            <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3.5 h-3.5 text-[#D89A06]" />
                {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
              </span>
              <span className="font-bold text-foreground">
                {currentQIndex + 1} / {activeQuestions.length}
              </span>
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-[#00004E] dark:bg-[#D89A06] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-12 space-y-6">
          <div className="text-xl md:text-2xl font-bold leading-relaxed text-foreground prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {q.question}
            </ReactMarkdown>
          </div>

          <div className="space-y-3">
            {(!q.type || q.type === 'mcq') &&
              q.options?.map((opt: any) => {
                const isCorrectOpt = opt.label === q.correct_option;
                const isPicked = opt.label === userAnswer;

                return (
                  <button
                    key={opt.label}
                    type="button"
                    disabled={hasAnswered}
                    onClick={() => handleOptionSelect(opt.label)}
                    className={cn(
                      'w-full rounded-xl border-2 p-4 text-left flex items-start gap-3 transition-all cursor-pointer disabled:cursor-default',
                      !hasAnswered &&
                        'border-border bg-card hover:bg-muted/40 hover:border-[#00004E]/40 dark:hover:border-[#D89A06]/40',
                      hasAnswered &&
                        isCorrectOpt &&
                        'border-emerald-500/60 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
                      hasAnswered &&
                        isPicked &&
                        !isCorrectOpt &&
                        'border-rose-500/60 bg-rose-500/10 text-rose-800 dark:text-rose-200',
                      hasAnswered && !isPicked && !isCorrectOpt && 'border-border/60 bg-card opacity-55'
                    )}
                  >
                    <kbd className="w-6 h-6 rounded-md border border-border bg-muted/60 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 text-foreground">
                      {opt.label}
                    </kbd>
                    <div className="flex-1 text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-0">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {opt.text}
                      </ReactMarkdown>
                    </div>
                    {hasAnswered && isCorrectOpt && (
                      <CheckCircle className="text-emerald-500 ml-auto shrink-0 mt-0.5" size={18} />
                    )}
                    {hasAnswered && isPicked && !isCorrectOpt && (
                      <XCircle className="text-rose-500 ml-auto shrink-0 mt-0.5" size={18} />
                    )}
                  </button>
                );
              })}

            {q.type === 'fill_in' && (
              <div className="space-y-4">
                <Input
                  placeholder="Type your answer here..."
                  value={userAnswer}
                  onChange={(e) => !hasAnswered && setUserAnswer(e.target.value)}
                  disabled={hasAnswered}
                  className="text-base p-5 bg-card"
                  onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                />
                {!hasAnswered ? (
                  <Button
                    onClick={handleTextSubmit}
                    disabled={!userAnswer.trim()}
                    className="w-full font-bold cursor-pointer"
                  >
                    Submit Answer
                  </Button>
                ) : (
                  <div
                    className={cn(
                      'p-4 rounded-xl border-2 text-sm',
                      userAnswer.trim().toLowerCase() ===
                        String(q.correct_option || '').trim().toLowerCase()
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                        : 'border-rose-500/50 bg-rose-500/10 text-rose-800 dark:text-rose-200'
                    )}
                  >
                    <div className="font-bold mb-1">Correct Answer:</div>
                    <div>{q.correct_option}</div>
                  </div>
                )}
              </div>
            )}

            {q.type === 'theory' && (
              <div className="space-y-4">
                <Textarea
                  placeholder="Write your structured response here..."
                  value={userAnswer}
                  onChange={(e) => !hasAnswered && setUserAnswer(e.target.value)}
                  disabled={hasAnswered}
                  className="min-h-[150px] text-sm p-4 bg-card"
                />
                {!hasAnswered ? (
                  <Button
                    onClick={handleTextSubmit}
                    disabled={!userAnswer.trim()}
                    className="w-full font-bold cursor-pointer"
                  >
                    Submit Answer
                  </Button>
                ) : (
                  <div className="p-5 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-primary mb-1.5">
                        Model Solution
                      </h4>
                      <p className="text-sm text-foreground/90 leading-relaxed">{q.correct_option}</p>
                    </div>

                    {theorySelfGrade === null ? (
                      <div className="space-y-2.5 pt-2 border-t border-border/60">
                        <p className="text-xs font-bold text-foreground">
                          Self-Check: Did your answer cover the key points?
                        </p>
                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleTheoryGrade(true)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                          >
                            Yes, Covered It
                          </Button>
                          <Button
                            onClick={() => handleTheoryGrade(false)}
                            variant="destructive"
                            className="flex-1 cursor-pointer"
                          >
                            Needs Review
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          'font-bold text-xs flex items-center gap-2',
                          theorySelfGrade
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        )}
                      >
                        {theorySelfGrade ? <CheckCircle size={18} /> : <XCircle size={18} />}
                        {theorySelfGrade ? 'Marked Correct' : 'Marked for Review'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {hasAnswered && (
            <div className="p-4 rounded-xl bg-muted/30 border border-border/80 space-y-1">
              <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-primary">
                Explanation
              </h4>
              <div className="text-sm text-foreground/85 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {q.explanation || 'Review the corresponding lecture slide for full context.'}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 pt-4 border-t border-border flex justify-end">
          <Button
            size="lg"
            disabled={!hasAnswered || (q.type === 'theory' && theorySelfGrade === null)}
            onClick={() => void nextQuestion()}
            className="w-full sm:w-auto font-bold bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] cursor-pointer"
          >
            {currentQIndex < activeQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2 text-xs">
            <Link
              href="/dashboard/courses"
              className="font-medium text-muted-foreground hover:text-primary transition-colors flex items-center"
            >
              <ChevronLeft size={15} className="mr-0.5" /> Courses
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link
              href={`/dashboard/courses/${courseId}`}
              className="font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Course Workspace
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold text-foreground">Quizzes</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Practice Quizzes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Timed comprehension checks generated directly from each lecture deck.
          </p>
        </div>
      </div>

      {lectures.length === 0 ? (
        <div className="rounded-2xl border border-border/80 bg-card p-8 md:p-12 text-center space-y-5 shadow-xs flex flex-col items-center">
          <CollegiateLibraryIllustration className="w-56 h-36" />
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-lg font-bold text-foreground">No Lecture Decks Uploaded Yet</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Upload course lecture slides first to generate practice quizzes grounded in your syllabus.
            </p>
          </div>
          <Link
            href={`/dashboard/courses/${courseId}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] px-5 py-2.5 text-xs font-bold shadow-xs"
          >
            Go to Course Workspace
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lectures.map((lec) => {
            const lecQs = quizzes.filter((q) => q.lecture_id === lec.id);

            return (
              <div
                key={lec.id}
                className="p-6 rounded-2xl border border-border/80 bg-card flex flex-col justify-between shadow-xs hover:border-[#D89A06]/50 transition-colors"
              >
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#D89A06] uppercase tracking-wider">
                    Week {lec.week || 1}
                  </span>
                  <h3 className="font-bold text-base text-foreground mt-1 mb-4 truncate">
                    {lec.title}
                  </h3>
                </div>

                <div className="mt-auto space-y-4 pt-3 border-t border-border/60">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="font-medium text-muted-foreground">Questions Ready</span>
                    <span className="font-mono font-bold text-foreground">{lecQs.length}</span>
                  </div>

                  {lecQs.length === 0 ? (
                    <Button
                      className="w-full text-xs font-bold cursor-pointer"
                      variant="secondary"
                      onClick={() => handleGenerate(lec.id)}
                      disabled={generatingFor === lec.id}
                    >
                      {generatingFor === lec.id ? (
                        <>
                          <Loader2 size={15} className="mr-2 animate-spin" /> Generating...
                        </>
                      ) : (
                        <>
                          <PlayCircle size={15} className="mr-2 text-[#D89A06]" /> Generate Quiz
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      className="w-full text-xs font-bold bg-[#00004E] text-white hover:bg-[#00003E] dark:bg-[#D89A06] dark:text-[#00004E] cursor-pointer"
                      onClick={() => startQuiz(lec.id)}
                    >
                      Start Quiz ({lecQs.length})
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
