'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'

export function ProviderStatusBanner() {
  const [warnings, setWarnings] = useState<{ provider: string, message: string }[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    apiFetch('/quota/status')
      .then(data => {
        if (!data.error) {
          const newWarnings: { provider: string, message: string }[] = []
          
          if (data.gemini && data.gemini.pool_pct >= 80) {
            newWarnings.push({ provider: 'Gemini', message: 'AI explanations are limited — high usage today' })
          }
          if (data.groq_70b && data.groq_70b.pool_pct >= 80) {
            newWarnings.push({ provider: 'Groq', message: 'High demand on AI calculator right now' })
          }
          if (data.cohere && data.cohere.pool_pct >= 90) {
            newWarnings.push({ provider: 'Cohere', message: 'Semantic search degraded due to high volume' })
          }

          setWarnings(newWarnings)
        }
      })
      .catch(console.error)
  }, [])

  if (dismissed || warnings.length === 0) return null

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-600 px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-medium flex gap-4">
          {warnings.map((w, i) => (
            <span key={i}>{w.message}</span>
          ))}
        </span>
      </div>
      <button onClick={() => setDismissed(true)} className="hover:bg-amber-500/20 p-1 rounded">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
