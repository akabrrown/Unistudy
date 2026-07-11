'use client'

import { useState } from "react"
import Link from 'next/link'
import {
  Brain, ArrowRight, Play, Layers,
  Upload, Zap, CheckCircle, Eye,
  Globe, MessageCircle, Share2
} from "lucide-react"

function Badge({ children, variant = "default", className = "" }: {
  children: React.ReactNode; variant?: "default" | "pro" | "new" | "success" | "warning" | "error"; className?: string;
}) {
  const styles: Record<string, string> = {
    default: "bg-[#EDE7F6] text-[#5B2D8E]",
    pro: "bg-gradient-to-r from-[#5B2D8E] to-[#7B4DB5] text-white",
    new: "bg-[#5B2D8E] text-white",
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
  const [activeTab, setActiveTab] = useState(0);
  const features = ["Explain", "Practice", "Revise", "Connect"];

  return (
    <div className="min-h-screen bg-[#FAF8FF] overflow-auto" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-[#FAF8FF]/90 backdrop-blur border-b border-[#D1C4E9]/60 px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#5B2D8E] to-[#9B72CF] flex items-center justify-center">
            <Brain size={14} color="white" />
          </div>
          <span className="font-bold text-[16px] text-[#1A0A2E]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            UniStudy <span className="text-[#5B2D8E]">AI</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-7 text-[14px] text-[#6B5A8A]">
          {["Features", "How it works", "Pricing", "Blog"].map(l => (
            <a key={l} href="#" className="hover:text-[#5B2D8E] transition-colors">{l}</a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-[14px] font-medium text-[#5B2D8E] px-4 py-2 hover:bg-[#EDE7F6] rounded-xl transition-colors">
            Log in
          </Link>
          <Link href="/signup" className="text-[14px] font-medium bg-[#5B2D8E] text-white px-5 py-2 rounded-[14px] hover:bg-[#3D1A6E] transition-colors">
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-7xl mx-auto px-8 pt-20 pb-16 grid lg:grid-cols-2 gap-12 items-center">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-1/3 w-[600px] h-[600px] bg-[#EDE7F6] rounded-full blur-[120px] opacity-50" />
        </div>
        <div className="relative space-y-6">
          <Badge variant="new">✦ AI-Powered Study Platform</Badge>
          <h1 className="text-5xl lg:text-[60px] font-bold leading-[1.1] text-[#1A0A2E]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            Study Smarter.<br />
            <span className="text-[#5B2D8E]">Score Higher.</span>
          </h1>
          <p className="text-[18px] text-[#6B5A8A] leading-relaxed max-w-md">
            Upload your lecture slides and let UniStudy AI explain, quiz, and revise with you — tailored to your university module.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link href="/signup" className="flex items-center gap-2 bg-[#5B2D8E] text-white font-semibold px-6 py-3 rounded-[14px] hover:bg-[#3D1A6E] transition-colors">
              Get Started Free <ArrowRight size={16} />
            </Link>
            <button className="flex items-center gap-2 border-[1.5px] border-[#B39DDB] text-[#5B2D8E] font-semibold px-6 py-3 rounded-[14px] hover:bg-[#EDE7F6] transition-colors">
              <Play size={15} /> Watch Demo
            </button>
          </div>
          <p className="text-[13px] text-[#9E8CB5]">No credit card required · Free forever plan</p>
        </div>

        {/* Mockup */}
        <div className="relative hidden lg:block">
          <div className="bg-white rounded-2xl shadow-[0_12px_48px_rgba(91,45,142,0.18)] border border-[#D1C4E9] p-4 overflow-hidden">
            <div className="flex items-center gap-1.5 mb-3">
              <div className="w-3 h-3 rounded-full bg-[#EDE7F6]" />
              <div className="w-3 h-3 rounded-full bg-[#EDE7F6]" />
              <div className="w-3 h-3 rounded-full bg-[#EDE7F6]" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 bg-[#F5F3FA] rounded-xl p-3">
                <div className="h-28 bg-gradient-to-br from-[#EDE7F6] to-[#D1C4E9] rounded-lg mb-3 flex items-center justify-center">
                  <Layers size={32} className="text-[#5B2D8E] opacity-40" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 bg-[#D1C4E9] rounded-full w-3/4" />
                  <div className="h-2 bg-[#D1C4E9] rounded-full w-full" />
                  <div className="h-2 bg-[#D1C4E9] rounded-full w-5/6" />
                </div>
              </div>
              <div className="space-y-2">
                {["Explain", "Quiz", "Revise"].map((t, i) => (
                  <div key={t} className={`p-2 rounded-lg border text-xs font-semibold ${i === 0 ? "bg-[#EDE7F6] border-[#5B2D8E] text-[#5B2D8E]" : "bg-white border-[#D1C4E9] text-[#9E8CB5]"}`}>{t}</div>
                ))}
                <div className="mt-3 p-2 bg-[#5B2D8E] rounded-lg text-white text-xs font-semibold text-center">✦ AI</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <div className="border-y border-[#D1C4E9] bg-[#F5F3FA] py-5 px-8">
        <div className="max-w-4xl mx-auto flex items-center gap-8 justify-center flex-wrap">
          <span className="text-[13px] text-[#9E8CB5] font-medium">Trusted by students at</span>
          {["UCL", "King's", "Manchester", "Edinburgh", "Bristol", "Imperial"].map(u => (
            <span key={u} className="text-[14px] font-bold text-[#B39DDB]">{u}</span>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-8 py-20">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-[#9B72CF] mb-3">How it works</p>
        <h2 className="text-3xl font-bold text-[#1A0A2E] mb-12" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
          From slides to mastery in 3 steps
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { n: "01", icon: Upload, title: "Upload your slides", desc: "Drag in any PDF lecture deck. We parse and structure the content automatically." },
            { n: "02", icon: Brain, title: "AI explains everything", desc: "Get layered explanations at your chosen complexity level with examples tailored to your module." },
            { n: "03", icon: Zap, title: "Practice until confident", desc: "Flashcards, quizzes, and past papers — all generated from your actual content." },
          ].map(({ n, icon: Icon, title, desc }) => (
            <div key={n} className="relative p-6 bg-[#F5F3FA] rounded-[18px] border border-[#D1C4E9]">
              <span className="text-5xl font-black text-[#EDE7F6] absolute top-4 right-5 select-none">{n}</span>
              <div className="w-11 h-11 rounded-xl bg-[#EDE7F6] flex items-center justify-center text-[#5B2D8E] mb-4">
                <Icon size={20} />
              </div>
              <h3 className="text-[16px] font-bold text-[#1A0A2E] mb-2" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{title}</h3>
              <p className="text-[14px] text-[#6B5A8A] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features tabs */}
      <section className="bg-[#F5F3FA] py-20 px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-[#1A0A2E] mb-8" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            Everything you need to excel
          </h2>
          <div className="flex gap-2 mb-8 flex-wrap">
            {features.map((f, i) => (
              <button key={f} onClick={() => setActiveTab(i)}
                className={`px-5 py-2 rounded-full text-[14px] font-semibold transition-all ${activeTab === i ? "bg-[#5B2D8E] text-white" : "bg-white border border-[#D1C4E9] text-[#6B5A8A] hover:border-[#5B2D8E] hover:text-[#5B2D8E]"}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              {[
                ["Layered explanations", "Choose depth from ELI5 to expert-level"],
                ["Contextual examples", "Real-world analogies from your field"],
                ["Key term highlighting", "Important vocabulary auto-identified"],
                ["Voice readout (TTS)", "Listen while you commute or exercise"],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-3">
                  <CheckCircle size={18} className="text-[#5B2D8E] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[14px] font-semibold text-[#1A0A2E]">{title}</p>
                    <p className="text-[13px] text-[#6B5A8A]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-[#D1C4E9] shadow-[0_4px_8px_rgba(91,45,142,0.10)] p-6 h-48 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-[#EDE7F6] rounded-xl flex items-center justify-center mx-auto text-[#5B2D8E]">
                  <Eye size={22} />
                </div>
                <p className="text-[13px] text-[#9E8CB5]">Feature preview</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-8 py-20">
        <h2 className="text-3xl font-bold text-[#1A0A2E] mb-3" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Simple pricing</h2>
        <p className="text-[#6B5A8A] mb-12">Start free, upgrade when you're ready.</p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: "Free", price: "£0", period: "/month", cta: "Get started", popular: false, features: ["3 lectures per month", "Basic explanations", "50 flashcards", "Community access"] },
            { name: "Pro", price: "£9", period: "/month", cta: "Start Pro", popular: true, features: ["Unlimited lectures", "Advanced AI explanations", "Unlimited flashcards & quizzes", "Past paper simulator", "Analytics dashboard", "Priority support"] },
            { name: "Enterprise", price: "Custom", period: "", cta: "Contact us", popular: false, features: ["Everything in Pro", "University-wide deployment", "Admin dashboard", "LMS integration", "Dedicated CSM"] },
          ].map(({ name, price, period, cta, popular, features }) => (
            <div key={name} className={`rounded-[18px] border p-6 relative ${popular ? "border-[#5B2D8E] shadow-[0_12px_24px_rgba(91,45,142,0.14)] -translate-y-2" : "border-[#D1C4E9]"}`}>
              {popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Badge variant="pro">Most Popular</Badge></div>}
              {popular && <div className="h-1 bg-gradient-to-r from-[#5B2D8E] to-[#9B72CF] rounded-t-full -mx-6 -mt-6 mb-6" />}
              <p className="text-[13px] font-semibold text-[#9E8CB5] uppercase tracking-widest mb-2">{name}</p>
              <div className="flex items-end gap-1 mb-5">
                <span className="text-3xl font-black text-[#1A0A2E]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{price}</span>
                <span className="text-[#9E8CB5] text-[14px] mb-1">{period}</span>
              </div>
              <Link href="/signup" className={`block text-center w-full py-2.5 rounded-[12px] text-[14px] font-semibold mb-5 transition-colors ${popular ? "bg-[#5B2D8E] text-white hover:bg-[#3D1A6E]" : "border border-[#D1C4E9] text-[#5B2D8E] hover:bg-[#EDE7F6]"}`}>
                {cta}
              </Link>
              <ul className="space-y-2.5">
                {features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-[#3D2B5E]">
                    <CheckCircle size={14} className="text-[#5B2D8E] flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-[#3D1A6E] py-16 px-8 text-center">
        <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
          Ready to transform your studies?
        </h2>
        <p className="text-[#D1C4E9] mb-8 text-[17px]">Join 50,000+ students already studying smarter.</p>
        <Link href="/signup" className="inline-block bg-white text-[#5B2D8E] font-bold px-8 py-3.5 rounded-[14px] hover:bg-[#EDE7F6] transition-colors">
          Start for free today
        </Link>
      </section>

      {/* Footer */}
      <footer className="bg-[#F5F3FA] border-t border-[#D1C4E9] px-8 py-12">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {[
            { title: "Product", links: ["Features", "Pricing", "Changelog", "Roadmap"] },
            { title: "Resources", links: ["Documentation", "Blog", "Study guides", "API"] },
            { title: "Company", links: ["About", "Careers", "Press", "Contact"] },
            { title: "Legal", links: ["Privacy", "Terms", "Cookies", "GDPR"] },
          ].map(({ title, links }) => (
            <div key={title}>
              <p className="text-[12px] font-semibold tracking-widest uppercase text-[#9E8CB5] mb-3">{title}</p>
              <ul className="space-y-2">
                {links.map(l => <li key={l}><a href="#" className="text-[14px] text-[#6B5A8A] hover:text-[#5B2D8E] transition-colors">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center pt-6 border-t border-[#D1C4E9] flex-wrap gap-4">
          <p className="text-[13px] text-[#9E8CB5]">© 2025 UniStudy AI Ltd. All rights reserved.</p>
          <div className="flex gap-4 text-[#B39DDB]">
            <Globe size={16} /><MessageCircle size={16} /><Share2 size={16} />
          </div>
        </div>
      </footer>
    </div>
  )
}
