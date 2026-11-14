'use client'

import { useState, useEffect, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Copy, CheckCircle2, Bot, Calculator, Atom, Loader2, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export type Constant = {
  id: string
  name: string
  symbol: string
  value: string
  unit: string
  subject: string
  expr: string
}

// Fundamental scientific symbols that MathJS natively evaluates
const DYNAMIC_MATHJS_SYMBOLS = [
  { id: 'c', name: 'Speed of Light in Vacuum', symbol: 'c', expr: 'speedOfLight', subject: 'Physics' },
  { id: 'h', name: 'Planck Constant', symbol: 'h', expr: 'planckConstant', subject: 'Physics' },
  { id: 'hbar', name: 'Reduced Planck Constant (Dirac)', symbol: 'ħ', expr: 'reducedPlanckConstant', subject: 'Physics' },
  { id: 'G', name: 'Gravitational Constant', symbol: 'G', expr: 'gravitationConstant', subject: 'Physics' },
  { id: 'N_A', name: 'Avogadro Constant', symbol: 'N_A', expr: 'avogadro', subject: 'Chemistry' },
  { id: 'R', name: 'Molar Gas Constant', symbol: 'R', expr: 'gasConstant', subject: 'Chemistry' },
  { id: 'eps_0', name: 'Vacuum Electric Permittivity', symbol: 'ε₀', expr: 'electricConstant', subject: 'Physics' },
  { id: 'mu_0', name: 'Vacuum Magnetic Permeability', symbol: 'μ₀', expr: 'magneticConstant', subject: 'Physics' },
  { id: 'k_e', name: 'Coulomb Constant', symbol: 'k_e', expr: 'coulombConstant', subject: 'Physics' },
  { id: 'l_p', name: 'Planck Length', symbol: 'ℓ_P', expr: 'planckLength', subject: 'Physics' },
  { id: 'm_p', name: 'Planck Mass', symbol: 'm_P', expr: 'planckMass', subject: 'Physics' },
  { id: 't_p', name: 'Planck Time', symbol: 't_P', expr: 'planckTime', subject: 'Physics' },
  { id: 'q_p', name: 'Planck Charge', symbol: 'q_P', expr: 'planckCharge', subject: 'Physics' },
  { id: 'T_p', name: 'Planck Temperature', symbol: 'T_P', expr: 'planckTemperature', subject: 'Physics' },
  { id: 'pi', name: 'Pi (Archimedes Constant)', symbol: 'π', expr: 'pi', subject: 'Mathematics' },
  { id: 'e', name: 'Euler Number', symbol: 'e', expr: 'e', subject: 'Mathematics' },
  { id: 'tau', name: 'Tau (2π)', symbol: 'τ', expr: 'tau', subject: 'Mathematics' },
  { id: 'phi', name: 'Golden Ratio', symbol: 'φ', expr: 'phi', subject: 'Mathematics' },
]

export function ConstantsPanel({ onCopy }: { onCopy?: (value: string) => void }) {
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const [constants, setConstants] = useState<Constant[]>([])
  const [loadingConstants, setLoadingConstants] = useState(true)

  // Live MathJS Expression Evaluator
  const [evaluatedExpr, setEvaluatedExpr] = useState<{ expr: string; result: string; source: string } | null>(null)
  const [isEvaluatingMathJS, setIsEvaluatingMathJS] = useState(false)

  const [aiConstants, setAiConstants] = useState<Constant[]>([])
  const [isSearchingAI, setIsSearchingAI] = useState(false)

  // 1. Dynamically evaluate all fundamental constants through MathJS API / engine on mount
  useEffect(() => {
    let isCancelled = false

    async function evaluateDynamicConstants() {
      setLoadingConstants(true)
      try {
        const resolved = await Promise.all(
          DYNAMIC_MATHJS_SYMBOLS.map(async (item) => {
            try {
              const res = await fetch(`/api/mathjs?expr=${encodeURIComponent(item.expr)}`)
              const data = await res.json()
              const raw = data.result || item.expr
              const parts = raw.split(' ')
              return {
                id: item.id,
                name: item.name,
                symbol: item.symbol,
                value: parts[0] || raw,
                unit: parts.slice(1).join(' '),
                subject: item.subject,
                expr: item.expr,
              }
            } catch {
              return {
                id: item.id,
                name: item.name,
                symbol: item.symbol,
                value: item.expr,
                unit: '',
                subject: item.subject,
                expr: item.expr,
              }
            }
          })
        )
        if (!isCancelled) {
          setConstants(resolved)
        }
      } catch (err) {
        console.error('Failed to load dynamic MathJS constants:', err)
      } finally {
        if (!isCancelled) setLoadingConstants(false)
      }
    }

    evaluateDynamicConstants()

    return () => {
      isCancelled = true
    }
  }, [])

  // 2. Dynamic MathJS Expression Evaluator for ANY constant query
  useEffect(() => {
    const q = search.trim()
    if (!q || q.length < 2) {
      setEvaluatedExpr(null)
      setIsEvaluatingMathJS(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsEvaluatingMathJS(true)
      try {
        const res = await fetch(`/api/mathjs?expr=${encodeURIComponent(q)}`)
        const data = await res.json()
        if (data.success && data.result) {
          setEvaluatedExpr({
            expr: q,
            result: data.result,
            source: data.source || 'MathJS Expression Evaluator',
          })
        } else {
          setEvaluatedExpr(null)
        }
      } catch {
        setEvaluatedExpr(null)
      } finally {
        setIsEvaluatingMathJS(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [search])

  // 3. Fallback AI search for natural language queries not found in MathJS
  const localFiltered = constants.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase()) ||
      c.subject.toLowerCase().includes(search.toLowerCase()) ||
      c.expr.toLowerCase().includes(search.toLowerCase())
  )

  const allFiltered = [
    ...localFiltered,
    ...aiConstants.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.symbol.toLowerCase().includes(search.toLowerCase()) ||
        c.subject.toLowerCase().includes(search.toLowerCase())
    ),
  ]

  useEffect(() => {
    if (search.length < 3 || localFiltered.length > 0 || evaluatedExpr !== null) return

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
            body: JSON.stringify({ type: 'constant', query: search }),
          }
        )

        const result = await res.json()
        if (result.success && result.data) {
          const aiConstant: Constant = {
            id: `ai-${Date.now()}`,
            name: result.data.name,
            symbol: result.data.symbol,
            value: result.data.value,
            unit: result.data.unit,
            subject: result.data.subject,
            expr: result.data.symbol || result.data.name,
          }
          setAiConstants((prev) => [...prev, aiConstant])
        }
      } catch (err) {
        console.error('AI search failed', err)
      } finally {
        setIsSearchingAI(false)
      }
    }, 1000)

    return () => clearTimeout(delayDebounceFn)
  }, [search, localFiltered.length, evaluatedExpr])

  const handleCopy = (val: string, id: string) => {
    navigator.clipboard.writeText(val)
    setCopiedId(id)
    if (onCopy) onCopy(val)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col h-full bg-card gap-3">
      {/* Search Input */}
      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Evaluate any constant (e.g. speedOfLight, G, h, pi)..."
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

      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 pb-4">
        {/* Live MathJS Expression Evaluator Result */}
        {evaluatedExpr && (
          <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Calculator className="w-3.5 h-3.5" />
                <span>MathJS Expression Evaluator</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase font-bold">
                {evaluatedExpr.source}
              </span>
            </div>
            <div className="flex items-center justify-between bg-card p-2 rounded-lg border border-border text-xs font-mono">
              <div className="overflow-x-auto pr-2">
                <span className="text-muted-foreground">{evaluatedExpr.expr} = </span>
                <span className="font-bold text-foreground">{evaluatedExpr.result}</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => handleCopy(evaluatedExpr.result, 'eval-result')}
              >
                {copiedId === 'eval-result' ? (
                  <CheckCircle2 size={13} className="text-emerald-500" />
                ) : (
                  <Copy size={13} />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loadingConstants && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground space-y-2">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <p className="text-xs">Evaluating constants via MathJS API...</p>
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
        {!loadingConstants && !isSearchingAI && allFiltered.length === 0 && !evaluatedExpr && search.length > 0 && (
          <div className="text-center text-muted-foreground text-xs py-8">
            No constants found. Try typing a MathJS expression like <code>speedOfLight * 2</code>.
          </div>
        )}

        {/* Constants List */}
        {!loadingConstants &&
          allFiltered.map((c) => (
            <div
              key={c.id}
              className="group flex flex-col p-2.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <div className="flex justify-between items-start mb-1.5">
                <div>
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    {c.name}
                    {c.id.startsWith('ai-') ? (
                      <Bot className="w-3 h-3 text-purple-500" />
                    ) : (
                      <Atom className="w-2.5 h-2.5 text-primary opacity-60" />
                    )}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-serif text-muted-foreground italic text-xs">({c.symbol})</span>
                    <span className="text-[9px] font-mono uppercase tracking-wider text-primary/80 bg-primary/10 px-1.5 py-0.2 rounded">
                      {c.subject}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-70 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleCopy(c.value, c.id)}
                    title="Copy value"
                  >
                    {copiedId === c.id ? <CheckCircle2 size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-6 w-6 text-primary hover:text-primary/80 opacity-70 group-hover:opacity-100 transition-opacity"
                    onClick={() => {
                      setSearch(c.expr)
                    }}
                    title="Evaluate in MathJS"
                  >
                    <ArrowRight size={13} />
                  </Button>
                </div>
              </div>
              <div className="bg-background/60 p-2 rounded-lg border border-border/60 flex justify-between items-center text-xs font-mono text-foreground">
                <span className="truncate pr-2 font-semibold">{c.value}</span>
                {c.unit && <span className="text-muted-foreground text-[11px] shrink-0">{c.unit}</span>}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
