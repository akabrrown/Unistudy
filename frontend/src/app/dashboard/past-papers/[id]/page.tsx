'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Clock, FileText, Bot, FileQuestion, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function PastPaperDetails() {
  const params = useParams()
  const router = useRouter()
  const [paper, setPaper] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true)
      
      const { data: pData } = await supabase
        .from('past_papers')
        .select('*, courses(course_code, title)')
        .eq('id', params.id)
        .single()
        
      if (pData) {
        setPaper(pData)
        
        // Fetch questions
        const { data: qData } = await supabase
          .from('past_paper_questions')
          .select('*')
          .eq('past_paper_id', pData.id)
          .order('question_number', { ascending: true })
          
        if (qData) {
          setQuestions(qData)
        }
      }
      
      setLoading(false)
    }
    
    if (params.id) {
      fetchDetails()
    }
  }, [params.id])

  if (loading) {
    return <div className="animate-pulse space-y-6">
      <div className="h-8 w-1/4 bg-muted/50 rounded"></div>
      <div className="h-32 bg-muted/50 rounded-xl"></div>
      <div className="h-64 bg-muted/50 rounded-xl"></div>
    </div>
  }

  if (!paper) {
    return <div className="text-center py-12">Past paper not found.</div>
  }

  const startAttempt = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data, error } = await supabase
      .from('past_paper_attempts')
      .insert({
        past_paper_id: paper.id,
        user_id: session.user.id,
        time_limit_minutes: 120 // Default 2 hrs, could be dynamic
      })
      .select()
      .single()

    if (!error && data) {
      router.push(`/dashboard/past-papers/${paper.id}/attempt?attemptId=${data.id}`)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link href="/dashboard/past-papers">
        <Button variant="ghost" className="gap-2 -ml-4 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Bank
        </Button>
      </Link>

      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-foreground">
              {paper.courses?.course_code || 'Unknown Course'} 
            </h1>
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              {paper.year}
            </span>
            <span className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm font-medium capitalize">
              {paper.exam_type}
            </span>
          </div>
          <p className="text-muted-foreground">{paper.courses?.course_name}</p>
        </div>
        <Button onClick={startAttempt} size="lg" className="gap-2 shadow-lg shadow-primary/20">
          Start Attempt <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-primary" /> Questions ({questions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paper.status === 'processing' ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                <Bot className="w-8 h-8 mb-3 animate-pulse text-purple-500" />
                <p>AI is currently extracting questions from the PDF...</p>
                <p className="text-sm mt-1 opacity-70">This usually takes about 30-60 seconds.</p>
              </div>
            ) : questions.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center bg-muted/20 rounded-lg border border-dashed border-border">
                No questions found. The AI might have failed to parse this paper.
              </p>
            ) : (
              <div className="space-y-4">
                {questions.map((q) => (
                  <div key={q.id} className="p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-foreground">Question {q.question_number}</span>
                      <span className="text-sm font-medium bg-muted px-2 py-1 rounded text-muted-foreground">
                        {q.marks_available} marks
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{q.text_content}</p>
                    {q.extracted_topic && (
                      <div className="mt-3 inline-block text-[10px] uppercase tracking-wider font-semibold text-purple-500 bg-purple-500/10 px-2 py-1 rounded">
                        {q.extracted_topic}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" /> Exam Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time Limit</span>
                <span className="font-medium">120 Minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Marks</span>
                <span className="font-medium">
                  {questions.reduce((sum, q) => sum + (q.marks_available || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uploaded</span>
                <span className="font-medium">{new Date(paper.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
