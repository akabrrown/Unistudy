'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Calculator, Send, Loader2, BrainCircuit, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { apiFetchRaw } from '@/lib/api/client'

import { GraphPlotter } from './GraphPlotter'
import { FormulaLibrary } from './FormulaLibrary'
import { ConstantsPanel } from './ConstantsPanel'
import { LineChart, Sigma, Atom } from 'lucide-react'

export function CalculatorPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'calculator' | 'graph' | 'formulas' | 'constants'>('calculator')
  const [problem, setProblem] = useState('')
  const [isComputing, setIsComputing] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [result])

  async function handleSolve() {
    if (!problem.trim()) return
    setIsComputing(true)
    setResult('')
    setError(null)
    try {
      const res = await apiFetchRaw('/ai/calculator', {
        method: 'POST',
        body: JSON.stringify({ problem, subject: 'Mathematics', level: 'Undergraduate' }),
      })
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No readable stream')
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n\n')) {
          if (!line.startsWith('data: ')) continue
          const dataStr = line.slice(6)
          if (dataStr === '[DONE]') break
          try {
            const data = JSON.parse(dataStr)
            setResult(prev => prev + data.text)
          } catch {
            // ignore malformed chunks
          }
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsComputing(false)
    }
  }

  const handleAppendToProblem = (text: string) => {
    setProblem(prev => prev ? prev + ' ' + text : text)
    setActiveTab('calculator')
  }

  return (
    <div className="absolute right-0 top-14 bottom-0 w-[400px] bg-card border-l border-border shadow-2xl flex flex-col z-[60] animate-in slide-in-from-right">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col px-4 py-3 border-b border-border bg-purple-500/5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Calculator size={15} className="text-purple-500" />
            Math Toolkit
          </h3>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X size={14} />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">Solve, plot, and lookup formulas</p>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-border px-2 pt-2 gap-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${activeTab === 'calculator' ? 'border-purple-500 text-purple-500' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Calculator size={13} />
          Solver
        </button>
        <button
          onClick={() => setActiveTab('graph')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${activeTab === 'graph' ? 'border-purple-500 text-purple-500' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <LineChart size={13} />
          Plotter
        </button>
        <button
          onClick={() => setActiveTab('formulas')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${activeTab === 'formulas' ? 'border-purple-500 text-purple-500' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Sigma size={13} />
          Formulas
        </button>
        <button
          onClick={() => setActiveTab('constants')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${activeTab === 'constants' ? 'border-purple-500 text-purple-500' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <Atom size={13} />
          Constants
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
        {activeTab === 'graph' && <GraphPlotter />}
        {activeTab === 'formulas' && <FormulaLibrary onCopy={handleAppendToProblem} />}
        {activeTab === 'constants' && <ConstantsPanel onCopy={handleAppendToProblem} />}
        
        {activeTab === 'calculator' && (
          <>
            {/* Output */}
            <div className="flex-1 bg-muted/30 border border-border rounded-xl overflow-y-auto p-4 relative">
              {!result && !isComputing && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/60 p-6 text-center gap-3">
                  <BrainCircuit size={36} className="opacity-20" />
                  <p className="font-medium text-sm">Enter a math problem below.</p>
                  <p className="text-xs">e.g. integrate x^2 from 0 to 5</p>
                </div>
              )}
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm font-medium">
                  {error}
                </div>
              )}
              {isComputing && !result && (
                <div className="flex items-center gap-2 text-purple-500 font-medium text-sm p-2">
                  <Loader2 size={16} className="animate-spin" />
                  Analysing problem…
                </div>
              )}
              {result && (
                <div className="prose prose-slate dark:prose-invert max-w-none w-full prose-headings:text-primary prose-headings:font-bold prose-strong:text-foreground prose-li:my-1 prose-p:leading-relaxed text-sm">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {result}
                  </ReactMarkdown>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 bg-card border border-border rounded-xl p-3 flex gap-3 items-end relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent pointer-events-none" />
              <textarea
                value={problem}
                onChange={e => setProblem(e.target.value)}
                placeholder="e.g. Find the derivative of f(x) = x² · sin(x)"
                className="min-h-[80px] resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent flex-1 text-sm relative z-10 w-full outline-none"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSolve()
                  }
                }}
              />
              <div className="flex-shrink-0 relative z-10">
                <Button
                  size="icon"
                  className="rounded-full bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/20 transition-transform hover:scale-105 active:scale-95"
                  onClick={handleSolve}
                  disabled={isComputing || !problem.trim()}
                >
                  {isComputing
                    ? <Loader2 size={16} className="animate-spin" />
                    : <Send size={15} className="ml-0.5" />}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
