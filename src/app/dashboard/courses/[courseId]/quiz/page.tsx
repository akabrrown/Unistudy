'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { generateQuiz } from '@/app/actions/quizzes'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Loader2, PlayCircle, CheckCircle, XCircle } from 'lucide-react'

export default function QuizPage() {
  const params = useParams()
  const courseId = params.courseId as string
  
  const [lectures, setLectures] = useState<any[]>([])
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)

  // Quiz mode state
  const [quizMode, setQuizMode] = useState(false)
  const [activeQuestions, setActiveQuestions] = useState<any[]>([])
  const [currentQIndex, setCurrentQIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [showResults, setShowResults] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [courseId])

  async function fetchData() {
    setLoading(true)
    let { data: lecs } = await supabase.from('lectures').select('id, title, week').eq('course_id', courseId).order('week', { ascending: true })
    
    if (!lecs || lecs.length === 0) {
      lecs = [{ id: '00000000-0000-0000-0000-000000000001', title: 'Lecture 14: DNA Replication', week: 8 }]
    }

    setLectures(lecs)
    const lecIds = lecs.map((l: any) => l.id)
    
    // Fetch quizzes using Server Action to bypass RLS
    const { getQuizzes } = await import('@/app/actions/quizzes')
    const res = await getQuizzes(lecIds)
    if (res.data) setQuizzes(res.data)
    
    setLoading(false)
  }

  async function handleGenerate(lectureId: string) {
    setGeneratingFor(lectureId)
    const res = await generateQuiz(lectureId, 5) // Generate 5 questions
    if (res.error) {
      alert(res.error)
    } else {
      await fetchData()
    }
    setGeneratingFor(null)
  }

  function startQuiz(lectureId: string) {
    const lectureQs = quizzes.filter(q => q.lecture_id === lectureId)
    if (lectureQs.length === 0) {
      alert("No questions generated for this lecture!")
      return
    }

    setActiveQuestions(lectureQs)
    setCurrentQIndex(0)
    setSelectedOption(null)
    setScore(0)
    setShowResults(false)
    setQuizMode(true)
  }

  function handleOptionSelect(label: string) {
    if (selectedOption) return // prevent changing answer
    setSelectedOption(label)
    
    if (label === activeQuestions[currentQIndex].correct_option) {
      setScore(s => s + 1)
    }
  }

  async function nextQuestion() {
    if (currentQIndex < activeQuestions.length - 1) {
      setCurrentQIndex(prev => prev + 1)
      setSelectedOption(null)
    } else {
      // Finished Quiz
      const percentage = Math.round((score / activeQuestions.length) * 100)
      const { submitQuizAttempt } = await import('@/app/actions/quizzes')
      // Assume time taken is hardcoded for now, e.g. 120s
      await submitQuizAttempt(activeQuestions[0].lecture_id, percentage, activeQuestions.length, 120)
      
      setShowResults(true)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-theme(spacing.16))] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (quizMode) {
    if (showResults) {
      const percentage = Math.round((score / activeQuestions.length) * 100)
      return (
        <div className="p-8 max-w-2xl mx-auto h-[calc(100vh-theme(spacing.16))] flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <span className="text-4xl font-bold text-primary">{percentage}%</span>
          </div>
          <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
          <p className="text-muted-foreground mb-8">You scored {score} out of {activeQuestions.length}.</p>
          <Button size="lg" onClick={() => setQuizMode(false)} className="font-bold">
            Back to Quizzes
          </Button>
        </div>
      )
    }

    const q = activeQuestions[currentQIndex]
    const hasAnswered = selectedOption !== null

    return (
      <div className="p-8 max-w-3xl mx-auto h-[calc(100vh-theme(spacing.16))] flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => setQuizMode(false)}>
            <ChevronLeft size={16} className="mr-2" /> Exit Quiz
          </Button>
          <div className="text-sm font-semibold text-muted-foreground">
            Question {currentQIndex + 1} of {activeQuestions.length}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-20">
          <h2 className="text-2xl font-bold leading-relaxed mb-8">{q.question}</h2>
          
          <div className="space-y-4">
            {q.options.map((opt: any) => {
              let btnClass = "w-full justify-start h-auto p-4 text-left border-2 bg-card hover:bg-muted/50 whitespace-normal"
              let icon = null

              if (hasAnswered) {
                if (opt.label === q.correct_option) {
                  btnClass = "w-full justify-start h-auto p-4 text-left border-2 border-green-500 bg-green-50 text-green-900 whitespace-normal"
                  icon = <CheckCircle className="text-green-500 ml-auto flex-shrink-0" size={20} />
                } else if (opt.label === selectedOption) {
                  btnClass = "w-full justify-start h-auto p-4 text-left border-2 border-red-500 bg-red-50 text-red-900 whitespace-normal"
                  icon = <XCircle className="text-red-500 ml-auto flex-shrink-0" size={20} />
                } else {
                  btnClass = "w-full justify-start h-auto p-4 text-left border-2 border-border bg-card opacity-50 whitespace-normal"
                }
              }

              return (
                <Button 
                  key={opt.label} 
                  variant="outline" 
                  className={btnClass}
                  onClick={() => handleOptionSelect(opt.label)}
                >
                  <span className="w-6 font-bold flex-shrink-0 text-muted-foreground">{opt.label}.</span>
                  <span className="flex-1">{opt.text}</span>
                  {icon}
                </Button>
              )
            })}
          </div>

          {hasAnswered && (
            <div className="mt-8 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <h4 className="font-bold text-primary mb-2">Explanation</h4>
              <p className="text-sm text-foreground/80 leading-relaxed">{q.explanation}</p>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 pt-6 border-t border-border flex justify-end">
          <Button size="lg" disabled={!hasAnswered} onClick={nextQuestion} className="w-full sm:w-auto font-bold">
            {currentQIndex < activeQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard/courses" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center">
              <ChevronLeft size={16} className="mr-1" /> Courses
            </Link>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-sm font-medium text-foreground">Quizzes</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Practice Quizzes</h1>
          <p className="text-muted-foreground mt-1">Test your knowledge with AI-generated multiple choice questions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lectures.map(lec => {
          const lecQs = quizzes.filter(q => q.lecture_id === lec.id)
          
          return (
            <div key={lec.id} className="p-6 rounded-xl border border-border bg-card flex flex-col">
              <h3 className="font-bold text-lg mb-1 truncate">{lec.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">Week {lec.week}</p>
              
              <div className="mt-auto space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Total Questions:</span>
                  <span className="font-bold">{lecQs.length}</span>
                </div>
                
                {lecQs.length === 0 ? (
                  <Button 
                    className="w-full" 
                    variant="secondary"
                    onClick={() => handleGenerate(lec.id)}
                    disabled={generatingFor === lec.id}
                  >
                    {generatingFor === lec.id ? (
                      <><Loader2 size={16} className="mr-2 animate-spin" /> Generating...</>
                    ) : (
                      <><PlayCircle size={16} className="mr-2" /> Generate Quiz</>
                    )}
                  </Button>
                ) : (
                  <Button 
                    className="w-full font-bold" 
                    onClick={() => startQuiz(lec.id)}
                  >
                    Start Quiz
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
