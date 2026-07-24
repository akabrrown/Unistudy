'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Copy, CheckCircle2, Loader2, Bot } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Formula = {
  id: string
  name: string
  formula: string
  subject: string
}

const FORMULAS: Formula[] = [
  { id: '1', name: 'Quadratic Formula', formula: 'x = (-b ± √(b² - 4ac)) / 2a', subject: 'Algebra' },
  { id: '2', name: 'Pythagorean Theorem', formula: 'a² + b² = c²', subject: 'Geometry' },
  { id: '3', name: 'Area of a Circle', formula: 'A = πr²', subject: 'Geometry' },
  { id: '4', name: 'Euler\'s Formula', formula: 'e^(iπ) + 1 = 0', subject: 'Calculus' },
  { id: '5', name: 'Newton\'s Second Law', formula: 'F = ma', subject: 'Physics' },
  { id: '6', name: 'Kinematic Equation 1', formula: 'v = v₀ + at', subject: 'Physics' },
  { id: '7', name: 'Kinematic Equation 2', formula: 'Δx = v₀t + (1/2)at²', subject: 'Physics' },
  { id: '8', name: 'Mass-Energy Equivalence', formula: 'E = mc²', subject: 'Physics' },
  { id: '9', name: 'Derivative of Power', formula: 'd/dx x^n = n*x^(n-1)', subject: 'Calculus' },
  { id: '10', name: 'Trig Identity', formula: 'sin²(x) + cos²(x) = 1', subject: 'Trigonometry' },
  { id: '11', name: 'Logarithm Product Rule', formula: 'log_b(xy) = log_b(x) + log_b(y)', subject: 'Algebra' },
  { id: '12', name: 'Logarithm Quotient Rule', formula: 'log_b(x/y) = log_b(x) - log_b(y)', subject: 'Algebra' },
  { id: '13', name: 'Law of Sines', formula: 'a/sin(A) = b/sin(B) = c/sin(C)', subject: 'Trigonometry' },
  { id: '14', name: 'Law of Cosines', formula: 'c² = a² + b² - 2ab*cos(C)', subject: 'Trigonometry' },
  { id: '15', name: 'Product Rule (Derivative)', formula: 'd/dx [f(x)g(x)] = f\'(x)g(x) + f(x)g\'(x)', subject: 'Calculus' },
  { id: '16', name: 'Quotient Rule (Derivative)', formula: 'd/dx [f(x)/g(x)] = (f\'(x)g(x) - f(x)g\'(x)) / [g(x)]²', subject: 'Calculus' },
  { id: '17', name: 'Chain Rule', formula: 'd/dx f(g(x)) = f\'(g(x)) * g\'(x)', subject: 'Calculus' },
  { id: '18', name: 'Integration by Parts', formula: '∫u dv = uv - ∫v du', subject: 'Calculus' },
  { id: '19', name: 'Ohm\'s Law', formula: 'V = IR', subject: 'Physics' },
  { id: '20', name: 'Coulomb\'s Law', formula: 'F = k(q₁q₂)/r²', subject: 'Physics' },
  { id: '21', name: 'Work Done', formula: 'W = Fd*cos(θ)', subject: 'Physics' },
  { id: '22', name: 'Molarity', formula: 'M = n / V', subject: 'Chemistry' },
  { id: '23', name: 'Ideal Gas Law', formula: 'PV = nRT', subject: 'Chemistry' },
  { id: '24', name: 'pH Equation', formula: 'pH = -log[H+]', subject: 'Chemistry' },
  { id: '25', name: 'Standard Deviation', formula: 'σ = √[ Σ(x - μ)² / N ]', subject: 'Statistics' }
]

export function FormulaLibrary({ onCopy }: { onCopy?: (formula: string) => void }) {
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  const [aiFormulas, setAiFormulas] = useState<Formula[]>([])
  const [isSearchingAI, setIsSearchingAI] = useState(false)

  const localFiltered = FORMULAS.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    f.subject.toLowerCase().includes(search.toLowerCase())
  )
  
  const allFiltered = [...localFiltered, ...aiFormulas.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    f.subject.toLowerCase().includes(search.toLowerCase())
  )]

  useEffect(() => {
    if (search.length < 3 || localFiltered.length > 0) return;
    
    const delayDebounceFn = setTimeout(async () => {
      setIsSearchingAI(true);
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/ai/search-math`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(session && { Authorization: `Bearer ${session.access_token}` })
          },
          body: JSON.stringify({ type: 'formula', query: search })
        });
        
        const result = await res.json();
        if (result.success && result.data) {
          const aiFormula = {
            id: `ai-${Date.now()}`,
            name: result.data.name,
            formula: result.data.formula,
            subject: result.data.subject
          };
          setAiFormulas(prev => [...prev, aiFormula]);
        }
      } catch (err) {
        console.error('AI search failed', err);
      } finally {
        setIsSearchingAI(false);
      }
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [search, localFiltered.length]);

  const handleCopy = (f: Formula) => {
    navigator.clipboard.writeText(f.formula)
    setCopiedId(f.id)
    if (onCopy) onCopy(f.formula)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col h-full bg-card gap-4">
      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search formulas or subjects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-muted/50 border-border text-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-4">
        {isSearchingAI && (
          <div className="text-center p-4 border border-purple-500/30 bg-purple-500/10 rounded-lg flex flex-col items-center justify-center gap-2 mt-4 animate-pulse">
            <Bot className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-purple-600 font-medium">Searching AI for '{search}'...</span>
          </div>
        )}
        {!isSearchingAI && allFiltered.length === 0 && search.length > 0 && (
          <div className="text-center text-muted-foreground text-sm mt-8">
            No formulas found locally or via AI.
          </div>
        )}
        {!isSearchingAI && allFiltered.length === 0 && search.length === 0 && (
          <div className="text-center text-muted-foreground text-sm mt-8">
            No formulas found.
          </div>
        )}
        {allFiltered.map(f => (
          <div key={f.id} className="group flex flex-col p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {f.name}
                  {f.id.startsWith('ai-') && <Bot className="w-3 h-3 text-purple-500" />}
                </h4>
                <span className="text-[10px] font-medium uppercase tracking-wider text-purple-500/80">{f.subject}</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleCopy(f)}
              >
                {copiedId === f.id ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
              </Button>
            </div>
            <div className="bg-background/50 p-2 rounded border border-border/50 text-center font-serif text-sm overflow-x-auto whitespace-nowrap">
              {f.formula}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
