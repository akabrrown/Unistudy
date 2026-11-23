'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  Star,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Award,
  BookOpen,
  Users,
  CheckCircle2,
} from 'lucide-react';

interface BootstrapData {
  stats: {
    totalPastPapers: number;
    totalLectures: number;
    totalCourses: number;
    totalStudents: number;
    facultiesCount: number;
  };
  faqs: Array<{
    id: string;
    category: string;
    question: string;
    answer: string;
  }> | null;
  testimonials: Array<{
    id: string;
    student_name: string;
    student_role: string;
    program: string | null;
    content: string;
    rating: number;
  }> | null;
  activeAnnouncement: {
    id: string;
    title: string;
    body: string;
    type: string;
  } | null;
}

export function LiveCmsSections() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/public/content/bootstrap')
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => {
        // Fallback gracefully
      });
  }, []);

  const stats = data?.stats || {
    totalPastPapers: 240,
    totalLectures: 120,
    totalCourses: 45,
    totalStudents: 1850,
  };

  const testimonials = data?.testimonials || [
    {
      id: 'default-1',
      student_name: 'Kofi Mensah',
      student_role: 'Level 400 Student',
      program: 'BSc Information Technology Management',
      content: 'Practicing past papers with part-by-part marking schemes helped me jump from a B to an A in Systems Analysis.',
      rating: 5,
    },
    {
      id: 'default-2',
      student_name: 'Ama Serwaa',
      student_role: 'Level 300 Student',
      program: 'BSc Accounting and Finance',
      content: 'Uploading our 70-slide Corporate Finance decks and getting exact slide citations saved me hours before midterms.',
      rating: 5,
    },
    {
      id: 'default-3',
      student_name: 'Ebenezer Boateng',
      student_role: 'Level 200 Course Rep',
      program: 'Department of Banking and Finance',
      content: 'The 120-minute timed past paper simulator feels just like the real examination hall.',
      rating: 5,
    },
  ];

  const faqs = data?.faqs || [
    {
      id: 'faq-1',
      category: 'General',
      question: 'How does UniStudy use my lecturer’s slides?',
      answer: 'Upload your PDF or PowerPoint slides and every explanation, formula, and flashcard cites the exact slide number from your deck.',
    },
    {
      id: 'faq-2',
      category: 'Billing & Credits',
      question: 'How do free passes and study credits work?',
      answer: 'You get 8 free passes that refill automatically every 6 hours plus 20 welcome credits. Top up permanent credits anytime via MTN MoMo, Telecel, or card.',
    },
    {
      id: 'faq-3',
      category: 'Past Papers',
      question: 'Can I practice past questions under timed exam conditions?',
      answer: 'Yes—start a 120-minute mock on any past paper to get instant MCQ scoring and worked model answers for theory sub-questions.',
    },
    {
      id: 'faq-4',
      category: 'Mobile & Offline',
      question: 'Does it work offline on my phone or laptop?',
      answer: 'Yes. Your courses, slide notes, flashcards, and past papers cache locally in your browser for instant offline access.',
    },
  ];

  return (
    <>
      {/* Dynamic Announcement Banner (if active from Admin CMS) */}
      {data?.activeAnnouncement && !bannerDismissed && (
        <div className="bg-[#00004E] text-white border-b-2 border-[#D89A06] py-2 px-4 text-xs font-medium flex items-center justify-between gap-4">
          <div className="max-w-7xl mx-auto flex items-center gap-2 flex-1 justify-center text-center">
            <span className="px-2 py-0.5 rounded bg-[#D89A06] text-[#00004E] font-bold text-[10px] uppercase">
              Notice
            </span>
            <span>
              <strong>{data.activeAnnouncement.title}:</strong> {data.activeAnnouncement.body}
            </span>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-white/70 hover:text-white text-xs font-mono px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Live Campus Telemetry Strip */}
      <section className="border-y border-[#D89A06]/20 bg-white/60 dark:bg-[#070720]/80 py-8 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-[#00004E] dark:text-[#D89A06] tabular-nums">
              {stats.totalCourses}+
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Syllabus Courses
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-[#00004E] dark:text-[#D89A06] tabular-nums">
              {stats.totalPastPapers}+
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Official Past Papers
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-[#00004E] dark:text-[#D89A06] tabular-nums">
              {stats.totalLectures * 30 || '3,600'}+
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Indexed Slide Topics
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-[#00004E] dark:text-[#D89A06] tabular-nums">
              {stats.totalStudents}+
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              UPSA Students
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Showcase (Live from Admin CMS) */}
      <section className="py-20 max-w-7xl mx-auto px-6 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FEF8E7] dark:bg-[#00004E] border border-[#D89A06] text-[#00004E] dark:text-[#D89A06] text-xs font-bold uppercase tracking-wider">
            <Award className="w-3.5 h-3.5 text-[#D89A06]" />
            Student Voices &amp; Honors
          </div>
          <h2 className="text-3xl font-black text-[#00004E] dark:text-white tracking-tight">
            Trusted by Top Students Across All Faculties
          </h2>
          <p className="text-sm text-muted-foreground">
            Read authentic feedback from UPSA scholars preparing for mid-semester and end-of-semester examinations.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.slice(0, 3).map((test) => (
            <div
              key={test.id}
              className="rounded-2xl border-2 border-[#D89A06]/30 bg-white dark:bg-[#0A0A28] p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#D89A06] transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: test.rating || 5 }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#D89A06] text-[#D89A06]" />
                  ))}
                </div>
                <p className="text-xs text-[#2A314E] dark:text-[#C5CCE0] leading-relaxed italic">
                  &ldquo;{test.content}&rdquo;
                </p>
              </div>

              <div className="pt-4 border-t border-[#D89A06]/20">
                <div className="font-bold text-xs text-[#00004E] dark:text-white">{test.student_name}</div>
                <div className="text-[11px] text-[#D89A06] font-medium">{test.program || test.student_role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dynamic FAQs Section (Live from Admin CMS) */}
      <section className="py-16 border-t border-[#D89A06]/20 max-w-4xl mx-auto px-6 sm:px-8">
        <div className="text-center mb-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF8E7] dark:bg-[#00004E] border border-[#D89A06] text-[#00004E] dark:text-[#D89A06] text-xs font-bold uppercase tracking-wider">
            Questions &amp; Answers
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-[#00004E] dark:text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-muted-foreground">
            Clear answers about course coverage, grading, and compute allowances.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq) => {
            const isOpen = openFaq === faq.id;
            return (
              <div
                key={faq.id}
                className="rounded-xl border border-border bg-white dark:bg-[#0A0A28] overflow-hidden transition-all shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                  className="w-full py-4 px-5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-[#00004E] dark:text-white cursor-pointer hover:bg-muted/30"
                >
                  <span>{faq.question}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#D89A06] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs text-[#3A4363] dark:text-[#A3A8C2] leading-relaxed border-t border-border/40 pt-3">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/contact"
            className="text-xs text-[#00004E] dark:text-[#D89A06] font-semibold underline underline-offset-4 hover:opacity-80"
          >
            Have another question? Contact Student Support Desk →
          </Link>
        </div>
      </section>
    </>
  );
}
