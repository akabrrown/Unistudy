'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Award, Bot, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { isModelAnswerIncomplete } from '../../../../../../../shared/lib/pastPaperGrader'

interface GradedAnswerRow {
  id: string
  user_answer_text?: string | null
  marks_awarded: number | null
  feedback?: string | null
  model_answer?: string | null
  past_paper_questions: {
    question_number?: string | null
    text_content: string
    marks_available: number | null
  }
}

export default function ExamResults() {
  const params = useParams()
  const attemptId = params.attemptId as string
  const [answers, setAnswers] = useState<GradedAnswerRow[]>([])
  const [attempt, setAttempt] = useState<{
    past_papers?: {
      year?: number
      exam_type?: string
      course_id?: string
    } | null
  } | null>(null)
  const [grading, setGrading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [overallScore, setOverallScore] = useState(0)
  const [totalAvailable, setTotalAvailable] = useState(0)
  const [supabase] = useState(() => createClient())

  const runGradingAndPersist = useCallback(
    async (forceAll = false, fromEffect = false) => {
      if (!attemptId) return
      if (!fromEffect) {
        if (forceAll) {
          setRegenerating(true)
        } else {
          setGrading(true)
        }
      }

      try {
        const { data: attData } = await supabase
          .from('past_paper_attempts')
          .select('*, past_papers!past_paper_attempts_past_paper_id_fkey(*)')
          .eq('id', attemptId)
          .single()

        if (attData) setAttempt(attData)

        const { data: ansData } = await supabase
          .from('past_paper_answers')
          .select('*, past_paper_questions(*)')
          .eq('attempt_id', attemptId)
          .order('id', { ascending: true })

        if (!ansData) {
          return
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()

        const gradedAnswers: GradedAnswerRow[] = ansData.map((row) => ({
          ...(row as GradedAnswerRow),
        }))

        const needsGrading = gradedAnswers.filter(
          (a) =>
            forceAll ||
            a.marks_awarded === null ||
            isModelAnswerIncomplete(a.past_paper_questions?.text_content || '', a.model_answer)
        )

        if (needsGrading.length > 0) {
          const courseId = attData?.past_papers?.course_id
          let remainingToGrade = [...needsGrading]

          const applyResults = async (
            items: Array<{
              id: string
              marks_awarded: number
              feedback: string
              model_answer: string
            }>
          ) => {
            for (const gradedItem of items) {
              const ans = gradedAnswers.find((a) => a.id === gradedItem.id)
              if (!ans) continue
              ans.marks_awarded = gradedItem.marks_awarded
              ans.feedback = gradedItem.feedback
              ans.model_answer = gradedItem.model_answer

              await supabase
                .from('past_paper_answers')
                .update({
                  marks_awarded: ans.marks_awarded,
                  feedback: ans.feedback,
                  model_answer: ans.model_answer,
                })
                .eq('id', ans.id)
            }
          }

          const toPayload = (rows: GradedAnswerRow[]) =>
            rows.map((ans) => ({
              id: ans.id,
              question_content: ans.past_paper_questions?.text_content || '',
              marks_available: ans.past_paper_questions?.marks_available || 0,
              student_answer: ans.user_answer_text?.trim()
                ? ans.user_answer_text
                : '[No answer provided]',
            }))

          // 1. Primary: Express backend batch grader
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
              )
              if (res.ok) {
                const result = await res.json()
                if (result.success && Array.isArray(result.data)) {
                  await applyResults(result.data)
                }
              }
            } catch (e) {
              console.warn('[ExamResults] Backend grade-batch unavailable, using Next.js fallback:', e)
            }
          }

          // 2. Fallback / Repair: Next.js /api/ai/grade-past-paper for any remaining or incomplete questions
          remainingToGrade = gradedAnswers.filter(
            (a) =>
              a.marks_awarded === null ||
              isModelAnswerIncomplete(a.past_paper_questions?.text_content || '', a.model_answer)
          )

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
              })
              if (localRes.ok) {
                const localJson = await localRes.json()
                if (localJson.success && Array.isArray(localJson.data)) {
                  await applyResults(localJson.data)
                }
              }
            } catch (localErr) {
              console.error('[ExamResults] Local grade-past-paper fallback failed:', localErr)
              toast.error('Some model answers could not be generated. Click Re-grade All to retry.')
            }
          }
        }

        let totalAwarded = 0
        let totalAvail = 0
        for (const ans of gradedAnswers) {
          totalAvail += ans.past_paper_questions?.marks_available || 0
          totalAwarded += ans.marks_awarded || 0
        }

        setAnswers(gradedAnswers)
        setTotalAvailable(totalAvail)
        setOverallScore(totalAwarded)

        if (totalAvail > 0 && attData) {
          const pct = (totalAwarded / totalAvail) * 100
          await supabase
            .from('past_paper_attempts')
            .update({ score_percentage: pct })
            .eq('id', attemptId)

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
            ).catch((e) => console.error('Failed to generate drills', e))
          }
        }
      } finally {
        setGrading(false)
        setRegenerating(false)
      }
    },
    [attemptId, supabase]
  )

  useEffect(() => {
    if (!attemptId) return
    const timer = setTimeout(() => {
      void runGradingAndPersist(false, true)
    }, 0)
    return () => clearTimeout(timer)
  }, [attemptId, runGradingAndPersist])

  const percentage = totalAvailable > 0 ? Math.round((overallScore / totalAvailable) * 100) : 0
  const hasAnyMissingAnswer = answers.some((a) =>
    isModelAnswerIncomplete(a.past_paper_questions?.text_content || '', a.model_answer)
  )

  if (grading) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24 space-y-6">
        <div className="relative w-24 h-24 mx-auto">
          <div className="absolute inset-0 border-4 border-muted rounded-full"></div>
          <div className="absolute inset-0 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
          <Bot className="absolute inset-0 m-auto w-8 h-8 text-purple-500 animate-pulse" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">AI is grading your exam...</h2>
          <p className="text-muted-foreground">
            The AI examiner is grading every question and preparing complete model solutions for all parts.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Report Card Header */}
      <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-br from-background to-muted relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Award className="w-48 h-48" />
        </div>
        <CardContent className="p-8 sm:p-12">
          <div className="flex flex-col md:flex-row items-center gap-8 justify-between relative z-10">
            <div className="space-y-4 text-center md:text-left">
              <h1 className="text-4xl font-black tracking-tight">Exam Results</h1>
              <p className="text-lg text-muted-foreground max-w-md">
                You completed the {attempt?.past_papers?.year} {attempt?.past_papers?.exam_type} exam. Complete solutions are included for every question below.
              </p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
                <Link href="/dashboard/past-papers">
                  <Button variant="outline">Back to Bank</Button>
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => runGradingAndPersist(hasAnyMissingAnswer ? false : true)}
                  disabled={regenerating}
                  className="gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                  {regenerating
                    ? 'Generating Answers...'
                    : hasAnyMissingAnswer
                      ? 'Complete Missing Answers'
                      : 'Re-grade All'}
                </Button>
                {attempt?.past_papers?.course_id && (
                  <Link href={`/dashboard/courses/${attempt.past_papers.course_id}/past-papers`}>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20 border-none">
                      <RefreshCw className="w-4 h-4 mr-2" /> Start Weakness Drill
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Score Circle */}
            <div className="relative flex items-center justify-center">
              <svg className="w-40 h-40 transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-muted"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray="440"
                  strokeDashoffset={440 - (440 * percentage) / 100}
                  className={`${
                    percentage >= 70
                      ? 'text-green-500'
                      : percentage >= 40
                        ? 'text-yellow-500'
                        : 'text-destructive'
                  } transition-all duration-1000 ease-out`}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-black">{percentage}%</span>
                <span className="text-sm font-semibold text-muted-foreground">
                  {overallScore} / {totalAvailable}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Feedback */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="w-6 h-6 text-purple-500" /> AI Examiner Feedback
        </h3>

        {answers.map((ans, idx) => {
          const q = ans.past_paper_questions
          const marksAwarded = ans.marks_awarded || 0
          const maxMarks = q.marks_available || 0
          const isPerfect = maxMarks > 0 && marksAwarded === maxMarks
          const isZero = marksAwarded === 0

          return (
            <Card
              key={ans.id}
              className={`border-l-4 ${
                isPerfect
                  ? 'border-l-green-500'
                  : isZero
                    ? 'border-l-destructive'
                    : 'border-l-yellow-500'
              }`}
            >
              <CardHeader className="pb-3 border-b border-border/50 bg-muted/10">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Question {q.question_number || idx + 1}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                      {q.text_content}
                    </p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full font-bold text-sm shrink-0 ${
                      isPerfect
                        ? 'bg-green-500/10 text-green-600'
                        : isZero
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-yellow-500/10 text-yellow-600'
                    }`}
                  >
                    {marksAwarded} / {maxMarks}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-1 uppercase tracking-wider text-[10px]">
                    Your Answer
                  </h4>
                  <div className="bg-background border border-border p-3 rounded font-mono text-muted-foreground whitespace-pre-wrap">
                    {ans.user_answer_text?.trim() || (
                      <span className="italic opacity-60">No answer provided.</span>
                    )}
                  </div>
                </div>

                {ans.feedback && (
                  <div className="bg-purple-500/5 border border-purple-500/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-600 flex items-center gap-2 mb-2">
                      <Bot className="w-4 h-4" /> Examiner Feedback &amp; Mark Breakdown
                    </h4>
                    <div className="text-foreground/90 leading-relaxed text-sm prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {ans.feedback}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {ans.model_answer?.trim() ? (
                  <div className="bg-green-500/5 border border-green-500/20 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-600 flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4" /> Full Model Answer &amp; Complete Solution
                    </h4>
                    <div className="text-foreground/90 leading-relaxed text-sm prose prose-sm dark:prose-invert max-w-none font-sans">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {ans.model_answer}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/40 border border-border/50 p-3 rounded-lg text-xs text-muted-foreground flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 opacity-50" />
                      Model solution is pending for this question.
                    </span>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => runGradingAndPersist(false)}
                      disabled={regenerating}
                    >
                      Generate Answer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
