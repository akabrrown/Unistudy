'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { BrainCircuit, CheckCircle2, XCircle, ArrowRight } from 'lucide-react'

// Mock Data
const MOCK_DRILL = {
  topic: 'Thermodynamics',
  difficulty: 'medium',
  problems: [
    { id: '1', q: 'What is the standard unit of entropy?', a: 'Joules per Kelvin (J/K)' },
    { id: '2', q: 'State the second law of thermodynamics.', a: 'The total entropy of an isolated system can never decrease over time.' },
    { id: '3', q: 'Calculate the change in entropy if 500J of heat is added at 250K.', a: '2 J/K' }
  ]
}

export default function WeaknessDrillPage() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [isGrading, setIsGrading] = useState(false)
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
  const [consecutive, setConsecutive] = useState(0)

  const currentProblem = MOCK_DRILL.problems[currentIndex]
  const isMastered = consecutive >= 3

  const handleCheck = async () => {
    setIsGrading(true)
    // Simulate AI grading
    await new Promise(r => setTimeout(r, 1500))
    setIsGrading(false)
    
    // Mock basic check for demo purposes
    const correct = answer.length > 5 // Very dummy mock check
    if (correct) {
      setResult('correct')
      setConsecutive(c => c + 1)
    } else {
      setResult('incorrect')
      setConsecutive(0)
    }
  }

  const handleNext = () => {
    setResult(null)
    setAnswer('')
    if (currentIndex < MOCK_DRILL.problems.length - 1) {
      setCurrentIndex(c => c + 1)
    } else {
      // Loop or fetch more if not mastered
      setCurrentIndex(0)
    }
  }

  if (isMastered) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-green-500/10 rounded-full mb-4">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold">Topic Mastered!</h1>
        <p className="text-muted-foreground">You got 3 consecutive correct answers in {MOCK_DRILL.topic}. This topic has been cleared from your weak areas.</p>
        <Button className="w-full bg-purple-600 hover:bg-purple-700">Back to Dashboard</Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-12 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Weakness Drill</h1>
          <p className="text-muted-foreground">Topic: {MOCK_DRILL.topic}</p>
        </div>
        <div className="flex gap-1">
          {[0,1,2].map(i => (
            <div key={i} className={`w-12 h-2 rounded-full ${i < consecutive ? 'bg-green-500' : 'bg-muted'}`} />
          ))}
        </div>
      </div>

      <Card className="border-border shadow-md">
        <CardHeader className="bg-muted/30 border-b border-border">
          <CardTitle className="text-lg flex justify-between items-center">
            Problem {currentIndex + 1}
            <span className="text-xs font-medium uppercase tracking-wider text-purple-500 bg-purple-500/10 px-2 py-1 rounded">Difficulty: {MOCK_DRILL.difficulty}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <p className="text-lg">{currentProblem.q}</p>
          
          <Textarea 
            placeholder="Type your answer or working out..."
            className="min-h-[150px] resize-none"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            disabled={result !== null || isGrading}
          />

          {!result ? (
            <Button 
              className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
              onClick={handleCheck}
              disabled={!answer.trim() || isGrading}
            >
              {isGrading ? <BrainCircuit className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isGrading ? 'AI Grading...' : 'Check Answer'}
            </Button>
          ) : (
            <div className={`p-4 rounded-xl border ${result === 'correct' ? 'bg-green-500/10 border-green-500/20' : 'bg-destructive/10 border-destructive/20'}`}>
              <div className="flex items-start gap-3">
                {result === 'correct' ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" /> : <XCircle className="w-5 h-5 text-destructive mt-0.5" />}
                <div>
                  <h4 className={`font-semibold ${result === 'correct' ? 'text-green-600' : 'text-destructive'}`}>
                    {result === 'correct' ? 'Correct!' : 'Not quite right.'}
                  </h4>
                  <p className="text-sm mt-2 text-foreground">
                    Model Answer: {currentProblem.a}
                  </p>
                </div>
              </div>
              <Button className="w-full mt-4 gap-2" onClick={handleNext}>
                Next Problem <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
