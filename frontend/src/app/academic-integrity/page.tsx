import React from "react";
import { CollegiateLegalShell } from "@/components/legal/CollegiateLegalShell";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export const dynamic = "force-static";

export const metadata = {
  title: "Academic Integrity Policy | UniStudy AI",
  description: "UniStudy AI's standards for authentic learning, ethical study habits, and university honor codes.",
};

const SECTIONS = [
  { id: "stance", label: "1. Ethical AI in Higher Education" },
  { id: "comparison", label: "2. Socratic Guidance vs Shortcuts" },
  { id: "guidelines", label: "3. Permitted vs Prohibited Use" },
  { id: "faculty", label: "4. Faculty & Institutional Liaison" },
];

export default function AcademicIntegrityPage() {
  return (
    <CollegiateLegalShell
      title="Academic Integrity Policy"
      subtitle="Standards on active recall, slide-cited study, and university honor code compliance."
      summaryBanner={
        <>
          <strong>Core Principle:</strong> UniStudy acts as a revision tutor that tests comprehension and cites your lecturer&apos;s slides—<strong>never as a shortcut to bypass authentic learning</strong> or write graded coursework on your behalf.
        </>
      }
      sections={SECTIONS}
    >
      <section id="stance" className="space-y-3 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          1. Ethical AI in higher education
        </h2>
        <p>
          University education develops independent reasoning, quantitative rigor, and professional judgment. Relying on unverified tools to copy answers without comprehension undermines exam readiness when invigilated finals arrive.
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li><strong>Active recall:</strong> Testing yourself on past paper questions before revealing worked solutions.</li>
          <li><strong>Spaced repetition:</strong> Reviewing SM-2 flashcards at expanding intervals so definitions stick long-term.</li>
          <li><strong>Slide grounding:</strong> Anchoring every explanation to exact slide numbers in your uploaded course deck.</li>
        </ul>
      </section>

      {/* Visual Side-by-Side Pedagogy Specimen */}
      <section id="comparison" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          2. How Socratic guidance differs from answer dumping
        </h2>
        <div className="grid md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl border border-border/80 bg-white dark:bg-[#0A0A28] p-4 space-y-2">
            <div className="font-mono text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">
              UNETHICAL ANSWER DUMPING
            </div>
            <p className="text-muted-foreground leading-relaxed">
              &ldquo;Write my 1,500-word take-home Commercial Law assignment so I can paste and submit it.&rdquo;
            </p>
            <div className="pt-2 border-t border-border/60 font-medium text-rose-600 dark:text-rose-400">
              Zero retention · Violates university honor code
            </div>
          </div>

          <div className="rounded-xl border border-[#D89A06]/50 bg-white dark:bg-[#0A0A28] p-4 space-y-2">
            <div className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
              UNISTUDY CITED REVISION WORKFLOW
            </div>
            <p className="text-foreground/90 leading-relaxed">
              &ldquo;Grade my own completed draft against the 4-pillar rubric and point me to the slide covering strict liability exceptions [Slide 22].&rdquo;
            </p>
            <div className="pt-2 border-t border-border/60 font-medium text-[#00004E] dark:text-[#D89A06]">
              Builds exam mastery · Honors student authorship
            </div>
          </div>
        </div>
      </section>

      <section id="guidelines" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          3. Student guidelines: permitted vs. prohibited use
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl bg-white dark:bg-[#0A0A28] border border-emerald-500/30 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 size={17} />
              <span>Permitted study practices</span>
            </div>
            <ul className="text-xs text-foreground/85 space-y-2 list-disc pl-4">
              <li>Uploading lecture slides to generate flashcards, cheat sheets, and diagnostic quizzes.</li>
              <li>Asking the tutor to clarify confusing steps in accounting, mathematics, or law slides.</li>
              <li>Sitting timed 120-minute mock exams on past papers prior to examination week.</li>
              <li>Checking your own written essay draft for readability and rubric weaknesses.</li>
            </ul>
          </div>

          <div className="p-5 rounded-xl bg-white dark:bg-[#0A0A28] border border-rose-500/30 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-400">
              <AlertTriangle size={17} />
              <span>Prohibited activities</span>
            </div>
            <ul className="text-xs text-foreground/85 space-y-2 list-disc pl-4">
              <li>Accessing UniStudy during live, invigilated quizzes, midterms, or final exams.</li>
              <li>Submitting AI-generated exemplar paragraphs as your own original coursework.</li>
              <li>Uploading leaked or confidential examination papers not cleared for student study.</li>
              <li>Sharing account credentials to misrepresent individual academic work.</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="faculty" className="space-y-3 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          4. For faculty, lecturers, and institutions
        </h2>
        <p>
          We partner with university lecturers and academic departments so students arrive at lectures better prepared. For departmental inquiries or curriculum alignment requests:
        </p>
        <div className="p-4 rounded-xl bg-white dark:bg-[#0A0A28] border border-border/80 text-xs sm:text-sm">
          <p className="font-bold text-[#00004E] dark:text-white">UniStudy Academic Integrity Liaison</p>
          <p className="text-muted-foreground mt-0.5">
            Email:{" "}
            <a href="mailto:unistudy.ai@gmail.com" className="text-[#00004E] dark:text-[#D89A06] underline font-medium">
              unistudy.ai@gmail.com
            </a>
          </p>
        </div>
      </section>
    </CollegiateLegalShell>
  );
}
