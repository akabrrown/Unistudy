import React from "react";
import Link from "next/link";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { GraduationCap, BookOpen, AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Academic Integrity Policy | UniStudy AI",
  description: "UniStudy AI's commitment to genuine learning, ethical study habits, and university honor codes.",
};

export default function AcademicIntegrityPage() {
  const lastUpdated = "October 25, 2026";

  return (
    <div className="min-h-screen bg-[#FAF8FF] dark:bg-[#0F0C29] text-[#1A0A2E] dark:text-[#E2D9F3] transition-colors flex flex-col font-sans">
      <MarketingNavbar />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 md:py-16">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5B2D8E] dark:text-[#B39DDB] hover:underline mb-4"
          >
            <ArrowLeft size={14} /> Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 rounded-xl bg-[#EDE7F6] dark:bg-white/5 text-[#5B2D8E] dark:text-[#B39DDB]">
              <GraduationCap size={24} />
            </span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1A0A2E] dark:text-white" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Academic Integrity Statement
            </h1>
          </div>
          <p className="text-sm text-[#6B5A8A] dark:text-[#B39DDB]">
            Last updated: <span className="font-medium text-[#1A0A2E] dark:text-white">{lastUpdated}</span> · Empowering authentic learning and institutional trust.
          </p>
        </div>

        {/* Core Philosophy Badge */}
        <div className="mb-10 p-4 md:p-5 rounded-2xl bg-[#EDE7F6]/60 dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10 flex items-start gap-3.5">
          <BookOpen className="text-[#5B2D8E] dark:text-[#B39DDB] shrink-0 mt-0.5" size={20} />
          <div className="text-xs md:text-sm text-[#4A3B66] dark:text-[#D1C4E9] leading-relaxed">
            <strong>The UniStudy Philosophy:</strong> AI should be a tireless revision tutor that tests your memory and clarifies dense concepts—<strong>never a tool to bypass the hard work of learning</strong>. We design every feature around active recall, spaced repetition, and the Feynman technique.
          </div>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed text-[#4A3B66] dark:text-[#C5B7DF]">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              1. Our Stance on Ethical AI in Higher Education
            </h2>
            <p>
              Tertiary education exists to develop critical thinkers, competent problem-solvers, and ethical professionals. Using artificial intelligence to generate shortcuts on exams or copy homework without understanding defeats the entire purpose of a university degree.
            </p>
            <p>
              UniStudy AI is deliberately engineered to facilitate <em>active learning</em>:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Active Recall:</strong> Testing yourself on concepts before seeing the answer.</li>
              <li><strong>Spaced Repetition:</strong> Reviewing material at scientifically calibrated intervals to build long-term memory.</li>
              <li><strong>The Feynman Technique:</strong> Breaking down complex, jargon-heavy lecture slides into simple, intuitive explanations.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              2. Student Guidelines: Permitted vs. Prohibited Use
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-green-50/60 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30">
                <div className="flex items-center gap-2 font-semibold text-green-900 dark:text-green-300 mb-2">
                  <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
                  <span>How You SHOULD Use UniStudy</span>
                </div>
                <ul className="text-xs text-green-800 dark:text-green-300 space-y-2 list-disc pl-4">
                  <li>Uploading your course slides to generate flashcards and self-diagnostic quizzes.</li>
                  <li>Asking the AI tutor to explain confusing diagrams or complex mathematical steps.</li>
                  <li>Simulating mock exams to discover weak topics weeks before finals.</li>
                  <li>Creating personal study revision schedules and tracking revision streaks.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
                <div className="flex items-center gap-2 font-semibold text-red-900 dark:text-red-300 mb-2">
                  <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />
                  <span>Strictly PROHIBITED Activities</span>
                </div>
                <ul className="text-xs text-red-800 dark:text-red-300 space-y-2 list-disc pl-4">
                  <li>Accessing UniStudy during active, proctored examinations or midterms.</li>
                  <li>Submitting raw AI-generated answers as your own original graded assignments.</li>
                  <li>Sharing unauthorized exam questions or violating university honor codes.</li>
                  <li>Using the platform in any manner that misrepresents your academic ability.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              3. For Faculty, Lecturers, and Institutions
            </h2>
            <p>
              We view university lecturers as essential partners. UniStudy AI is designed to augment classroom instruction so that students arrive to lectures with better foundational preparation and higher retention rates.
            </p>
            <p>
              If you are a lecturer or university administrator with questions about how UniStudy operates or if you wish to verify how our tool is being utilized for your courses, please contact our academic liaison team:
            </p>
            <div className="p-4 rounded-xl bg-[#EDE7F6]/50 dark:bg-white/5 border border-[#D1C4E9]/50 dark:border-white/10 text-sm">
              <p><strong>UniStudy AI — Academic Integrity Liaison</strong></p>
              <p>Email: <a href="mailto:academic-integrity@unistudy.ai" className="text-[#5B2D8E] dark:text-[#D1C4E9] underline font-medium">academic-integrity@unistudy.ai</a></p>
            </div>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
