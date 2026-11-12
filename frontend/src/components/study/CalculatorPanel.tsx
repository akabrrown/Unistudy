'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Calculator, Send, Loader2, BrainCircuit, X, ImagePlus } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { solveMathProblemStream } from '@/lib/mathStreamClient'

import { GraphPlotter } from './GraphPlotter'
import { FormulaLibrary } from './FormulaLibrary'
import { ConstantsPanel } from './ConstantsPanel'
import { LineChart, Sigma, Atom } from 'lucide-react'

export function CalculatorPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'calculator' | 'graph' | 'formulas' | 'constants'>('calculator')
  const [problem, setProblem] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageMime, setImageMime] = useState('image/png')
  const [isComputing, setIsComputing] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [result])

  const handleImageFile = (file: File | null | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid PNG, JPEG, or WebP image.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image exceeds 5 MB. Please upload a smaller screenshot.')
      return
    }
    setError(null)
    setImageMime(file.type)
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImagePreview(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        handleImageFile(item.getAsFile())
        break
      }
    }
  }

  async function handleSolve() {
    if (!problem.trim() && !imagePreview) return
    setIsComputing(true)
    setResult('')
    setError(null)
    try {
      await solveMathProblemStream({
        problem,
        subject: 'Mathematics',
        level: 'Undergraduate',
        imageBase64: imagePreview,
        mimeType: imageMime,
        onChunk: (fullText) => setResult(fullText),
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to compute problem')
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
            <div className="flex-shrink-0 bg-card border border-border rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent pointer-events-none" />
              {imagePreview && (
                <div className="relative z-10 flex items-center justify-between gap-2 bg-muted/40 border border-border rounded-lg px-2 py-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <Image
                      src={imagePreview}
                      alt="Math problem"
                      width={28}
                      height={28}
                      unoptimized
                      className="h-7 w-7 rounded object-cover border border-border"
                    />
                    <span className="text-[11px] text-muted-foreground truncate">Screenshot attached</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setImagePreview(null)}
                    aria-label="Remove screenshot"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2 items-end relative z-10">
                <textarea
                  value={problem}
                  onChange={e => setProblem(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Enter any math question or paste/upload a screenshot..."
                  className="min-h-[72px] resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent flex-1 text-sm w-full outline-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSolve()
                    }
                  }}
                />
                <div className="flex-shrink-0 flex flex-col gap-1.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={e => {
                      handleImageFile(e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload math question image"
                  >
                    <ImagePlus size={14} />
                  </Button>
                  <Button
                    size="icon"
                    className="rounded-full bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/20 transition-transform hover:scale-105 active:scale-95"
                    onClick={handleSolve}
                    disabled={isComputing || (!problem.trim() && !imagePreview)}
                  >
                    {isComputing
                      ? <Loader2 size={16} className="animate-spin" />
                      : <Send size={15} className="ml-0.5" />}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
