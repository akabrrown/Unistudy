"use client";

import { useState } from "react";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { CheckCircle, Brain, Zap, BookOpen, Languages, Search, Video, FileText, BarChart, Heart, Target, Layers } from "lucide-react";

const tabData = [
  { // Explain
    icon: Brain,
    previewText: "AI Explanation Engine",
    items: [
      ["Layered explanations", "Choose depth from ELI5 to expert-level"],
      ["Contextual examples", "Real-world analogies from your field"],
      ["Key term highlighting", "Important vocabulary auto-identified"],
      ["Multilingual translation", "Translate any explanation into 100+ languages"],
    ]
  },
  { // Practice
    icon: Zap,
    previewText: "Quiz & Flashcard Engine",
    items: [
      ["Auto-generated Quizzes", "Multiple choice and short answer questions"],
      ["Smart Flashcards", "Spaced repetition algorithms to boost memory"],
      ["Past Paper Simulator", "Practice under timed, exam-like conditions"],
      ["Instant Feedback", "Understand exactly why your answer was wrong"],
    ]
  },
  { // Analyze
    icon: FileText,
    previewText: "Document & Video Analysis",
    items: [
      ["High-Accuracy Parsing", "Flawlessly reads PDFs, slides, and scanned notes"],
      ["YouTube Summarizer", "Extract transcripts and summaries from any video link"],
      ["Essay Grader", "Instant feedback, structural analysis, and scoring"],
      ["Semantic Search", "Find exact concepts instantly from your entire library"],
    ]
  },
  { // Optimize
    icon: Target,
    previewText: "Performance & Wellbeing",
    items: [
      ["Study Calendar", "AI plans your revision schedule before exams"],
      ["Performance Analytics", "Track weak points across all your modules"],
      ["Wellbeing Tracker", "Log your mood and avoid burnout with AI breaks"],
      ["Summary Sheets", "One-page cheat sheets generated from lengthy lectures"],
    ]
  }
];

