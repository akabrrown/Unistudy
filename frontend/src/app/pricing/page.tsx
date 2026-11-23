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
        <div className='max-w-3xl mx-auto text-center space-y-4 mb-16'>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FEF8E7] dark:bg-[#00004E]/40 text-[#00004E] dark:text-[#D89A06] text-xs font-bold tracking-wide border border-[#D89A06]/30">
            <ShieldCheck size={15} />
            No Monthly Subscriptions
          </div>
          <h1 className='text-4xl md:text-5xl font-black tracking-tight text-[#00004E] dark:text-white'>
            Pay only during <span className="text-[#D89A06]">exam season.</span>
          </h1>
          <p className='text-base md:text-lg text-[#4B526B] dark:text-[#A3A8C2] max-w-2xl mx-auto'>
            You get 8 free passes every 6 hours automatically. Buy permanent credits only when you need extra revision volume—they never expire.
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
        
        {/* Visual Credit Value Strip (Replaces Two 60-Word Explainer Paragraphs) */}
        <div className='max-w-6xl mx-auto mt-16'>
          <div className="rounded-2xl border border-border bg-white dark:bg-[#0A0A28] p-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#F8F9FD] dark:bg-white/5 border border-border/70 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[#D89A06]">
                <Clock size={15} />
                <span>Free Every 6 Hours</span>
              </div>
              <div className="text-lg font-black font-mono text-[#00004E] dark:text-white">8 Free Passes</div>
              <div className="text-xs text-muted-foreground">Used first before paid credits</div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F9FD] dark:bg-white/5 border border-border/70 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[#00004E] dark:text-[#D89A06]">
                <Zap size={15} />
                <span>1 Credit Covers</span>
              </div>
              <div className="text-lg font-black font-mono text-[#00004E] dark:text-white">1 Full Action</div>
              <div className="text-xs text-muted-foreground">Slide breakdown, mock exam, or essay</div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F9FD] dark:bg-white/5 border border-border/70 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Check size={15} />
                <span>Welcome Bonus</span>
              </div>
              <div className="text-lg font-black font-mono text-[#00004E] dark:text-white">20 Free Credits</div>
              <div className="text-xs text-muted-foreground">Included on every new student account</div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F9FD] dark:bg-white/5 border border-border/70 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[#D89A06]">
                <ShieldCheck size={15} />
                <span>Instant Top-Up</span>
              </div>
              <div className="text-lg font-black font-mono text-[#00004E] dark:text-white">MoMo &amp; Card</div>
              <div className="text-xs text-muted-foreground">MTN, Telecel, AT Money &amp; Visa</div>
            </div>
          </div>
        </div>

      </div>
      <MarketingFooter />
    </div>
  );
}
