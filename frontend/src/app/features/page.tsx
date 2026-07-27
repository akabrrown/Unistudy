"use client";

import { useState } from "react";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { CheckCircle, Brain, Zap, BookOpen, Users, Trophy, GraduationCap } from "lucide-react";

const tabData = [
  { // Explain
    icon: Brain,
    previewText: "AI Explanation Preview",
    items: [
      ["Layered explanations", "Choose depth from ELI5 to expert-level"],
      ["Contextual examples", "Real-world analogies from your field"],
      ["Key term highlighting", "Important vocabulary auto-identified"],
      ["Voice readout (TTS)", "Listen while you commute or exercise"],
    ]
  },
  { // Practice
    icon: Zap,
    previewText: "Quiz & Flashcard Engine",
    items: [
      ["Auto-generated Quizzes", "Multiple choice and short answer questions"],
      ["Smart Flashcards", "Spaced repetition algorithms to boost memory"],
      ["Past Paper Simulator", "Practice under timed, exam-like conditions"],
      ["Instant Feedback", "Understand why your answer was wrong immediately"],
    ]
  },
  { // Revise
    icon: BookOpen,
    previewText: "Smart Revision Dashboard",
    items: [
      ["Study Calendar", "AI plans your revision schedule before exams"],
      ["Performance Analytics", "Track weak points across all your modules"],
      ["Semantic Search", "Find exact concepts instantly from your notes"],
      ["Summary Sheets", "One-page cheat sheets generated from lectures"],
    ]
  },
  { // Connect & Gamify
    icon: Trophy,
    previewText: "Gamification & Community",
    items: [
      ["Level Up System", "Earn XP and climb ranks from Beginner to Legendary"],
      ["Custom Profiles", "Showcase your avatar, titles, and study stats"],
      ["Study Groups", "Join cohorts taking the exact same modules"],

    ]
  }
];

export default function FeaturesPage() {
  const [activeTab, setActiveTab] = useState(0);
  const features = ["Explain", "Practice", "Revise", "Gamify"];

  return (
    <div className="min-h-screen bg-[#FAF8FF] dark:bg-[#0F0C29] transition-colors" style={{ fontFamily: "Inter, sans-serif" }}>
      <MarketingNavbar />
      <main className="max-w-7xl mx-auto px-8 py-20">
        <h1 className="text-5xl font-bold text-[#1A0A2E] dark:text-white mb-6 text-center">Powerful Features for Smarter Study</h1>
        <p className="text-xl text-[#6B5A8A] dark:text-[#B39DDB] text-center max-w-3xl mx-auto mb-16">
          Everything you need to turn chaotic lecture notes into structured, retained knowledge.
        </p>

        <section className="bg-white dark:bg-[#1A0A2E] rounded-3xl border border-[#D1C4E9] dark:border-white/10 shadow-sm py-16 px-8 mb-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-[#1A0A2E] dark:text-white mb-8" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Everything you need to excel
            </h2>
            <div className="flex gap-2 mb-8 flex-wrap">
              {features.map((f, i) => (
                <button key={f} onClick={() => setActiveTab(i)}
                  className={`px-5 py-2 rounded-full text-[14px] font-semibold transition-all ${activeTab === i ? "bg-[#5B2D8E] text-white" : "bg-white dark:bg-transparent border border-[#D1C4E9] dark:border-white/10 text-[#6B5A8A] dark:text-[#B39DDB] hover:border-[#5B2D8E] hover:text-[#5B2D8E]"}`}>
                  {f}
                </button>
              ))}
            </div>
            
            <div className="grid md:grid-cols-2 gap-12 items-center min-h-[300px]">
              <div className="space-y-6">
                {tabData[activeTab].items.map(([title, desc]) => (
                  <div key={title} className="flex gap-4">
                    <CheckCircle size={22} className="text-[#5B2D8E] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[16px] font-bold text-[#1A0A2E] dark:text-white mb-1">{title}</p>
                      <p className="text-[14px] text-[#6B5A8A] dark:text-[#B39DDB]">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="bg-[#FAF8FF] dark:bg-white/5 rounded-2xl border border-[#D1C4E9] dark:border-white/10 shadow-[0_4px_12px_rgba(91,45,142,0.05)] dark:shadow-none p-8 h-64 flex items-center justify-center transition-all">
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 bg-[#EDE7F6] dark:bg-[#5B2D8E]/40 rounded-xl flex items-center justify-center mx-auto text-[#5B2D8E]">
                    {(() => {
                      const ActiveIcon = tabData[activeTab].icon;
                      return <ActiveIcon size={28} />;
                    })()}
                  </div>
                  <p className="text-[14px] font-medium text-[#9E8CB5]">{tabData[activeTab].previewText}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: "AI Note Generation", desc: "Instantly turn slides and PDFs into comprehensive, structured notes." },
            { title: "YouTube Summarizer", desc: "Paste any educational YouTube link to instantly extract summaries, key points, and study notes." },
            { title: "Essay Grader", desc: "Get instant AI feedback, structural analysis, and improvement suggestions for your essays." },
            { title: "University Tailored", desc: "Course material and metrics precisely matched to your institution and degree programme." },
            { title: "Gamified Learning", desc: "Earn XP, level up, and unlock prestigious titles as you complete study sessions." },
            { title: "Audio Study Rooms", desc: "Jump into live, crystal-clear audio rooms with your peers for real-time collaboration." },
            { title: "Wellbeing Tracker", desc: "Log your mood, track your study efforts, and get AI-suggested breaks to prevent burnout." },
            { title: "Semantic Search", desc: "Ask questions and get answers cited directly from your course materials." },
            { title: "Interactive Profiles", desc: "Customize your avatar, track your analytics, and connect with peers seamlessly." },
            { title: "Smart Flashcards", desc: "Auto-generated spaced repetition flashcards that adapt to your memory curve." },
            { title: "Note Scanning (OCR)", desc: "Scan your handwritten notes and instantly convert them into searchable digital materials." },
            { title: "Performance Analytics", desc: "Track your progress, identify weak points, and improve your scores through data." },
          ].map((feature, i) => (
            <div key={i} className="bg-white dark:bg-[#1A0A2E] p-8 rounded-[24px] shadow-sm border border-[#EBE5F0] dark:border-white/10">
              <div className="w-12 h-12 bg-[#F3E5F5] dark:bg-[#5B2D8E]/40 rounded-xl mb-6 flex items-center justify-center text-[#5B2D8E] font-bold text-xl">
                {i + 1}
              </div>
              <h3 className="text-xl font-bold text-[#1A0A2E] dark:text-white mb-3">{feature.title}</h3>
              <p className="text-[#6B5A8A] dark:text-[#B39DDB] leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
