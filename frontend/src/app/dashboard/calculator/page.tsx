'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Calculator,
  Send,
  Loader2,
  BrainCircuit,
  LineChart,
  ImagePlus,
  X,
  Copy,
  Check,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  FunctionSquare,
  Sigma,
  Atom,
  Cpu,
  ArrowRight,
  Play,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { toast } from 'sonner'

import { solveMathProblemStream } from '@/lib/mathStreamClient'
import { GraphPlotter } from '@/components/study/GraphPlotter'
import { FormulaLibrary } from '@/components/study/FormulaLibrary'
import { ConstantsPanel } from '@/components/study/ConstantsPanel'
import { cn } from '@/lib/utils'

const MATH_SUBJECTS = [
  'Mathematics',
  'Calculus',
  'Algebra & Linear Algebra',
  'Trigonometry & Geometry',
  'Statistics & Probability',
  'Differential Equations',
  'Discrete Math',
  'Physics',
  'Chemistry',
] as const

const MATH_LEVELS = ['High School', 'Undergraduate', 'Graduate'] as const

type KeypadCategory = 'calculus' | 'algebra' | 'matrix' | 'stats'

const MATH_KEYPAD: Record<
  KeypadCategory,
  { label: string; keys: { display: string; insert: string }[] }
> = {
  calculus: {
    label: 'Calculus',
    keys: [
      { display: 'd/dx', insert: 'Find the derivative of ' },
      { display: '∫ a→b', insert: 'integrate x^2 from 0 to 3' },
      { display: 'lim', insert: 'limit as x -> 0 of ' },
      { display: 'dy/dx =', insert: 'Solve ODE dy/dx = ' },
      { display: 'x^n', insert: 'x^2' },
      { display: 'e^x', insert: 'exp(x)' },
      { display: 'ln(x)', insert: 'log(x)' },
      { display: '√(x)', insert: 'sqrt()' },
    ],
  },
  algebra: {
    label: 'Algebra',
    keys: [
      { display: 'Solve =', insert: 'Solve ' },
      { display: 'System', insert: 'Solve 2x + y = 7, x - y = 2' },
      { display: 'x²', insert: '^2' },
      { display: '()', insert: '()' },
      { display: '±', insert: '+/-' },
      { display: '≤', insert: '<=' },
      { display: '≥', insert: '>=' },
      { display: 'π', insert: 'pi' },
    ],
  },
  matrix: {
    label: 'Matrices',
    keys: [
      { display: 'det(A)', insert: 'det([[1, 2], [3, 4]])' },
      { display: 'inv(A)', insert: 'inv([[1, 2], [3, 4]])' },
      { display: '2×2 [[...]]', insert: '[[1, 0], [0, 1]]' },
      { display: 'A * B', insert: ' * ' },
      { display: 'transpose', insert: 'transpose([[1, 2], [3, 4]])' },
      { display: 'eigenvalues', insert: 'Find eigenvalues of [[4, 1], [2, 3]]' },
    ],
  },
  stats: {
    label: 'Trig & Stats',
    keys: [
      { display: 'sin(x)', insert: 'sin(x)' },
      { display: 'cos(x)', insert: 'cos(x)' },
      { display: 'tan(x)', insert: 'tan(x)' },
      { display: 'Mean & SD', insert: 'Find mean and standard deviation of 2, 4, 4, 4, 5, 5, 7, 9' },
      { display: 'P(A|B)', insert: 'Conditional probability P(A|B) ' },
      { display: 'nCr', insert: 'combinations(n, r)' },
    ],
  },
}

const EXAMPLE_PROBLEMS = [
  {
    tag: 'Calculus',
    text: 'Find the derivative of x^3 + 2*x^2 - 5*x + 7 with respect to x',
  },
  {
    tag: 'Definite Integral',
    text: 'integrate x^2 * sin(x) from 0 to pi',
  },
  {
    tag: 'Complex Roots',
    text: 'Solve x^2 + 2x + 5 = 0',
  },
  {
    tag: 'Linear System',
    text: 'Solve 2x + y = 7, x - y = 2',
  },
  {
    tag: 'Matrix Determinant',
    text: 'det([[1, 2, 3], [0, 4, 5], [1, 0, 6]])',
  },
  {
    tag: 'Statistics',
    text: 'Find mean, median, and standard deviation of 12, 15, 18, 22, 25, 28',
  },
] as const

interface SolvedHistoryEntry {
  id: string
  problem: string
  subject: string
  level: string
  result: string
  timestamp: string
}

