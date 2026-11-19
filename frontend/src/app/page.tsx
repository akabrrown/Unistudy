import Link from 'next/link'
import { MarketingNavbar } from '@/components/layout/MarketingNavbar'
import { MarketingFooter } from '@/components/layout/MarketingFooter'
import {
  Brain, ArrowRight, Play, Layers,
  Upload, Zap, CheckCircle, Eye,
  Globe, MessageCircle, Share2
} from "lucide-react"

export const dynamic = 'force-static';

function Badge({ children, variant = "default", className = "" }: {
  children: React.ReactNode; variant?: "default" | "pro" | "new" | "success" | "warning" | "error"; className?: string;
}) {
  const styles: Record<string, string> = {
    default: "bg-[#FEF8E7] text-[#00004E] border border-[#D89A06]/30",
    pro: "bg-[#00004E] text-[#D89A06] border border-[#D89A06]/40",
    new: "bg-[#D89A06] text-[#00004E] font-bold",
    success: "bg-[#E8F5E9] text-[#2E7D32]",
    warning: "bg-[#FFF3E0] text-[#E65100]",
    error: "bg-[#FFEBEE] text-[#B71C1C]",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}

export default function LandingPage() {

  return (
    <div className="min-h-screen bg-[#F8F9FD] dark:bg-[#040416] overflow-auto transition-colors" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Navbar */}
      <MarketingNavbar />

      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-8 pt-20 pb-16 grid lg:grid-cols-2 gap-12 items-center">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-1/3 w-[600px] h-[600px] bg-[#FEF8E7] dark:bg-[#D89A06]/10 rounded-full blur-[120px] opacity-60" />
        </div>
        <div className="relative space-y-6">
          <h1 className="text-5xl lg:text-[60px] font-bold leading-[1.1] text-[#00004E] dark:text-white" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            Elevate Learning.<br />
            Achieve Excellence.
          </h1>
          <p className="text-[18px] text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed max-w-md">
            Upload your lecture slides and let UniStudy AI explain, quiz, and revise with you, tailored to your university module.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link href="/signup" className="flex items-center gap-2 bg-[#00004E] text-white font-semibold px-6 py-3 rounded-[14px] hover:bg-[#000038] dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#B88205] transition-colors shadow-sm">
              Get Started Free <ArrowRight size={16} />
            </Link>
          </div>
          <p className="text-[13px] text-[#717894]">No credit card required · Free forever plan</p>
        </div>

        {/* Mockup */}
        <div className="relative hidden lg:block">
          <div className="bg-white dark:bg-[#0A0A28] rounded-2xl shadow-[0_12px_48px_rgba(0,0,78,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-[#D89A06]/25 dark:border-[#D89A06]/20 p-4 overflow-hidden">
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-3 h-3 rounded-full bg-[#FEF8E7] dark:bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-[#FEF8E7] dark:bg-white/10" />
              <div className="w-3 h-3 rounded-full bg-[#FEF8E7] dark:bg-white/10" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 bg-[#F0F3F9] dark:bg-white/5 rounded-xl p-3">
                <div className="h-28 bg-gradient-to-br from-[#FEF8E7] to-[#F0F3F9] dark:from-[#00004E]/50 dark:to-[#0A0A28] rounded-lg mb-3 flex items-center justify-center">
                  <Layers size={32} className="text-[#00004E] dark:text-[#D89A06] opacity-60" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 bg-[#D9E0EE] dark:bg-white/20 rounded-full w-3/4" />
                  <div className="h-2 bg-[#D9E0EE] dark:bg-white/20 rounded-full w-full" />
                  <div className="h-2 bg-[#D9E0EE] dark:bg-white/20 rounded-full w-5/6" />
                </div>
              </div>
              <div className="space-y-2">
                {["Explain", "Quiz", "Revise"].map((t, i) => (
                  <div key={t} className={`p-2 rounded-lg border text-xs font-semibold ${i === 0 ? "bg-[#FEF8E7] dark:bg-[#00004E] border-[#D89A06] dark:border-[#D89A06]/40 text-[#00004E] dark:text-[#D89A06]" : "bg-white dark:bg-transparent border-[#D9E0EE] dark:border-white/10 text-[#717894]"}`}>{t}</div>
                ))}
                <div className="mt-3 p-2 bg-[#00004E] dark:bg-[#D89A06] text-white dark:text-[#00004E] rounded-lg text-xs font-semibold text-center">Smart Summaries</div>
              </div>
            </div>
          </div>
        </div>
      </section>




      {/* Footer */}
      <MarketingFooter />
    </div>
  )
}
