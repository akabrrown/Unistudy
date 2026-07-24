import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { Upload, Brain, Zap, Video, Scan, Trophy, Headphones, Heart, GraduationCap } from "lucide-react";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#FAF8FF] dark:bg-[#0F0C29] transition-colors" style={{ fontFamily: "Inter, sans-serif" }}>
      <MarketingNavbar />
      <main className="max-w-6xl mx-auto px-8 py-20">
        
        {/* Core Workflow Section */}
        <div className="mb-24">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-[#9B72CF] mb-3 text-center">Core Workflow</p>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A0A2E] dark:text-white mb-16 text-center" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            From material to mastery in 3 steps
          </h1>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: "01", icon: Upload, title: "Upload your slides", desc: "Drag in any PDF lecture deck. We parse and structure the content automatically based on your specific university curriculum." },
              { n: "02", icon: Brain, title: "AI explains everything", desc: "Get layered explanations at your chosen complexity level with examples tailored to your exact degree programme." },
              { n: "03", icon: Zap, title: "Practice until confident", desc: "Flashcards, quizzes, and past papers, all generated specifically from your actual lecture content." },
            ].map(({ n, icon: Icon, title, desc }) => (
              <div key={n} className="relative p-8 bg-[#F5F3FA] dark:bg-[#1A0A2E] rounded-[24px] border border-[#D1C4E9] dark:border-white/10 shadow-sm">
                <span className="text-6xl font-black text-[#EDE7F6] dark:text-[#5B2D8E]/30 absolute top-6 right-6 select-none">{n}</span>
                <div className="w-14 h-14 rounded-xl bg-[#EDE7F6] dark:bg-[#5B2D8E]/40 flex items-center justify-center text-[#5B2D8E] mb-6">
                  <Icon size={24} />
                </div>
                <h3 className="text-[20px] font-bold text-[#1A0A2E] dark:text-white mb-3" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{title}</h3>
                <p className="text-[15px] text-[#6B5A8A] dark:text-[#B39DDB] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Flexible Inputs Section */}
        <div className="mb-24">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-[#9B72CF] mb-3 text-center">Any Input</p>
          <h2 className="text-3xl font-bold text-[#1A0A2E] dark:text-white mb-12 text-center" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            Learn from any source
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              { icon: Video, title: "YouTube Videos", desc: "Paste any educational YouTube link. Our AI instantly extracts the transcript, summarizes the key points, and generates structured notes." },
              { icon: Scan, title: "Handwritten Notes (OCR)", desc: "Take a picture of your whiteboard or notebook. We'll scan, digitize, and turn your handwriting into searchable, studyable text." },
            ].map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="flex gap-6 p-8 bg-white dark:bg-[#1A0A2E] rounded-[24px] border border-[#D1C4E9] dark:border-white/10 shadow-sm">
                <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-[#EDE7F6] dark:bg-[#5B2D8E]/40 flex items-center justify-center text-[#5B2D8E]">
                  <Icon size={24} />
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-[#1A0A2E] dark:text-white mb-2" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{title}</h3>
                  <p className="text-[14px] text-[#6B5A8A] dark:text-[#B39DDB] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ecosystem & Wellbeing Section */}
        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase text-[#9B72CF] mb-3 text-center">Complete Ecosystem</p>
          <h2 className="text-3xl font-bold text-[#1A0A2E] dark:text-white mb-12 text-center" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            Stay motivated, stay healthy
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Trophy, title: "Gamification & XP", desc: "Study sessions earn you XP. Level up, unlock prestigious ranks, and customize your profile to show off your dedication." },
              { icon: Headphones, title: "Audio Study Rooms", desc: "Join real-time, crystal-clear voice channels to collaborate with peers taking the exact same courses as you." },
              { icon: Heart, title: "Wellbeing Tracker", desc: "Log your mood and anxiety levels. We'll automatically suggest optimal study breaks to ensure you avoid burnout." },
            ].map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="p-8 bg-white dark:bg-[#1A0A2E] rounded-[24px] border border-[#D1C4E9] dark:border-white/10 shadow-sm text-center">
                <div className="w-14 h-14 mx-auto rounded-xl bg-[#EDE7F6] dark:bg-[#5B2D8E]/40 flex items-center justify-center text-[#5B2D8E] mb-6">
                  <Icon size={24} />
                </div>
                <h3 className="text-[18px] font-bold text-[#1A0A2E] dark:text-white mb-3" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{title}</h3>
                <p className="text-[14px] text-[#6B5A8A] dark:text-[#B39DDB] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
