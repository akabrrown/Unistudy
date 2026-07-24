'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Copy, CheckCircle2, Bot } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Constant = {
  id: string
  name: string
  symbol: string
  value: string
  unit: string
  subject: string
}

const CONSTANTS: Constant[] = [
  { id: '1', name: 'Speed of Light', symbol: 'c', value: '299792458', unit: 'm/s', subject: 'Physics' },
  { id: '2', name: 'Planck Constant', symbol: 'h', value: '6.62607015e-34', unit: 'J·s', subject: 'Physics' },
  { id: '3', name: 'Gravitational Constant', symbol: 'G', value: '6.67430e-11', unit: 'm³/(kg·s²)', subject: 'Physics' },
  { id: '4', name: 'Elementary Charge', symbol: 'e', value: '1.602176634e-19', unit: 'C', subject: 'Physics' },
  { id: '5', name: 'Avogadro Constant', symbol: 'N_A', value: '6.02214076e23', unit: 'mol⁻¹', subject: 'Chemistry' },
  { id: '6', name: 'Boltzmann Constant', symbol: 'k', value: '1.380649e-23', unit: 'J/K', subject: 'Physics' },
  { id: '7', name: 'Ideal Gas Constant', symbol: 'R', value: '8.314462618', unit: 'J/(mol·K)', subject: 'Chemistry' },
  { id: '8', name: 'Pi', symbol: 'π', value: '3.14159265359', unit: '', subject: 'Mathematics' },
  { id: '9', name: 'Euler\'s Number', symbol: 'e', value: '2.71828182846', unit: '', subject: 'Mathematics' },
  { id: '10', name: 'Vacuum Permittivity', symbol: 'ε₀', value: '8.8541878128e-12', unit: 'F/m', subject: 'Physics' },
  { id: '11', name: 'Magnetic Constant (Permeability)', symbol: 'μ₀', value: '1.25663706212e-6', unit: 'N/A²', subject: 'Physics' },
  { id: '12', name: 'Stefan-Boltzmann Constant', symbol: 'σ', value: '5.670374419e-8', unit: 'W/(m²·K⁴)', subject: 'Physics' },
  { id: '13', name: 'Rydberg Constant', symbol: 'R_∞', value: '10973731.568160', unit: 'm⁻¹', subject: 'Physics' },
  { id: '14', name: 'Atomic Mass Constant', symbol: 'm_u', value: '1.66053906660e-27', unit: 'kg', subject: 'Chemistry' },
  { id: '15', name: 'Faraday Constant', symbol: 'F', value: '96485.33212', unit: 'C/mol', subject: 'Chemistry' },
  { id: '16', name: 'Golden Ratio', symbol: 'φ', value: '1.61803398875', unit: '', subject: 'Mathematics' },
  { id: '17', name: 'Electron Mass', symbol: 'm_e', value: '9.1093837015e-31', unit: 'kg', subject: 'Physics' },
  { id: '18', name: 'Proton Mass', symbol: 'm_p', value: '1.67262192369e-27', unit: 'kg', subject: 'Physics' },
  { id: '19', name: 'Neutron Mass', symbol: 'm_n', value: '1.67492749804e-27', unit: 'kg', subject: 'Physics' },
  { id: '20', name: 'Standard Acceleration of Gravity', symbol: 'g', value: '9.80665', unit: 'm/s²', subject: 'Physics' },
  { id: '21', name: 'Wien Displacement Constant', symbol: 'b', value: '2.897771955e-3', unit: 'm·K', subject: 'Physics' },
  { id: '22', name: 'Earth Radius (Mean)', symbol: 'R_⊕', value: '6371000', unit: 'm', subject: 'Physics' }
]

export function ConstantsPanel({ onCopy }: { onCopy?: (value: string) => void }) {
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [aiConstants, setAiConstants] = useState<Constant[]>([])
  const [isSearchingAI, setIsSearchingAI] = useState(false)

  const localFiltered = CONSTANTS.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.symbol.toLowerCase().includes(search.toLowerCase()) ||
    c.subject.toLowerCase().includes(search.toLowerCase())
  )

  const allFiltered = [...localFiltered, ...aiConstants.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.symbol.toLowerCase().includes(search.toLowerCase()) ||
    c.subject.toLowerCase().includes(search.toLowerCase())
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
          body: JSON.stringify({ type: 'constant', query: search })
        });
        
        const result = await res.json();
        if (result.success && result.data) {
          const aiConstant = {
            id: `ai-${Date.now()}`,
            name: result.data.name,
            symbol: result.data.symbol,
            value: result.data.value,
            unit: result.data.unit,
            subject: result.data.subject
          };
          setAiConstants(prev => [...prev, aiConstant]);
        }
      } catch (err) {
        console.error('AI search failed', err);
      } finally {
        setIsSearchingAI(false);
      }
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [search, localFiltered.length]);

  const handleCopy = (c: Constant) => {
    navigator.clipboard.writeText(c.value)
    setCopiedId(c.id)
    if (onCopy) onCopy(c.value)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col h-full bg-card gap-4">
      <div className="relative flex-shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search constants or subjects..."
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
            No constants found locally or via AI.
          </div>
        )}
        {!isSearchingAI && allFiltered.length === 0 && search.length === 0 && (
          <div className="text-center text-muted-foreground text-sm mt-8">
            No constants found.
          </div>
        )}
        {allFiltered.map(c => (
          <div key={c.id} className="group flex flex-col p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {c.name}
                  {c.id.startsWith('ai-') && <Bot className="w-3 h-3 text-purple-500" />}
                </h4>
                <span className="font-serif text-muted-foreground italic text-sm mb-1 block">({c.symbol})</span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-purple-500/80">{c.subject}</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleCopy(c)}
              >
                {copiedId === c.id ? <CheckCircle2 size={14} className="text-green-500" /> : <Copy size={14} />}
              </Button>
            </div>
            <div className="bg-background/50 p-2 rounded border border-border/50 flex justify-between items-center text-sm font-mono text-foreground">
              <span>{c.value}</span>
              {c.unit && <span className="text-muted-foreground text-xs">{c.unit}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
