'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Check, X, Sparkles, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (plan: 'pro' | 'enterprise') => {
    setLoading(plan);
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Checkout failed');
        setLoading(null);
      }
    } catch (e) {
      console.error(e);
      setLoading(null);
    }
  };

  return (
    <div className='min-h-screen bg-background text-foreground py-20 px-6'>
      <div className='max-w-7xl mx-auto text-center space-y-4 mb-16'>
        <h1 className='text-5xl font-black tracking-tight'>Invest in your academic success.</h1>
        <p className='text-xl text-[var(--text-muted)] max-w-2xl mx-auto'>
          Choose the plan that fits your study needs. Upgrade anytime, cancel anytime.
        </p>
      </div>

      <div className='grid md:grid-cols-3 gap-8 max-w-6xl mx-auto'>
        {/* Free Plan */}
        <Card className='flex flex-col border border-border shadow-sm'>
          <CardHeader>
            <CardTitle className='text-2xl'>Free</CardTitle>
            <CardDescription>Perfect for trying out UniStudy</CardDescription>
            <div className='mt-4 flex items-baseline text-4xl font-extrabold'>
              GH₵0
              <span className='ml-1 text-xl font-medium text-muted-foreground'>/mo</span>
            </div>
          </CardHeader>
          <CardContent className='flex-1'>
            <ul className='space-y-4 text-sm text-[var(--text-primary)]'>
              <li className='flex items-center gap-3'><Check className='text-green-500 w-5 h-5'/> 3 Courses</li>
              <li className='flex items-center gap-3'><Check className='text-green-500 w-5 h-5'/> 5 Lectures per course</li>
              <li className='flex items-center gap-3'><Check className='text-green-500 w-5 h-5'/> 30 AI explanations / day</li>
              <li className='flex items-center gap-3 text-muted-foreground'><X className='text-muted-foreground opacity-50 w-5 h-5'/> Textbook Q&A</li>
              <li className='flex items-center gap-3 text-muted-foreground'><X className='text-muted-foreground opacity-50 w-5 h-5'/> Priority AI responses</li>
            </ul>
          </CardContent>
          <CardFooter>
            <button 
              onClick={() => router.push('/dashboard')}
              className='w-full py-3 rounded-xl border-2 border-border font-bold hover:bg-muted transition-colors'
            >
              Current Plan
            </button>
          </CardFooter>
        </Card>

        {/* Pro Plan */}
        <Card className='flex flex-col border-2 border-[var(--color-plum-500)] shadow-xl relative transform scale-105 z-10'>
          <div className='absolute -top-4 left-1/2 -translate-x-1/2 bg-[var(--color-plum-500)] text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1'>
            <Sparkles className='w-3 h-3' /> Most Popular
          </div>
          <CardHeader>
            <CardTitle className='text-2xl text-[var(--color-plum-700)] dark:text-[var(--color-plum-400)]'>Pro</CardTitle>
            <CardDescription>Everything you need to ace your exams</CardDescription>
            <div className='mt-4 flex items-baseline text-4xl font-extrabold'>
              GH₵49
              <span className='ml-1 text-xl font-medium text-muted-foreground'>/mo</span>
            </div>
          </CardHeader>
          <CardContent className='flex-1'>
            <ul className='space-y-4 text-sm font-medium'>
              <li className='flex items-center gap-3'><Check className='text-[var(--color-plum-500)] w-5 h-5'/> Unlimited Courses & Lectures</li>
              <li className='flex items-center gap-3'><Check className='text-[var(--color-plum-500)] w-5 h-5'/> Unlimited AI explanations</li>
              <li className='flex items-center gap-3'><Check className='text-[var(--color-plum-500)] w-5 h-5'/> Unlimited Flashcards</li>
              <li className='flex items-center gap-3'><Check className='text-[var(--color-plum-500)] w-5 h-5'/> Textbook Q&A included</li>
              <li className='flex items-center gap-3'><Check className='text-[var(--color-plum-500)] w-5 h-5'/> Full Analytics Dashboard</li>
            </ul>
          </CardContent>
          <CardFooter>
            <button 
              onClick={() => handleCheckout('pro')}
              disabled={loading === 'pro'}
              className='w-full py-3 rounded-xl bg-[var(--color-plum-600)] text-white font-bold hover:bg-[var(--color-plum-700)] transition-colors shadow-md disabled:opacity-50'
            >
              {loading === 'pro' ? 'Loading...' : 'Start 7-Day Free Trial'}
            </button>
          </CardFooter>
        </Card>

        {/* Enterprise Plan */}
        <Card className='flex flex-col border border-border shadow-sm bg-[var(--bg-subtle)]'>
          <CardHeader>
            <CardTitle className='text-2xl flex items-center gap-2'><Building2 className='w-6 h-6'/> Enterprise</CardTitle>
            <CardDescription>For institutional deployments</CardDescription>
            <div className='mt-4 flex items-baseline text-4xl font-extrabold'>
              GH₵149
              <span className='ml-1 text-xl font-medium text-muted-foreground'>/mo</span>
            </div>
          </CardHeader>
          <CardContent className='flex-1'>
            <ul className='space-y-4 text-sm text-[var(--text-primary)]'>
              <li className='flex items-center gap-3'><Check className='text-gray-700 dark:text-gray-300 w-5 h-5'/> Everything in Pro</li>
              <li className='flex items-center gap-3'><Check className='text-gray-700 dark:text-gray-300 w-5 h-5'/> Priority AI responses</li>
              <li className='flex items-center gap-3'><Check className='text-gray-700 dark:text-gray-300 w-5 h-5'/> Institutional SSO</li>
              <li className='flex items-center gap-3'><Check className='text-gray-700 dark:text-gray-300 w-5 h-5'/> Dedicated support</li>
              <li className='flex items-center gap-3'><Check className='text-gray-700 dark:text-gray-300 w-5 h-5'/> Custom branding</li>
            </ul>
          </CardContent>
          <CardFooter>
            <button 
              onClick={() => handleCheckout('enterprise')}
              disabled={loading === 'enterprise'}
              className='w-full py-3 rounded-xl border-2 border-border font-bold bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50'
            >
              {loading === 'enterprise' ? 'Loading...' : 'Subscribe Enterprise'}
            </button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
