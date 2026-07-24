'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Props {
  feature: string
  provider: string
  reason: 'limit_reached' | 'feature_locked' | 'free_tier_suspended' | 'pool_disabled'
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuotaExhaustedModal({ feature, provider, reason, open, onOpenChange }: Props) {
  const router = useRouter()

  const handleTopup = () => {
    onOpenChange(false)
    router.push('/pricing')
  }

  const getMessage = () => {
    if (reason === 'pool_disabled' || reason === 'free_tier_suspended') {
      return "This AI provider is experiencing extremely high demand and is temporarily unavailable for free tier."
    }
    
    // limit_reached
    return "You have exhausted your daily free allowance and do not have enough credits to use this feature. Please top up your wallet."
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[var(--color-plum-500)]" />
            Quota Exhausted
          </DialogTitle>
          <DialogDescription>
            {getMessage()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-4">
          <Button 
            onClick={handleTopup} 
            className="w-full bg-[var(--color-plum-500)] hover:bg-[var(--color-plum-600)] text-white"
          >
            Top Up Credits
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