type CalculatorTab = 'solver' | 'graph' | 'evaluator' | 'formulas' | 'constants'

export default function CalculatorPage() {
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab')
  const [manualTab, setManualTab] = useState<{ forUrl: string | null; tab: CalculatorTab } | null>(null)
  const activeTab: CalculatorTab =
    manualTab && manualTab.forUrl === urlTab
      ? manualTab.tab
      : (urlTab === 'graph' || urlTab === 'evaluator' || urlTab === 'formulas' || urlTab === 'constants')
        ? urlTab
        : 'solver'
  const setActiveTab = (tab: CalculatorTab) => setManualTab({ forUrl: urlTab, tab })

  // MathJS Evaluator State
  const [evalExpr, setEvalExpr] = useState('derivative("x^3 + 2*x^2 - 5*x", "x")')
  const [evalAction, setEvalAction] = useState<'evaluate' | 'simplify' | 'derivative'>('evaluate')
  const [evalResult, setEvalResult] = useState<{
    expr: string
    result: string
    latex?: string
    source: string
  } | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evalError, setEvalError] = useState<string | null>(null)
  const [evalHistory, setEvalHistory] = useState<{ expr: string; result: string; action: string }[]>([
    { expr: 'derivative("x^3 + 2*x^2 - 5*x", "x")', result: '3 * x^2 + 4 * x - 5', action: 'derivative' },
    { expr: 'simplify("2*x + 3*x + 4*y - y")', result: '5 * x + 3 * y', action: 'simplify' },
    { expr: 'det([[1, 2], [3, 4]])', result: '-2', action: 'evaluate' },
  ])

  // Hydrate evalHistory from localStorage on client mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem('unistudy_eval_history')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEvalHistory(parsed)
        }
      }
    } catch {
      // Storage unavailable
    }
  }, [])

  // Persist evalHistory updates to localStorage
  const saveEvalHistory = (next: { expr: string; result: string; action: string }[]) => {
    setEvalHistory(next)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('unistudy_eval_history', JSON.stringify(next))
      } catch {
        // Storage unavailable
      }
    }
  }

  const handleRunMathJSEval = async (overrideExpr?: string, overrideAction?: 'evaluate' | 'simplify' | 'derivative') => {
    const exprToRun = (overrideExpr || evalExpr).trim()
    const actionToRun = overrideAction || evalAction
    if (!exprToRun) return

    setIsEvaluating(true)
    setEvalError(null)
    try {
      const res = await fetch('/api/mathjs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expr: exprToRun,
          action: actionToRun,
          variable: 'x',
        }),
      })
      const data = await res.json()
      if (data.success && data.result) {
        setEvalResult({
          expr: exprToRun,
          result: data.result,
          latex: data.latex,
          source: data.source || 'MathJS API',
        })
        const nextHist = [
          { expr: exprToRun, result: data.result, action: actionToRun },
          ...evalHistory.filter((p) => p.expr !== exprToRun).slice(0, 9),
        ]
        saveEvalHistory(nextHist)
      } else {
        setEvalError(data.error || 'Failed to evaluate expression')
      }
    } catch (err: any) {
      setEvalError(err?.message || 'Network error evaluating expression')
    } finally {
      setIsEvaluating(false)
    }
  }

  const [problem, setProblem] = useState('')
  const [subject, setSubject] = useState<string>('Mathematics')
  const [level, setLevel] = useState<string>('Undergraduate')
  const [keypadCat, setKeypadCat] = useState<KeypadCategory>('calculus')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageMime, setImageMime] = useState('image/png')
  const [isComputing, setIsComputing] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<SolvedHistoryEntry[]>([])

  const endRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [result])

  const insertSnippet = (snippet: string) => {
    const el = textareaRef.current
    if (!el) {
      setProblem((prev) => (prev ? `${prev} ${snippet}` : snippet))
      return
    }
    const start = el.selectionStart ?? problem.length
    const end = el.selectionEnd ?? problem.length
    const next = `${problem.slice(0, start)}${snippet}${problem.slice(end)}`
    setProblem(next)
    requestAnimationFrame(() => {
      el.focus()
      const caret = start + snippet.length
      el.setSelectionRange(caret, caret)
    })
  }

  const handleImageFile = (file: File | null | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid PNG, JPEG, or WebP image.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image exceeds 10 MB. Please upload a smaller screenshot.')
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      const rawDataUrl = typeof reader.result === 'string' ? reader.result : null
      if (!rawDataUrl) return

      // Compress large images (>1 MB) or non-standard image MIME types via canvas
      const isStandardMime = /^image\/(png|jpeg|jpg|webp|gif)$/i.test(file.type)
      if (file.size <= 1_000_000 && isStandardMime) {
        setImageMime(file.type === 'image/jpg' ? 'image/jpeg' : file.type)
        setImagePreview(rawDataUrl)
        return
      }

      const img = new window.Image()
      img.onload = () => {
        try {
          const maxDim = 1600
          let width = img.naturalWidth || img.width
          let height = img.naturalHeight || img.height
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height)
            width = Math.max(1, Math.round(width * ratio))
            height = Math.max(1, Math.round(height * ratio))
          }
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            setImageMime('image/jpeg')
            setImagePreview(rawDataUrl)
            return
          }
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, width, height)
          ctx.drawImage(img, 0, 0, width, height)
          const compressed = canvas.toDataURL('image/jpeg', 0.85)
          setImageMime('image/jpeg')
          setImagePreview(compressed)
        } catch {
          setImageMime('image/jpeg')
          setImagePreview(rawDataUrl)
        }
      }
      img.onerror = () => {
        setImageMime('image/jpeg')
        setImagePreview(rawDataUrl)
      }
      img.src = rawDataUrl
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

  async function runSolve(problemOverride?: string) {
    const activeProblem = (problemOverride ?? problem).trim()
    if (!activeProblem && !imagePreview) return
    if (problemOverride !== undefined) {
      setProblem(problemOverride)
    }

    setIsComputing(true)
    setResult('')
    setError(null)
    setCopied(false)

    try {
      const finalOutput = await solveMathProblemStream({
        problem: activeProblem,
        subject,
        level,
        imageBase64: imagePreview,
        mimeType: imageMime,
        onChunk: (fullText) => setResult(fullText),
      })

      if (finalOutput && finalOutput.trim()) {
        setHistory((prev) => [
          {
            id: `${Date.now()}`,
            problem: activeProblem || 'Image Question',
            subject,
            level,
            result: finalOutput,
            timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          },
          ...prev.slice(0, 5),
        ])
      }
    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to compute problem')
    } finally {
      setIsComputing(false)
    }
  }

  const handleCopyResult = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard unavailable
    }
  }

  const handleReset = () => {
    setProblem('')
    setImagePreview(null)
    setResult('')
    setError(null)
    setCopied(false)
  }

  return (
    <div className="max-w-[1380px] mx-auto pb-10 space-y-5">
      {/* Studio Command Header */}
      <header className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono uppercase tracking-wider text-[11px] text-primary font-semibold">
              Course Computation Suite
            </span>
            <span aria-hidden="true">/</span>
            <span>CAS + Vision + Cartesian Geometry</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Calculator className="w-6 h-6 text-primary" strokeWidth={1.75} />
            Math Solver &amp; Graph Studio
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {history.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground font-mono tabular-nums">
              <Clock className="w-3.5 h-3.5 text-primary" />
              {history.length} solved in session
            </span>
          ) : null}

          <div className="inline-flex flex-wrap rounded-xl border border-border bg-muted/40 p-1 gap-0.5">
            {[
              { id: 'solver' as const, label: 'Math Solver', icon: Calculator },
              { id: 'graph' as const, label: 'Graph Plotter', icon: LineChart },
              { id: 'evaluator' as const, label: 'MathJS Evaluator', icon: Cpu },
              { id: 'formulas' as const, label: 'Formulas', icon: Sigma },
              { id: 'constants' as const, label: 'Constants', icon: Atom },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer',
                    activeTab === tab.id
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-3.5 h-3.5 text-primary" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {activeTab === 'graph' ? (
        <GraphPlotter fullHeight />
      ) : activeTab === 'evaluator' ? (
        /* MathJS Expression Evaluator Studio */
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border/70">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                MathJS Expression Evaluator Console
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Execute calculations, symbolic simplifications, matrix algebra, and derivatives via MathJS API with exact precision.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('solver')}
                className="text-xs cursor-pointer"
              >
                Open Math Solver
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Console (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-xl border border-border bg-background p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground font-mono">EXPRESSION INPUT</span>
                  <div className="flex items-center gap-1">
                    {(['evaluate', 'simplify', 'derivative'] as const).map((act) => (
                      <button
                        key={act}
                        type="button"
                        onClick={() => {
                          setEvalAction(act)
                          handleRunMathJSEval(evalExpr, act)
                        }}
                        className={cn(
                          'text-[10px] font-mono px-2 py-0.5 rounded capitalize transition-colors cursor-pointer',
                          evalAction === act
                            ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                            : 'bg-muted/70 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={evalExpr}
                    onChange={(e) => setEvalExpr(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleRunMathJSEval()
                      }
                    }}
                    placeholder="e.g. derivative('x^3 + 2*x', 'x') or 2 * speedOfLight"
                    className="flex-1 font-mono text-sm bg-muted/30 border border-border rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <Button
                    onClick={() => handleRunMathJSEval()}
                    disabled={isEvaluating || !evalExpr.trim()}
                    className="h-10 px-4 text-xs font-semibold gap-1.5 cursor-pointer"
                  >
                    {isEvaluating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    Evaluate
                  </Button>
                </div>

                {evalError && (
                  <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs text-rose-600 font-mono flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{evalError}</span>
                  </div>
                )}

                {/* Quick Expression Presets */}
                <div className="pt-2 border-t border-border/60 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider block">
                    Quick Evaluator Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Derivative d/dx', expr: 'derivative("x^4 - 3*x^2 + 5*x", "x")', act: 'derivative' as const },
                      { label: 'Simplify Poly', expr: 'simplify("2*x + 5*x + 3*y - y + 10")', act: 'simplify' as const },
                      { label: 'Matrix Det', expr: 'det([[1, 2, 3], [0, 4, 5], [1, 0, 6]])', act: 'evaluate' as const },
                      { label: 'Matrix Inverse', expr: 'inv([[4, 7], [2, 6]])', act: 'evaluate' as const },
                      { label: 'Light Speed in 1h', expr: 'speedOfLight * 1 hour to km', act: 'evaluate' as const },
                      { label: 'Photon Energy', expr: 'planckConstant * 5e14 Hz to eV', act: 'evaluate' as const },
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setEvalExpr(preset.expr)
                          setEvalAction(preset.act)
                          handleRunMathJSEval(preset.expr, preset.act)
                        }}
                        className="text-[11px] font-mono px-2.5 py-1 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Output Card */}
              {evalResult && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Evaluated Result</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/10 text-primary uppercase font-bold border border-primary/20">
                        {evalResult.source}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          insertSnippet(evalResult.result)
                          setActiveTab('solver')
                          toast.success('Inserted into Math Solver')
                        }}
                        className="h-7 text-xs gap-1 text-primary cursor-pointer"
                      >
                        <ArrowRight size={13} />
                        Insert to Solver
                      </Button>
                    </div>
                  </div>

                  <div className="bg-card p-3 rounded-xl border border-border text-sm font-mono space-y-1">
                    <p className="text-xs text-muted-foreground">{evalResult.expr} =</p>
                    <p className="text-base font-bold text-foreground break-all">{evalResult.result}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right History & Tools (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground font-mono flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    RECENT EVALUATIONS
                  </h3>
                  {evalHistory.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEvalHistory([])}
                      className="h-6 text-[10px] text-muted-foreground cursor-pointer"
                    >
                      Clear
                    </Button>
                  )}
                </div>

                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {evalHistory.map((h, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors text-xs font-mono space-y-1 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground uppercase">{h.action}</span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          onClick={() => {
                            setEvalExpr(h.expr)
                            setEvalAction(h.action as any)
                            handleRunMathJSEval(h.expr, h.action as any)
                          }}
                          title="Re-run"
                        >
                          <RotateCcw size={11} />
                        </Button>
                      </div>
                      <p className="text-muted-foreground truncate">{h.expr}</p>
                      <p className="text-foreground font-bold truncate">{h.result}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'formulas' ? (
        /* Formula Library Studio */
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border/70">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Sigma className="w-5 h-5 text-primary" />
                Dynamic Formulas Library (MathJS Verified)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Explore mathematical formulas, compute derivatives, simplify expressions, and insert directly into your problem solver.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('solver')}
              className="text-xs cursor-pointer"
            >
              Back to Solver
            </Button>
          </div>
          <div className="max-w-2xl h-[560px]">
            <FormulaLibrary
              onCopy={(f) => {
                insertSnippet(f)
                setActiveTab('solver')
                toast.success('Formula inserted into problem solver')
              }}
            />
          </div>
        </div>
      ) : activeTab === 'constants' ? (
        /* Constants Panel Studio */
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border/70">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Atom className="w-5 h-5 text-primary" />
                Scientific &amp; Mathematical Constants (MathJS Evaluated)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                All physical CODATA and mathematical constants evaluated dynamically with standard SI dimensional units.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('solver')}
              className="text-xs cursor-pointer"
            >
              Back to Solver
            </Button>
          </div>
          <div className="max-w-2xl h-[560px]">
            <ConstantsPanel
              onCopy={(c) => {
                insertSnippet(c)
                setActiveTab('solver')
                toast.success('Constant value inserted into problem solver')
              }}
            />
          </div>
        </div>
      ) : (
        /* Dual-Pane Symbolab x WolframAlpha Solver Studio */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Workbench: Problem Editor, Math Keypad, Templates & History (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3.5">
              {/* Context Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/60">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    aria-label="Math Subject"
                    className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium outline-none cursor-pointer"
                  >
                    {MATH_SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    aria-label="Academic Level"
                    className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-medium outline-none cursor-pointer"
                  >
                    {MATH_LEVELS.map((lv) => (
                      <option key={lv} value={lv}>{lv}</option>
                    ))}
                  </select>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Clear
                </Button>
              </div>

              {/* Quick Math Tool Jumps */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
                <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-wider">Quick Tools:</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('evaluator')}
                  className="px-2 py-0.5 rounded-md border border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Cpu className="w-3 h-3 text-primary" /> MathJS Evaluator
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('formulas')}
                  className="px-2 py-0.5 rounded-md border border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Sigma className="w-3 h-3 text-primary" /> Formulas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('constants')}
                  className="px-2 py-0.5 rounded-md border border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Atom className="w-3 h-3 text-primary" /> Constants
                </button>
              </div>

              {/* Image Preview Strip */}
              {imagePreview ? (
                <div className="flex items-center justify-between gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Image
                      src={imagePreview}
                      alt="Math problem screenshot"
                      width={40}
                      height={40}
                      unoptimized
                      className="h-10 w-10 rounded-lg object-cover border border-border"
                    />
                    <span className="text-xs font-medium text-foreground truncate">Question image attached</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setImagePreview(null)}
                    aria-label="Remove attached image"
                    className="cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : null}

              {/* Equation / Natural Language Input */}
              <div className="space-y-2">
                <label htmlFor="math-problem-input" className="block text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  Problem Statement or Equation
                </label>
                <textarea
                  id="math-problem-input"
                  ref={textareaRef}
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Type equations, calculus, matrices, statistics, word problems, or paste a screenshot (Ctrl+V)..."
                  rows={4}
                  className="w-full resize-y min-h-[108px] rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary/60 placeholder:text-muted-foreground/70"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void runSolve()
                    }
                  }}
                />
              </div>

              {/* Submit + Image Upload Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      handleImageFile(e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 text-xs gap-1.5 cursor-pointer"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    Upload Question Photo
                  </Button>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => void runSolve()}
                  disabled={isComputing || (!problem.trim() && !imagePreview)}
                  className="h-9 px-4 text-xs font-semibold bg-[#5B2D8E] dark:bg-primary hover:bg-[#492274] text-white gap-1.5 cursor-pointer"
                >
                  {isComputing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Solving...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Solve Step-by-Step
                    </>
                  )}
                </Button>
              </div>
            </section>

            {/* Tabbed Symbolab-Style Syntax Keypad */}
            <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <FunctionSquare className="w-3.5 h-3.5 text-primary" />
                  Math Input Keypad
                </span>
                <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-[11px]">
                  {(Object.keys(MATH_KEYPAD) as KeypadCategory[]).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setKeypadCat(cat)}
                      className={cn(
                        'px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer',
                        keypadCat === cat
                          ? 'bg-background text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {MATH_KEYPAD[cat].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {MATH_KEYPAD[keypadCat].keys.map((item) => (
                  <button
                    key={item.display}
                    type="button"
                    onClick={() => insertSnippet(item.insert)}
                    className="rounded-lg border border-border/80 bg-muted/25 hover:bg-muted/70 hover:border-primary/40 py-2 px-2 font-mono text-xs font-medium text-foreground transition-colors cursor-pointer active:scale-[0.98]"
                  >
                    {item.display}
                  </button>
                ))}
              </div>
            </section>

            {/* Sample Query Starters */}
            <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-2.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                One-Click Example Problems
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EXAMPLE_PROBLEMS.map((ex) => (
                  <button
                    key={ex.tag}
                    type="button"
                    onClick={() => void runSolve(ex.text)}
                    disabled={isComputing}
                    className="text-left rounded-xl border border-border/70 bg-muted/25 hover:bg-muted/60 hover:border-primary/40 p-2.5 transition-colors cursor-pointer"
                  >
                    <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-primary">
                      {ex.tag}
                    </div>
                    <div className="text-xs text-foreground font-medium line-clamp-1 mt-0.5">
                      {ex.text}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Session History */}
            {history.length > 0 ? (
              <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-2.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                  Recent Computations
                </div>
                <ul className="divide-y divide-border/60">
                  {history.map((entry) => (
                    <li key={entry.id} className="py-2 first:pt-0 last:pb-0">
                      <button
                        type="button"
                        onClick={() => {
                          setProblem(entry.problem)
                          setSubject(entry.subject)
                          setLevel(entry.level)
                          setResult(entry.result)
                          setError(null)
                        }}
                        className="w-full text-left flex items-center justify-between gap-2 group cursor-pointer"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-foreground group-hover:text-primary truncate">
                            {entry.problem}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {entry.subject} · {entry.level}
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
                          {entry.timestamp}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          {/* Right Pane: Wolfram-Style Computation Output & Inspector (7 cols) */}
          <section className="lg:col-span-7 rounded-2xl border border-border/80 bg-card shadow-xs flex flex-col min-h-[580px]">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-border/70">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">Step-by-Step Derivation</span>
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {subject} · {level}
                </span>
                {isComputing ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-mono font-semibold text-primary">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Computing
                  </span>
                ) : result ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-3 h-3" />
                    Ready
                  </span>
                ) : null}
              </div>

              {result ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleCopyResult()}
                  className="h-7 px-2.5 text-xs gap-1.5 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy LaTeX
                    </>
                  )}
                </Button>
              ) : null}
            </div>

            <div className="flex-1 p-5 sm:p-6 overflow-y-auto">
              {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3 text-destructive">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold">Computation failed</p>
                    <p className="text-xs opacity-90">{error}</p>
                  </div>
                </div>
              ) : null}

              {!result && !isComputing && !error ? (
                <div className="space-y-6 py-4">
                  <div className="text-center max-w-md mx-auto space-y-2">
                    <BrainCircuit className="w-10 h-10 text-primary/40 mx-auto" strokeWidth={1.5} />
                    <h2 className="text-base font-bold text-foreground">
                      Symbolic CAS + Step-by-Step Proof Engine
                    </h2>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Arithmetic, derivatives, definite integrals, simultaneous equations, matrices, and descriptive statistics are verified deterministically before the AI writes step-by-step working.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border/70 bg-muted/25 p-3.5 space-y-1">
                      <div className="font-mono text-[11px] font-semibold text-primary">CALCULUS &amp; ODES</div>
                      <p className="text-xs text-muted-foreground">
                        Symbolic differentiation, Simpson definite integration, limits, series, and differential equations.
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/25 p-3.5 space-y-1">
                      <div className="font-mono text-[11px] font-semibold text-primary">ALGEBRA &amp; MATRICES</div>
                      <p className="text-xs text-muted-foreground">
                        Real &amp; complex quadratic roots, Gaussian elimination for linear systems, determinants, and inverses.
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/25 p-3.5 space-y-1">
                      <div className="font-mono text-[11px] font-semibold text-primary">PROBABILITY &amp; STATS</div>
                      <p className="text-xs text-muted-foreground">
                        Mean, median, population &amp; sample standard deviation, variance, distributions, and hypothesis tests.
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/25 p-3.5 space-y-1">
                      <div className="font-mono text-[11px] font-semibold text-primary">VISION OCR INPUT</div>
                      <p className="text-xs text-muted-foreground">
                        Paste screenshots directly (`Ctrl+V`) or upload handwritten/printed math exam questions.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {result ? (
                <div className="prose prose-slate dark:prose-invert max-w-none w-full prose-headings:text-primary prose-headings:font-bold prose-strong:text-foreground prose-li:my-1 prose-p:leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {result}
                  </ReactMarkdown>
                </div>
              ) : null}

              {isComputing && !result ? (
                <div className="flex items-center gap-2.5 text-primary font-medium py-8 justify-center text-sm">
                  <Loader2 className="animate-spin w-4 h-4" />
                  Running CAS check and generating step-by-step working...
                </div>
              ) : null}
              <div ref={endRef} />
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
