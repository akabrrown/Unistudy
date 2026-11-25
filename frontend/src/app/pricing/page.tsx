import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Coins, Check, ShieldCheck, Clock, Layers } from 'lucide-react';
import { MarketingNavbar } from '@/components/layout/MarketingNavbar';
import { MarketingFooter } from '@/components/layout/MarketingFooter';
import CheckoutButton from './checkout-button';
import { WorkloadEstimator } from './WorkloadEstimator';

export const revalidate = 60;

export default function PricingPage() {
  const bundles = [
    {
      id: 'starter',
      name: 'Starter',
      price: 10,
      credits: 100,
      unitRate: 'GH₵0.10 / credit',
      description: 'Quick revision top-up for mid-semester tests.',
      popular: false,
      highlights: [
        '~25 full lecture deck breakdowns',
        '~12 graded 120-min mock exams',
        'Permanent balance · never expires',
      ],
    },
    {
      id: 'standard',
      name: 'Standard',
      price: 25,
      credits: 300,
      unitRate: 'GH₵0.083 / credit',
      description: 'Covers 5–6 courses across an entire exam period.',
      popular: true,
      highlights: [
        '~75 lecture deck & cheat-sheet runs',
        '~35 graded past papers + drills',
        'Saves 17% per credit vs Starter',
      ],
    },
    {
      id: 'value',
      name: 'Value',
      price: 50,
      credits: 700,
      unitRate: 'GH₵0.071 / credit',
      description: 'Built for quantitative, accounting, and law workloads.',
      popular: false,
      highlights: [
        '~175 slide decks, OCR scans & graphs',
        '~85 full past exam simulations',
        'Saves 29% per credit · zero expiry',
      ],
    },
    {
      id: 'bulk',
      name: 'Scholar Bulk',
      price: 100,
      credits: 1600,
      unitRate: 'GH₵0.063 / credit',
      description: 'Multi-semester reserve for heavy daily study.',
      popular: false,
      highlights: [
        '400+ lecture decks, essays & math plots',
        '190+ graded mock examination papers',
        'Lowest cost · saves 37% per credit',
      ],
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#F8F9FD] dark:bg-[#040416] text-foreground transition-colors">
      <MarketingNavbar />

      <main className="py-16 md:py-24 px-6 sm:px-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center space-y-3.5 mb-12">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#00004E] dark:text-[#D89A06]">
            <ShieldCheck size={15} className="text-[#D89A06]" />
            <span>Zero Monthly Subscriptions · Credits Never Expire</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[#00004E] dark:text-white text-balance">
            Pay only during <span className="text-[#D89A06]">exam season.</span>
          </h1>
          <p className="text-base md:text-lg text-[#4B526B] dark:text-[#A3A8C2] max-w-2xl mx-auto">
            Every student receives 8 free passes every 6 hours automatically. Top up permanent credits via Mobile Money or card only when you want extra revision volume.
          </p>
        </div>

        {/* Interactive Semester Workload Estimator */}
        <WorkloadEstimator />

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {bundles.map((bundle) => (
            <Card
              key={bundle.id}
              className={`flex flex-col justify-between rounded-2xl transition-all relative ${
                bundle.popular
                  ? 'border-2 border-[#00004E] dark:border-[#D89A06] bg-white dark:bg-[#0A0A28] shadow-lg'
                  : 'border border-border/80 bg-white dark:bg-[#0A0A28] shadow-2xs hover:border-[#D89A06]/50'
              }`}
            >
              {bundle.popular && (
                <div className="absolute -top-3 left-6">
                  <span className="bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] px-3 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider">
                    Most Chosen
                  </span>
                </div>
              )}

              <div>
                <CardHeader className="pt-7 pb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-[#00004E] dark:text-white">
                      {bundle.name}
                    </CardTitle>
                    <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                      {bundle.unitRate}
                    </span>
                  </div>
                  <CardDescription className="text-xs text-[#4B526B] dark:text-[#A3A8C2] min-h-[34px]">
                    {bundle.description}
                  </CardDescription>

                  <div className="pt-3 flex items-baseline gap-1 text-4xl font-black text-[#00004E] dark:text-white font-mono tabular-nums">
                    <span className="text-lg text-[#D89A06] font-bold">GH₵</span>
                    {bundle.price}
                  </div>

                  <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#00004E] dark:text-[#D89A06] pt-1 tabular-nums">
                    <Coins className="w-4 h-4 text-[#D89A06]" />
                    <span>{bundle.credits.toLocaleString()} Permanent Credits</span>
                  </div>
                </CardHeader>

                <CardContent className="px-6 pt-2 pb-6 border-t border-border/50">
                  <ul className="space-y-2.5 text-xs text-foreground/90 pt-3">
                    {bundle.highlights.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <Check size={14} className="text-[#D89A06] shrink-0 mt-0.5" strokeWidth={2.5} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </div>

              <CardFooter className="px-6 pb-6 pt-0">
                <CheckoutButton
                  bundle_id={bundle.id}
                  label={`Buy ${bundle.credits} Credits`}
                  className={`w-full h-10 rounded-xl text-xs font-bold transition-colors ${
                    bundle.popular
                      ? 'bg-[#00004E] text-white hover:bg-[#000038] border border-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#C28905]'
                      : 'bg-muted/60 hover:bg-muted text-foreground border border-border'
                  }`}
                />
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Open Hair-Line Value Summary */}
        <section className="mt-16 pt-10 border-t border-border/60 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1 border-l-2 border-[#D89A06] pl-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Clock size={13} className="text-[#D89A06]" />
              <span>Refills Every 6 Hours</span>
            </div>
            <div className="text-lg font-black font-mono text-[#00004E] dark:text-white tabular-nums">
              8 Free Passes
            </div>
            <div className="text-xs text-muted-foreground">Consumed before paid credits</div>
          </div>

          <div className="space-y-1 border-l border-border/80 pl-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Layers size={13} className="text-[#D89A06]" />
              <span>New Student Bonus</span>
            </div>
            <div className="text-lg font-black font-mono text-[#00004E] dark:text-white tabular-nums">
              20 Free Credits
            </div>
            <div className="text-xs text-muted-foreground">Credited automatically on sign-up</div>
          </div>

          <div className="space-y-1 border-l border-border/80 pl-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Check size={13} className="text-[#D89A06]" />
              <span>Carry Over Semesters</span>
            </div>
            <div className="text-lg font-black font-mono text-[#00004E] dark:text-white">
              Never Expire
            </div>
            <div className="text-xs text-muted-foreground">Unused credits stay in your wallet</div>
          </div>

          <div className="space-y-1 border-l border-border/80 pl-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ShieldCheck size={13} className="text-[#D89A06]" />
              <span>Paystack Verified</span>
            </div>
            <div className="text-lg font-black font-mono text-[#00004E] dark:text-white">
              MoMo &amp; Visa
            </div>
            <div className="text-xs text-muted-foreground">MTN MoMo, Telecel, AT Money &amp; Card</div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
