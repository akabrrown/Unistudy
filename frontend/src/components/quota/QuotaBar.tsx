'use client'

import { useEffect, useState } from 'react'
import { Coins, Zap } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import Link from 'next/link'

export function QuotaBar() {
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    apiFetch('/quota/status')
      .then(data => {
        if (!data.error && data.wallet_balance !== undefined) {
          setBalance(data.wallet_balance)
        }
      })
      .catch(console.error)
  }, [])

  if (balance === null) return null

  return (
    <Link href="/pricing" className="fixed bottom-4 left-4 bg-background border border-border rounded-full shadow-lg px-4 py-2 z-50 flex items-center gap-2 hover:bg-muted transition-colors cursor-pointer group">
      <div className="bg-[var(--color-plum-100)] dark:bg-[var(--color-plum-900)] p-1.5 rounded-full text-[var(--color-plum-600)] dark:text-[var(--color-plum-400)]">
        <Coins className="w-4 h-4" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-none mb-0.5">
          Wallet Balance
        </span>
        <span className="text-sm font-bold text-foreground leading-none">
          {balance} Credits
        </span>
      </div>
      <Zap className="w-4 h-4 text-muted-foreground ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  )
}
