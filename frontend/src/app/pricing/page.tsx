import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Zap, Coins, Check, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { MarketingNavbar } from '@/components/layout/MarketingNavbar';
import { MarketingFooter } from '@/components/layout/MarketingFooter';
import CheckoutButton from './checkout-button';

export const revalidate = 60; // Edge cached with ISR revalidation

export default function PricingPage() {
  const bundles = [
    {
      id: 'starter',
      name: 'Starter',
      price: 10,
      credits: 100,
      description: 'Perfect for a quick top-up during finals week.',
      popular: false
    },
    {
      id: 'standard',
      name: 'Standard',
      price: 25,
      credits: 300,
      description: 'Our most popular bundle for regular study sessions.',
      popular: true
    },
    {
      id: 'value',
      name: 'Value',
      price: 50,
      credits: 700,
      description: 'Great value for the dedicated student.',
      popular: false
    },
    {
      id: 'bulk',
      name: 'Bulk',
      price: 100,
      credits: 1600,
      description: 'For power users. Never run out of credits.',
      popular: false
    }
  ];

  return (
    <div className='min-h-screen bg-[#F8F9FD] dark:bg-[#040416] text-foreground transition-colors' style={{ fontFamily: "Inter, sans-serif" }}>
      <MarketingNavbar />
      
      <div className='py-24 px-8'>
        
        {/* Header Section */}
        <div className='max-w-4xl mx-auto text-center space-y-6 mb-20'>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FEF8E7] dark:bg-[#00004E]/40 text-[#00004E] dark:text-[#D89A06] text-sm font-bold tracking-wide border border-[#D89A06]/30 mb-2">
            <ShieldCheck size={16} />
            The No-Subscription Guarantee
          </div>
          <h1 className='text-5xl md:text-6xl font-black tracking-tight text-[#00004E] dark:text-white'>
            Pay only for what you <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00004E] via-[#D89A06] to-[#D89A06] dark:from-[#D89A06] dark:to-white">actually use.</span>
          </h1>
          <p className='text-xl text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed max-w-3xl mx-auto'>
            Subscriptions are a trap for students. Why pay a monthly fee when you only study heavily during midterms and finals? With our Pay-As-You-Go credit system, your credits never expire.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className='grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto pt-4'>
          {bundles.map((bundle) => (
            <Card
              key={bundle.name}
              className={`flex flex-col border transition-all duration-300 relative overflow-visible ${
                bundle.popular 
                  ? 'border-2 border-[#D89A06] bg-white dark:bg-[#0A0A28] shadow-2xl md:-translate-y-4 z-10' 
                  : 'border-[#D9E0EE] dark:border-white/10 bg-white/50 dark:bg-[#0A0A28]/50 shadow-sm hover:shadow-md'
              }`}
            >
              {bundle.popular && (
                <div className='absolute -top-4 inset-x-0 flex justify-center z-20 pointer-events-none'>
                  <span className='bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-lg inline-flex items-center gap-2 whitespace-nowrap pointer-events-auto border-2 border-[#D89A06]'>
                    <Zap className='w-3.5 h-3.5' fill="currentColor" />
                    Most Popular
                  </span>
                </div>
              )}

              <CardHeader className={bundle.popular ? 'pt-10 pb-6' : 'pt-8 pb-6'}>
                <CardTitle className={`text-2xl font-black text-[#00004E] dark:text-white`}>
                  {bundle.name}
                </CardTitle>
                <CardDescription className="text-[#4B526B] dark:text-[#A3A8C2] min-h-[40px] mt-2">
                  {bundle.description}
                </CardDescription>
                
                <div className='mt-8 mb-2 flex items-baseline text-5xl font-black text-[#00004E] dark:text-white'>
                  <span className="text-2xl text-[#D89A06] mr-1 font-bold">GH₵</span>{bundle.price}
                </div>
                
                <div className='inline-flex items-center justify-center gap-2 text-[#00004E] dark:text-[#D89A06] font-bold bg-[#FEF8E7] dark:bg-[#00004E]/50 border border-[#D89A06]/20 px-4 py-2 rounded-xl mt-2 w-full'>
                  <Coins className='w-5 h-5 text-[#D89A06]' /> {bundle.credits} Credits
                </div>
              </CardHeader>

              <CardContent className='flex-1 px-8 pt-4 pb-8'>
                <ul className='space-y-4 text-[15px] font-medium text-[#00004E] dark:text-white'>
                  <li className='flex items-start gap-3'>
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${bundle.popular ? 'bg-[#FEF8E7] text-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E]' : 'bg-[#F0F3F9] dark:bg-white/10 text-[#4B526B]'}`}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                    Credits never expire
                  </li>
                  <li className='flex items-start gap-3'>
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${bundle.popular ? 'bg-[#FEF8E7] text-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E]' : 'bg-[#F0F3F9] dark:bg-white/10 text-[#4B526B]'}`}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                    Use on any AI feature
                  </li>
                  <li className='flex items-start gap-3'>
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${bundle.popular ? 'bg-[#FEF8E7] text-[#00004E] dark:bg-[#D89A06] dark:text-[#00004E]' : 'bg-[#F0F3F9] dark:bg-white/10 text-[#4B526B]'}`}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                    Access to Smart &amp; Fast models
                  </li>
                </ul>
              </CardContent>

              <CardFooter className="px-8 pb-8">
                <CheckoutButton 
                  bundle_id={bundle.id}
                  label="Purchase Credits"
                  className={`w-full py-3.5 rounded-xl font-bold transition-all duration-300 border ${
                    bundle.popular 
                      ? 'bg-[#00004E] text-white hover:bg-[#000038] border-2 border-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#B88205] shadow-lg shadow-[#00004E]/20 hover:-translate-y-0.5' 
                      : 'bg-[#FEF8E7] dark:bg-transparent text-[#00004E] dark:text-white border border-[#D89A06]/40 dark:border-white/20 hover:bg-[#FDF2D0] dark:hover:bg-white/5'
                  }`}
                />
              </CardFooter>
            </Card>
          ))}
        </div>
        
        {/* Deep Dive Explainer Section */}
        <div className='max-w-5xl mx-auto mt-32'>
          <div className="grid md:grid-cols-2 gap-12">
            
            {/* Free Tier Info */}
            <div className="bg-white dark:bg-[#0A0A28] rounded-[32px] p-10 border-2 border-[#D89A06]/30 dark:border-white/10 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[#00004E] text-[#D89A06] border border-[#D89A06]/40 flex items-center justify-center mb-6 shadow-xs">
                <Clock size={24} />
              </div>
              <h3 className="text-2xl font-bold text-[#00004E] dark:text-white mb-4">Generous Free Daily Limits</h3>
              <p className="text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed mb-6">
                You get a generous free daily allowance of AI requests (e.g. 50 Fast Model requests, 10 Smart Model requests) that resets every single midnight. 
              </p>
              <div className="p-4 bg-[#F0F3F9] dark:bg-white/5 rounded-xl border border-[#D9E0EE] dark:border-transparent">
                <p className="text-sm font-medium text-[#00004E] dark:text-white">
                  Most students only ever need to buy credits during midterms and finals week when their study volume skyrockets.
                </p>
              </div>
            </div>

            {/* Model Tier Info */}
            <div className="bg-white dark:bg-[#0A0A28] rounded-[32px] p-10 border border-[#D9E0EE] dark:border-white/10 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[#FFF4E5] dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400 mb-6">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-2xl font-bold text-[#00004E] dark:text-white mb-4">Smart vs Fast Models</h3>
              <p className="text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed mb-6">
                Not all AI models are created equal. You have full control over which model processes your requests.
              </p>
              <ul className="space-y-4 text-[#00004E] dark:text-white font-medium">
                <li className="flex gap-3">
                  <span className="font-bold text-[#00004E] dark:text-[#D89A06]">Fast Tier:</span> 
                  <span>(1x Multiplier) Uses Groq 8B or Gemini Flash for instant, cheap answers.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-orange-600 dark:text-orange-400">Smart Tier:</span> 
                  <span>(10x Multiplier) Uses Groq 70B or Claude for deep, complex essay grading and analysis.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>

      </div>
      <MarketingFooter />
    </div>
  );
}
