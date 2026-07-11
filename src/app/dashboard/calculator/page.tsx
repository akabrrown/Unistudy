'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Calculator, Send, Loader2, Sparkles, BrainCircuit } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

export default function CalculatorPage() {
  const [problem, setProblem] = useState('')
  const [isComputing, setIsComputing] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  const endRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when result updates
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [result])

  async function handleSolve() {
    if (!problem.trim()) return
    
    setIsComputing(true)
    setResult('')
    setError(null)
    
    try {
      const res = await fetch('/api/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem, subject: 'Mathematics', level: 'Undergraduate' })
      })
      
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || 'Failed to connect to AI Calculator')
      }
      
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) throw new Error("No readable stream")

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            if (dataStr === '[DONE]') break
            try {
              const data = JSON.parse(dataStr)
              setResult(prev => prev + data.text)
            } catch (e) {
              console.error("Error parsing stream JSON", e)
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message)
    } finally {
      setIsComputing(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto h-[calc(100vh-theme(spacing.16))] flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="text-primary" /> AI Math Calculator
        </h1>
        <p className="text-muted-foreground mt-1">Get step-by-step solutions for algebra, calculus, and physics problems.</p>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col gap-6">
        {/* Output Panel */}
        <div className="flex-1 bg-card border border-border rounded-xl shadow-sm overflow-y-auto p-6 relative">
          {!result && !isComputing && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/60 p-8 text-center space-y-4">
              <BrainCircuit size={48} className="opacity-20" />
              <p className="font-medium text-lg">Enter a complex problem below to begin.</p>
              <p className="text-sm max-w-sm">Equations can be written normally (e.g. integrate x^2 from 0 to 5) and the AI will format them automatically.</p>
            </div>
          )}
          
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-medium">
              Error: {error}
            </div>
          )}

          {result && (
            <div className="prose prose-slate dark:prose-invert max-w-none w-full
              prose-headings:text-primary prose-headings:font-bold
              prose-strong:text-foreground
              prose-li:my-1
              prose-p:leading-relaxed"
            >
              <ReactMarkdown 
                remarkPlugins={[remarkMath]} 
                rehypePlugins={[rehypeKatex]}
              >
                {result}
              </ReactMarkdown>
            </div>
          )}
          
          {isComputing && !result && (
            <div className="flex items-center gap-2 text-primary font-medium p-4">
              <Loader2 className="animate-spin" size={20} />
              Analysing problem...
            </div>
          )}
          <div ref={endRef} />
        </div>
        
        {/* Input Panel */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-4 flex gap-4 items-end flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
          <textarea 
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
            placeholder="e.g., Find the derivative of f(x) = x^2 * sin(x)"
            className="min-h-[100px] resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent flex-1 text-base relative z-10 w-full outline-none p-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSolve()
              }
            }}
          />
          <div className="flex-shrink-0 relative z-10 pb-2">
            <Button 
              size="lg" 
              className="rounded-full w-12 h-12 p-0 shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95" 
              onClick={handleSolve}
              disabled={isComputing || !problem.trim()}
            >
              {isComputing ? <Loader2 className="animate-spin" /> : <Send size={20} className="ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
