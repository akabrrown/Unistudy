'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Clock, Check, Loader2, Save, UploadCloud } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function ExamAttempt() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const attemptId = searchParams.get('attemptId')
  
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(120 * 60) // 120 mins in seconds
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!attemptId) {
      router.push(`/dashboard/past-papers/${params.id}`)
      return
    }

    const fetchExam = async () => {
      // Fetch questions
      const { data: qData } = await supabase
        .from('past_paper_questions')
        .select('*')
        .eq('past_paper_id', params.id)
        .order('question_number', { ascending: true })
        
      if (qData) {
        let sortedQs = [...qData].sort((a, b) => 
          a.question_number.localeCompare(b.question_number, undefined, { numeric: true })
        )
        // Pre-process MCQs to assign 1 mark if missing
        sortedQs = sortedQs.map(q => {
          const isMcq = /\\b[A-E][\\.\\)]\\s/i.test(q.text_content) || /\\n\\s*[A-E][\\.\\)]\\s/i.test(q.text_content)
          if (isMcq && (!q.marks_available || q.marks_available === 0)) {
            return { ...q, marks_available: 1, isMcq: true }
          }
          return { ...q, isMcq }
        })
        setQuestions(sortedQs)
      }
      
      // Fetch attempt details to calculate time
      const { data: aData } = await supabase
        .from('past_paper_attempts')
        .select('started_at, time_limit_minutes')
        .eq('id', attemptId)
        .single()
        
      if (aData && aData.started_at) {
        const started = new Date(aData.started_at).getTime()
        const now = new Date().getTime()
        const elapsedSeconds = Math.floor((now - started) / 1000)
        const limitSeconds = (aData.time_limit_minutes || 120) * 60
        setTimeLeft(Math.max(0, limitSeconds - elapsedSeconds))
      }
    }
    
    fetchExam()
  }, [params.id, attemptId])

  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit() // Auto-submit when time is up
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleAnswerChange = (qId: string, text: string) => {
    setAnswers(prev => ({ ...prev, [qId]: text }))
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    
    // Save answers
    const inserts = questions.map(q => ({
      attempt_id: attemptId,
      question_id: q.id,
      user_answer_text: answers[q.id] || '',
      marks_awarded: null
    }))
    
    await supabase.from('past_paper_answers').insert(inserts)
    
    // Mark attempt completed
    await supabase.from('past_paper_attempts').update({
      completed_at: new Date().toISOString()
    }).eq('id', attemptId)

    router.push(`/dashboard/past-papers/results/${attemptId}`)
  }

  const mcqQuestions = questions.filter(q => q.isMcq)
  const theoryQuestions = questions.filter(q => !q.isMcq)

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Sticky Header Timer */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border py-4 -mx-4 px-4 sm:mx-0 sm:px-0 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Exam in Progress</h2>
          <p className="text-sm text-muted-foreground">Keep your eyes on the clock.</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-lg font-bold shadow-sm ${timeLeft < 300 ? 'bg-destructive/10 text-destructive border border-destructive/20 animate-pulse' : 'bg-muted border border-border'}`}>
          <Clock className="w-5 h-5" />
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="space-y-8">
        {mcqQuestions.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-foreground border-b border-border pb-2">Multiple Choice Questions</h3>
            {mcqQuestions.map((q, idx) => (
              <Card key={q.id} className="border-border shadow-sm">
                <CardHeader className="bg-muted/10 border-b border-border pb-4">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">Question {q.question_number}</CardTitle>
                    <span className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
                      {q.marks_available} Marks
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none mb-6 [&_table]:border-collapse [&_table]:w-full [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:p-2 [&_td]:border [&_td]:border-border [&_td]:p-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {q.text_content}
                    </ReactMarkdown>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Your Answer
                    </label>
                    <Textarea 
                      placeholder="Type your answer here (e.g. A, B, C, D)..."
                      className="min-h-[60px] font-mono text-sm resize-y"
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {theoryQuestions.length > 0 && (
          <div className="space-y-6 mt-12">
            <h3 className="text-xl font-bold text-foreground border-b border-border pb-2">Theory & Essay Questions</h3>
            {theoryQuestions.map((q, idx) => (
              <Card key={q.id} className="border-border shadow-sm">
                <CardHeader className="bg-muted/10 border-b border-border pb-4">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">Question {q.question_number}</CardTitle>
                    <span className="text-sm font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
                      {q.marks_available} Marks
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none mb-6 [&_table]:border-collapse [&_table]:w-full [&_table]:border [&_table]:border-border [&_th]:border [&_th]:border-border [&_th]:bg-muted/50 [&_th]:p-2 [&_td]:border [&_td]:border-border [&_td]:p-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {q.text_content}
                    </ReactMarkdown>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Your Answer
                      <Button variant="ghost" size="sm" className="h-8 gap-2 text-xs">
                        <UploadCloud className="w-3 h-3" /> Upload Handwriting
                      </Button>
                    </label>
                    <Textarea 
                      placeholder="Type your detailed answer here..."
                      className="min-h-[150px] font-mono text-sm resize-y"
                      value={answers[q.id] || ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-6 border-t border-border mt-10">
        <Button onClick={handleSubmit} disabled={submitting || questions.length === 0} size="lg" className="px-8 shadow-lg shadow-primary/20">
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : <><Check className="w-4 h-4 mr-2" /> Submit Exam</>}
        </Button>
      </div>
    </div>
  )
}
