'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Timer, Camera, Upload, Send, BrainCircuit, CheckCircle2 } from 'lucide-react'

// Mock Data
const MOCK_QUESTIONS = [
  { id: 'q1', number: '1a', content: 'Define the First Law of Thermodynamics.', marks: 3 },
  { id: 'q2', number: '1b', content: 'Calculate the work done when a gas expands from 2L to 5L at a constant pressure of 1 atm.', marks: 5 }
]

export default function PastPaperAttemptPage() {
  const [setupDone, setSetupDone] = useState(false)
  const [timeLimit, setTimeLimit] = useState(60)
  const [timeLeft, setTimeLeft] = useState(60 * 60)
  
  const [answers, setAnswers] = useState<Record<string, { text: string, image: File | null }>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGraded, setIsGraded] = useState(false)

  // Timer logic
  useEffect(() => {
    if (!setupDone || isGraded) return
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [setupDone, isGraded])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleAnswerChange = (qId: string, text: string) => {
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], text } }))
  }

  const handleImageChange = (qId: string, file: File | null) => {
    setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], image: file } }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    // Simulate AI grading delay
    await new Promise(r => setTimeout(r, 2000))
    setIsSubmitting(false)
    setIsGraded(true)
  }

  if (!setupDone) {
    return (
      <div className="max-w-md mx-auto py-20">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Attempt Past Paper</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Limit (minutes)</label>
              <Input 
                type="number" 
                value={timeLimit} 
                onChange={e => setTimeLimit(parseInt(e.target.value) || 60)} 
              />
            </div>
            <Button 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => {
                setTimeLeft(timeLimit * 60)
                setSetupDone(true)
              }}
            >
              Start Attempt
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isGraded) {
    return (
      <div className="max-w-4xl mx-auto py-12 space-y-8">
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h1 className="text-3xl font-bold">Paper Graded!</h1>
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-4 border-purple-500 bg-purple-500/10">
            <span className="text-4xl font-bold text-purple-600">75%</span>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Feedback Breakdown</h2>
          {MOCK_QUESTIONS.map(q => (
            <Card key={q.id} className="border-border shadow-sm overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b border-border flex justify-between items-center">
                <span className="font-medium text-sm">Question {q.number}</span>
                <span className="text-sm font-bold text-purple-600">2 / {q.marks} marks</span>
              </div>
              <CardContent className="p-4 space-y-4">
                <p className="text-sm text-foreground">{q.content}</p>
                <div className="bg-muted/30 p-3 rounded-md border border-border">
                  <span className="text-xs text-muted-foreground block mb-1">Your Answer:</span>
                  <p className="text-sm">{answers[q.id]?.text || '(No text provided)'}</p>
                  {answers[q.id]?.image && <span className="text-xs text-blue-500 block mt-2">📎 Handwritten image attached</span>}
                </div>
                <div className="bg-blue-500/5 border border-blue-500/20 p-3 rounded-md">
                  <span className="text-xs text-blue-600 font-bold uppercase tracking-wider block mb-1">Examiner Feedback</span>
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    Candidate identified the core concept [1 mark] but failed to expand on the implications [0 marks].
                  </p>
                </div>
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="gap-2 w-full justify-start text-muted-foreground hover:text-foreground">
                    <BrainCircuit className="w-4 h-4" />
                    Discuss this marking...
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Sticky Header */}
      <div className="sticky top-4 z-50 bg-card/80 backdrop-blur-md border border-border p-4 rounded-xl shadow-sm flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold ${timeLeft < 300 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground'}`}>
            <Timer className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
          <span className="text-sm font-medium text-muted-foreground">Attempt in progress...</span>
        </div>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
        >
          {isSubmitting ? <BrainCircuit className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {isSubmitting ? 'AI Grading...' : 'Submit Paper'}
        </Button>
      </div>

      <div className="space-y-8">
        {MOCK_QUESTIONS.map((q) => (
          <Card key={q.id} className="border-border shadow-sm">
            <CardHeader className="bg-muted/30 border-b border-border py-4">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <span className="bg-background border border-border px-2 py-1 rounded-md font-bold text-sm h-fit">
                    Q{q.number}
                  </span>
                  <p className="text-foreground leading-relaxed">{q.content}</p>
                </div>
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap ml-4">
                  [{q.marks} marks]
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <Textarea 
                placeholder="Type your answer here..."
                className="min-h-[120px] resize-y bg-background border-border text-sm"
                value={answers[q.id]?.text || ''}
                onChange={e => handleAnswerChange(q.id, e.target.value)}
              />
              
              <div className="flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={e => handleImageChange(q.id, e.target.files?.[0] || null)}
                    />
                    <Button type="button" variant="outline" size="sm" className="gap-2 pointer-events-none">
                      <Camera className="w-4 h-4" />
                      Scan Handwriting
                    </Button>
                  </div>
                  {answers[q.id]?.image && (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Image attached
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">Gemini Vision will read handwritten answers automatically.</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
