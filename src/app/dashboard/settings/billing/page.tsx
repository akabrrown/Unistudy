'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Check, ShieldCheck, Loader2, CreditCard, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function BillingSettings() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
        setProfile(data);
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleCheckout = async () => {
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro' })
      });
      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url; // Redirect to Paystack
      } else {
        toast.error(data.error || 'Failed to initialize payment');
      }
    } catch (err) {
      toast.error('An error occurred during checkout');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your Pro subscription? You will lose access to premium AI features immediately.')) return;
    
    setCancelling(true);
    try {
      const res = await fetch('/api/payments/cancel', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Subscription cancelled successfully');
        setProfile({ ...profile, plan: 'free' });
      } else {
        toast.error(data.error || 'Failed to cancel subscription');
      }
    } catch (err) {
      toast.error('Error cancelling subscription');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const isPro = profile?.plan === 'pro';

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Billing & Subscription</h2>
        <p className="text-muted-foreground">Manage your payment methods and subscription plan.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-8 justify-between items-start">
          
          {/* Current Plan Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-500" /> Current Plan
            </h3>
            
            <div className="flex items-end gap-3">
              <span className="text-4xl font-extrabold text-primary capitalize">{profile?.plan || 'Free'}</span>
              {isPro && <span className="text-muted-foreground pb-1">Active</span>}
            </div>

            <ul className="space-y-2 text-sm text-muted-foreground">
              {isPro ? (
                <>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500"/> Unlimited AI Multimodal Notes Scanning</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500"/> Unlimited Strict JSON Essay Grading</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500"/> Advanced Audio Flashcards</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500"/> Priority Customer Support</li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-muted-foreground"/> Limited daily AI generations</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-muted-foreground"/> Standard tools and resources</li>
                </>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="w-full md:w-auto bg-muted/30 p-6 rounded-xl border border-border flex flex-col gap-4 text-center items-center">
            {isPro ? (
              <>
                <p className="text-sm font-medium text-foreground">You are on the Pro Plan</p>
                <p className="text-xs text-muted-foreground max-w-[200px] mx-auto mb-2">
                  Your subscription is managed securely.
                </p>
                <Button 
                  variant="destructive" 
                  className="w-full shadow-sm"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-2" />}
                  Cancel Subscription
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">Upgrade for GH₵ 50 / month</p>
                <p className="text-xs text-muted-foreground max-w-[200px] mx-auto mb-2">
                  Get unlimited access to all AI features.
                </p>
                <Button onClick={handleCheckout} className="w-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                  <CreditCard className="w-4 h-4 mr-2" /> Upgrade to Pro
                </Button>
                <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-widest font-bold">Secured by Paystack</p>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
