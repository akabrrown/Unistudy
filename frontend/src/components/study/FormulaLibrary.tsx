'use client'

import { useState, useEffect, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Copy, CheckCircle2, Bot, Calculator, Sparkles, Loader2, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export type Formula = {
  id: string
  name: string
  formula: string
  mathExpr?: string
  subject: string
}

export function FormulaLibrary({ onCopy }: { onCopy?: (formula: string) => void }) {
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const [formulas, setFormulas] = useState<Formula[]>([])
  const [loadingFormulas, setLoadingFormulas] = useState(true)

  // MathJS Live Expression Evaluator State
  const [mathEvalResult, setMathEvalResult] = useState<{
    expr: string
    result: string
    action: string
    source: string
  } | null>(null)
  const [isEvaluatingMathJS, setIsEvaluatingMathJS] = useState(false)
  const [evalMode, setEvalMode] = useState<'evaluate' | 'simplify' | 'derivative'>('evaluate')

  const [aiFormulas, setAiFormulas] = useState<Formula[]>([])
  const [isSearchingAI, setIsSearchingAI] = useState(false)

  // 1. Fetch dynamic formulas from MathJS API endpoint on mount
  useEffect(() => {
    let isCancelled = false

    async function loadMathJSFormulas() {
      setLoadingFormulas(true)
      try {
        const res = await fetch('/api/mathjs?type=formulas_list')
        const data = await res.json()
        if (data.success && Array.isArray(data.data) && !isCancelled) {
          setFormulas(data.data)
        }
      } catch (err) {
        console.error('Failed to load dynamic MathJS formulas:', err)
      } finally {
        if (!isCancelled) setLoadingFormulas(false)
      }
    }

    loadMathJSFormulas()

    return () => {
      isCancelled = true
    }
  }, [])

  // 2. Dynamic MathJS Formula / Expression Evaluator
  useEffect(() => {
    const q = search.trim()
    // Trigger if search contains mathematical operators or variables
    const hasMathSyntax = /[=+\-*/^()0-9xX]/.test(q)
    if (!q || q.length < 2 || !hasMathSyntax) {
      setMathEvalResult(null)
      setIsEvaluatingMathJS(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsEvaluatingMathJS(true)
      try {
        const res = await fetch('/api/mathjs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expr: q,
            action: evalMode,
            variable: 'x',
          }),
        })
        const data = await res.json()
        if (data.success && data.result) {
          setMathEvalResult({
            expr: q,
            result: data.result,
            action: data.action || evalMode,
            source: data.source || 'MathJS Expression Evaluator',
          })
        } else {
          setMathEvalResult(null)
        }
      } catch {
        setMathEvalResult(null)
      } finally {
        setIsEvaluatingMathJS(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [search, evalMode])

  // 3. Fallback AI search for natural language queries not found in MathJS
  const localFiltered = formulas.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.subject.toLowerCase().includes(search.toLowerCase()) ||
      (f.mathExpr && f.mathExpr.toLowerCase().includes(search.toLowerCase()))
  )

  const allFiltered = [
    ...localFiltered,
    ...aiFormulas.filter(
      (f) =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.subject.toLowerCase().includes(search.toLowerCase())
    ),
  ]

  useEffect(() => {
    if (search.length < 3 || localFiltered.length > 0 || mathEvalResult !== null) return

    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingAI(true)
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/ai/search-math`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session && { Authorization: `Bearer ${session.access_token}` }),
            },
            body: JSON.stringify({ type: 'formula', query: search }),
          }
        )

        const result = await res.json()
        if (result.success && result.data) {
          const aiFormula: Formula = {
            id: `ai-${Date.now()}`,
            name: result.data.name,
            formula: result.data.formula,
            subject: result.data.subject,
          }
          setAiFormulas((prev) => [...prev, aiFormula])
        }
      } catch (err) {
        console.error('AI search failed', err)
      } finally {
        setIsSearchingAI(false)
      }
    }, 1000)

    return () => clearTimeout(delayDebounceFn)
  }, [search, localFiltered.length, mathEvalResult])

  const handleCopy = (formulaText: string, id: string) => {
    navigator.clipboard.writeText(formulaText)
    setCopiedId(id)
    if (onCopy) onCopy(formulaText)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col h-full bg-card gap-3">
      {/* Search Input */}
      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search formulas or evaluate expr (e.g. x^2 + 4x, derivative)..."
          value={search}
          onChange={(e) => {
            const val = e.target.value
            startTransition(() => {
              setSearch(val)
            })
          }}
          className="pl-9 bg-muted/50 border-border text-xs sm:text-sm"
        />
        {isEvaluatingMathJS && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary animate-spin" />
        )}
      </div>

      {/* Mode Selector for MathJS Expression Evaluator */}
      {search.trim().length > 1 && (
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-[10px] font-mono text-muted-foreground uppercase">MathJS Mode:</span>
          {(['evaluate', 'simplify', 'derivative'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setEvalMode(mode)}
              className={`text-[10px] px-2 py-0.5 rounded-md font-mono transition-colors ${
                evalMode === mode
                  ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 pb-4">
        {/* Live MathJS Expression Evaluator result card */}
        {mathEvalResult && (
          <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Calculator className="w-3.5 h-3.5" />
                <span className="capitalize">MathJS {mathEvalResult.action}</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase font-bold">
                {mathEvalResult.source}
              </span>
            </div>
            <div className="flex items-center justify-between bg-card p-2 rounded-lg border border-border text-xs font-mono">
              <div className="overflow-x-auto pr-2">
                <span className="text-muted-foreground">{mathEvalResult.expr} → </span>
                <span className="font-bold text-foreground">{mathEvalResult.result}</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => handleCopy(mathEvalResult.result, 'eval-formula-result')}
              >
                {copiedId === 'eval-formula-result' ? (
                  <CheckCircle2 size={13} className="text-emerald-500" />
                ) : (
                  <Copy size={13} />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loadingFormulas && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground space-y-2">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <p className="text-xs">Loading dynamic formulas via MathJS API...</p>
          </div>
        )}

        {/* AI Searching Indicator */}
        {isSearchingAI && (
          <div className="text-center p-3 border border-purple-500/30 bg-purple-500/10 rounded-lg flex items-center justify-center gap-2 animate-pulse">
            <Bot className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-purple-600 font-medium">Searching AI for '{search}'...</span>
          </div>
        )}

        {/* Empty States */}
        {!loadingFormulas && !isSearchingAI && allFiltered.length === 0 && !mathEvalResult && search.length > 0 && (
          <div className="text-center text-muted-foreground text-xs py-8">
            No formulas found. Enter a mathematical expression to evaluate with MathJS.
          </div>
        )}

        {/* Formula Cards */}
        {!loadingFormulas &&
          allFiltered.map((f) => (
            <div
              key={f.id}
              className="group flex flex-col p-2.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <div className="flex justify-between items-start mb-1.5">
                <div>
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    {f.name}
                    {f.id.startsWith('ai-') ? (
                      <Bot className="w-3 h-3 text-purple-500" />
                    ) : (
                      <Sparkles className="w-2.5 h-2.5 text-primary opacity-60" />
                    )}
                  </h4>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-primary/80 bg-primary/10 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                    {f.subject}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-70 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleCopy(f.formula, f.id)}
                    title="Copy formula"
                  >
                    {copiedId === f.id ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  </Button>
                  {f.mathExpr && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6 text-primary hover:text-primary/80 opacity-70 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        setSearch(f.mathExpr!)
                      }}
                      title="Evaluate in MathJS"
                    >
                      <ArrowRight size={13} />
                    </Button>
                  )}
                </div>
              </div>
              <div className="bg-background/60 p-2 rounded-lg border border-border/60 flex items-center justify-between text-xs font-mono text-foreground overflow-x-auto">
                <span className="font-semibold text-primary/90">{f.formula}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
