'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface PricingCardsProps {
  currentPlan?: string
}

export function PricingCards({ currentPlan = 'free' }: PricingCardsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleCheckout = async (plan: 'pro' | 'enterprise') => {
    try {
      setIsLoading(plan)
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize checkout')
      }
      
      // Redirect to Stripe checkout url
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(null)
    }
  }

  const handlePortal = async () => {
    try {
      setIsLoading('portal')
      const res = await fetch('/api/payments/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to open portal')
      if (data.url) window.location.href = data.url
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {/* Free Plan */}
      <Card className={`relative ${currentPlan === 'free' ? 'border-primary ring-1 ring-primary' : ''}`}>
        {currentPlan === 'free' && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs rounded-full font-medium">
            Current Plan
          </div>
        )}
        <CardHeader>
          <CardTitle>Free</CardTitle>
          <CardDescription>Essential study tools for everyone.</CardDescription>
          <div className="mt-4">
            <span className="text-4xl font-bold">$0</span>
            <span className="text-muted-foreground"> / month</span>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> 3 Courses</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> 5 Lectures per course</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> 30 AI Explanations / day</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> 2 Flashcard Decks / month</li>
            <li className="flex items-center gap-2 text-muted-foreground"><Check className="w-4 h-4 opacity-50" /> No Textbook Q&A</li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button className="w-full" variant={currentPlan === 'free' ? 'outline' : 'secondary'} disabled>
            {currentPlan === 'free' ? 'Active' : 'Included'}
          </Button>
        </CardFooter>
      </Card>

      {/* Pro Plan */}
      <Card className={`relative border-primary/50 shadow-lg ${currentPlan === 'pro' ? 'border-primary ring-2 ring-primary scale-105' : ''}`}>
        {currentPlan === 'pro' && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs rounded-full font-medium shadow-sm">
            Current Plan
          </div>
        )}
        <CardHeader>
          <CardTitle className="text-primary">Pro</CardTitle>
          <CardDescription>For students who want to ace their exams.</CardDescription>
          <div className="mt-4">
            <span className="text-4xl font-bold">$4.99</span>
            <span className="text-muted-foreground"> / month</span>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Unlimited Courses</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Unlimited Lectures</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Unlimited AI Explanations</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Textbook Q&A Included</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Priority AI processing</li>
          </ul>
        </CardContent>
        <CardFooter>
          {currentPlan === 'pro' ? (
             <Button className="w-full" variant="outline" onClick={handlePortal} disabled={isLoading === 'portal'}>
               Manage Subscription
             </Button>
          ) : (
            <Button 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" 
              onClick={() => handleCheckout('pro')}
              disabled={isLoading === 'pro' || currentPlan === 'enterprise'}
            >
              {isLoading === 'pro' ? 'Loading...' : 'Upgrade to Pro'}
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Enterprise Plan */}
      <Card className={`relative ${currentPlan === 'enterprise' ? 'border-primary ring-1 ring-primary' : ''}`}>
        {currentPlan === 'enterprise' && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs rounded-full font-medium">
            Current Plan
          </div>
        )}
        <CardHeader>
          <CardTitle>Enterprise</CardTitle>
          <CardDescription>For study groups & power users.</CardDescription>
          <div className="mt-4">
            <span className="text-4xl font-bold">$14.99</span>
            <span className="text-muted-foreground"> / month</span>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Everything in Pro</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Unlimited Study Groups</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Dedicated Support</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Custom Branding</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> Analytics Data Export</li>
          </ul>
        </CardContent>
        <CardFooter>
          {currentPlan === 'enterprise' ? (
            <Button className="w-full" variant="outline" onClick={handlePortal} disabled={isLoading === 'portal'}>
              Manage Subscription
            </Button>
          ) : (
            <Button 
              className="w-full" 
              variant="outline" 
              onClick={() => handleCheckout('enterprise')}
              disabled={isLoading === 'enterprise'}
            >
              {isLoading === 'enterprise' ? 'Loading...' : 'Upgrade to Enterprise'}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
