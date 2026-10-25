import React from "react";
import Link from "next/link";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { GraduationCap, BookOpen, AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Academic Integrity Policy | UniStudy AI",
  description: "UniStudy AI's standards for authentic learning, ethical study habits, and university honor codes.",
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
            <ArrowLeft size={14} /> Back to home
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 rounded-xl bg-[#EDE7F6] dark:bg-white/5 text-[#5B2D8E] dark:text-[#B39DDB]">
              <GraduationCap size={24} />
            </span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1A0A2E] dark:text-white" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Academic integrity statement
            </h1>
          </div>
          <p className="text-sm text-[#6B5A8A] dark:text-[#B39DDB]">
            Last updated: <span className="font-medium text-[#1A0A2E] dark:text-white">{lastUpdated}</span> (guidelines on active recall, honor codes, and ethical revision).
          </p>
        </div>

        <div className="mb-10 p-4 md:p-5 rounded-2xl bg-[#EDE7F6]/60 dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10 flex items-start gap-3.5">
          <BookOpen className="text-[#5B2D8E] dark:text-[#B39DDB] shrink-0 mt-0.5" size={20} />
          <div className="text-xs md:text-sm text-[#4A3B66] dark:text-[#D1C4E9] leading-relaxed">
            <strong>Study principle:</strong> AI should act as a patient revision tutor that tests your comprehension and clarifies difficult concepts, <strong>never as a shortcut to bypass authentic learning</strong>. Our features are designed around active recall, spaced repetition, and step-by-step understanding.
          </div>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed text-[#4A3B66] dark:text-[#C5B7DF]">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              1. Our stance on ethical AI in higher education
            </h2>
            <p>
              University education develops critical thinking, independent problem-solving, and professional competence. Relying on automated tools to shortcut exams or copy homework without understanding undermines that foundation.
            </p>
            <p>
              UniStudy AI is built around proven study techniques:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Active recall:</strong> Testing yourself on concepts before viewing the solution.</li>
              <li><strong>Spaced repetition:</strong> Reviewing material at increasing intervals to reinforce retention.</li>
              <li><strong>Conceptual breakdown:</strong> Translating dense, jargon-heavy lecture slides into straightforward, accessible explanations.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              2. Student guidelines: permitted vs. prohibited use
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-green-50/60 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30">
                <div className="flex items-center gap-2 font-semibold text-green-900 dark:text-green-300 mb-2">
                  <CheckCircle size={18} className="text-green-600 dark:text-green-400" />
                  <span>Permitted study practices</span>
                </div>
                <ul className="text-xs text-green-800 dark:text-green-300 space-y-2 list-disc pl-4">
                  <li>Uploading course slides to generate flashcards and self-diagnostic quizzes.</li>
                  <li>Asking the tutor to explain confusing steps in diagrams, code, or mathematics.</li>
                  <li>Simulating practice tests to identify weak topics prior to examination week.</li>
                  <li>Planning revision timetables and tracking consistent daily study streaks.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
                <div className="flex items-center gap-2 font-semibold text-red-900 dark:text-red-300 mb-2">
                  <AlertTriangle size={18} className="text-red-600 dark:text-red-400" />
                  <span>Prohibited activities</span>
                </div>
                <ul className="text-xs text-red-800 dark:text-red-300 space-y-2 list-disc pl-4">
                  <li>Accessing UniStudy during active, proctored examinations or midterms.</li>
                  <li>Submitting raw AI-generated text as your own original graded coursework.</li>
                  <li>Sharing unauthorized exam questions or violating institutional honor codes.</li>
                  <li>Using the platform to misrepresent your individual academic mastery.</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              3. For faculty, lecturers, and institutions
            </h2>
            <p>
              We consider university faculty vital partners. UniStudy AI is designed to support classroom instruction so students arrive to lectures with clearer foundational understanding and stronger retention.
            </p>
            <p>
              If you are a lecturer or university administrator with questions on how UniStudy operates for your department, contact our academic liaison:
            </p>
            <div className="p-4 rounded-xl bg-[#EDE7F6]/50 dark:bg-white/5 border border-[#D1C4E9]/50 dark:border-white/10 text-sm">
              <p><strong>UniStudy AI (Academic Integrity Liaison)</strong></p>
              <p>Email: <a href="mailto:unistudy.ai@gmail.com" className="text-[#5B2D8E] dark:text-[#D1C4E9] underline font-medium">unistudy.ai@gmail.com</a></p>
            </div>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