export default function FeaturesPage() {
  const [activeTab, setActiveTab] = useState(0);
  const features = ["Explain", "Practice", "Analyze", "Optimize"];

  return (
    <div className="min-h-screen bg-[#F8F9FD] dark:bg-[#040416] transition-colors" style={{ fontFamily: "Inter, sans-serif" }}>
      <MarketingNavbar />
      <main className="max-w-7xl mx-auto px-8 py-20">
        <div className="text-center mb-16">
          <p className="text-[12px] font-bold tracking-[0.2em] uppercase text-[#D89A06] mb-4">Enterprise-Grade Study Tools</p>
          <h1 className="text-5xl md:text-6xl font-black text-[#00004E] dark:text-white mb-6 tracking-tight">
            Powerful Features for Smarter Study
          </h1>
          <p className="text-xl text-[#4B526B] dark:text-[#A3A8C2] max-w-3xl mx-auto leading-relaxed">
            Everything you need to turn chaotic lecture notes, YouTube videos, and past papers into structured, retained knowledge.
          </p>
        </div>

        <section className="bg-white dark:bg-[#0A0A28] rounded-[32px] border-2 border-[#D89A06]/35 dark:border-white/10 shadow-xl shadow-[#00004E]/5 py-16 px-8 mb-24 overflow-hidden relative">
          {/* Decorative background blur */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#D89A06]/10 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="max-w-5xl mx-auto relative z-10">
            <h2 className="text-3xl font-black text-[#00004E] dark:text-white mb-10" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              The Ultimate Study Suite
            </h2>
            <div className="flex gap-3 mb-12 flex-wrap">
              {features.map((f, i) => (
                <button key={f} onClick={() => setActiveTab(i)}
                  className={`px-6 py-2.5 rounded-full text-[15px] font-bold transition-all duration-300 ${
                    activeTab === i 
                      ? "bg-[#00004E] text-white border-2 border-[#D89A06] shadow-lg shadow-[#00004E]/25 dark:bg-[#D89A06] dark:text-[#00004E] scale-105" 
                      : "bg-[#FEF8E7] dark:bg-white/5 border border-[#D89A06]/30 text-[#00004E] dark:text-[#A3A8C2] hover:bg-[#FDF2D0] dark:hover:bg-white/10"
                  }`}>
                  {f}
                </button>
              ))}
            </div>
            
            <div className="grid md:grid-cols-2 gap-16 items-center min-h-[320px]">
              <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
                {tabData[activeTab].items.map(([title, desc], idx) => (
                  <div key={title} className="flex gap-4 group">
                    <div className="w-8 h-8 rounded-full bg-[#00004E] dark:bg-[#00004E] border border-[#D89A06]/50 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                      <CheckCircle size={16} className="text-[#D89A06]" />
                    </div>
                    <div>
                      <p className="text-[17px] font-bold text-[#00004E] dark:text-white mb-1.5">{title}</p>
                      <p className="text-[15px] text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="bg-gradient-to-br from-[#FEF8E7]/60 to-white dark:from-[#0E0E32] dark:to-[#0A0A28] rounded-[24px] border-2 border-[#D89A06]/30 shadow-2xl p-10 h-[320px] flex items-center justify-center transition-all animate-in zoom-in-95 duration-500">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-[#00004E] dark:bg-[#00004E]/50 rounded-2xl flex items-center justify-center mx-auto text-[#D89A06] shadow-sm border border-[#D89A06]/40">
                    {(() => {
                      const ActiveIcon = tabData[activeTab].icon;
                      return <ActiveIcon size={36} strokeWidth={2.5} />;
                    })()}
                  </div>
                  <p className="text-[16px] font-bold text-[#00004E] dark:text-[#D89A06] tracking-wide">{tabData[activeTab].previewText}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Layers, title: "AI Note Generation", desc: "Instantly turn unorganized slides and dense PDFs into comprehensive, structured notes." },
            { icon: Video, title: "YouTube Summarizer", desc: "Paste any educational YouTube link to instantly extract summaries, key points, and study notes." },
            { icon: Search, title: "Semantic Search", desc: "Ask questions and get answers cited directly from your course materials and notes." },
            { icon: Languages, title: "Multilingual Translation", desc: "Powered by Microsoft Translator. Study in your native language with zero friction." },
            { icon: FileText, title: "Essay Grader", desc: "Get instant AI feedback, structural analysis, and improvement suggestions for your essays." },
            { icon: BarChart, title: "Performance Analytics", desc: "Track your progress, identify weak points across modules, and improve your scores through data." },
            { icon: Zap, title: "Smart Flashcards", desc: "Auto-generated spaced repetition flashcards that adapt perfectly to your unique memory curve." },
            { icon: BookOpen, title: "Past Paper Simulator", desc: "Practice under timed, exam-like conditions using questions generated from your curriculum." },
            { icon: Heart, title: "Wellbeing Tracker", desc: "Log your mood, track your study efforts, and get AI-suggested breaks to prevent burnout." },
          ].map((feature, i) => (
            <div key={i} className="group bg-white dark:bg-[#0A0A28] p-8 rounded-[24px] shadow-sm hover:shadow-xl transition-all duration-300 border-2 border-border/80 hover:border-[#D89A06] hover:-translate-y-1">
              <div className="w-14 h-14 bg-[#00004E] text-[#D89A06] rounded-xl mb-6 flex items-center justify-center border border-[#D89A06]/40 group-hover:scale-110 transition-transform duration-300 shadow-2xs">
                <feature.icon size={24} strokeWidth={2} />
              </div>
              <h3 className="text-[19px] font-bold text-[#00004E] dark:text-white mb-3">{feature.title}</h3>
              <p className="text-[15px] text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

      </main>
      <MarketingFooter />
    </div>
  );
}
