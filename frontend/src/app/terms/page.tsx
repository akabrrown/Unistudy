import React from "react";
import Link from "next/link";
import { CollegiateLegalShell } from "@/components/legal/CollegiateLegalShell";
import { AlertCircle } from "lucide-react";

export const dynamic = "force-static";

export const metadata = {
  title: "Terms of Service | UniStudy AI",
  description: "Terms and conditions governing the use of the UniStudy AI study and revision platform.",
};

const SECTIONS = [
  { id: "acceptance", label: "1. Acceptance of Terms" },
  { id: "services", label: "2. Workspace Services" },
  { id: "accounts", label: "3. Accounts & Eligibility" },
  { id: "ip", label: "4. Content & Ownership" },
  { id: "conduct", label: "5. Acceptable Study Use" },
  { id: "ai-limits", label: "6. AI Study Aid Notice" },
  { id: "billing", label: "7. Credits & Paystack Billing" },
  { id: "liability", label: "8. Limitation of Liability" },
  { id: "law", label: "9. Governing Law (Ghana)" },
];

export default function TermsPage() {
  return (
    <CollegiateLegalShell
      title="Terms of Service"
      subtitle="Effective upon account registration or use of the UniStudy academic workspace."
      summaryBanner={
        <>
          <strong>Plain-English Summary:</strong> You own the notes and study decks you create, your Pay-As-You-Go credits never expire, payments run through PCI-DSS certified Paystack, and you agree never to use UniStudy during live invigilated exams.
        </>
      }
      sections={SECTIONS}
    >
      <section id="acceptance" className="space-y-2.5 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          1. Acceptance of terms
        </h2>
        <p>
          By registering or using UniStudy AI (&ldquo;UniStudy&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;), you agree to these Terms of Service and our{" "}
          <Link href="/privacy" className="text-[#00004E] dark:text-[#D89A06] font-semibold underline">
            Privacy Policy
          </Link>
          . If you do not agree, discontinue use of the platform.
        </p>
      </section>

      <section id="services" className="space-y-2.5 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          2. Description of workspace services
        </h2>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Slide deck ingestion (PDF, PPTX) with page-cited explanations, summaries, and printable A4 cheat sheets.</li>
          <li>SM-2 spaced-repetition flashcard generation and offline browser caching.</li>
          <li>Timed past paper mock simulations, diagnostic quizzes, and rubric-based essay feedback.</li>
          <li>Symbolic math derivations, 2mm coordinate plotting, and handwritten note OCR.</li>
        </ul>
      </section>

      <section id="accounts" className="space-y-2.5 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          3. Accounts and eligibility
        </h2>
        <p>
          You must be at least 16 years old or enrolled in a secondary or tertiary institution, maintain accurate registration details, and keep your account credentials confidential. Report unauthorized access immediately to{" "}
          <a href="mailto:unistudy.ai@gmail.com" className="text-[#00004E] dark:text-[#D89A06] underline">
            unistudy.ai@gmail.com
          </a>
          .
        </p>
      </section>

      <section id="ip" className="space-y-2.5 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          4. User content and intellectual property
        </h2>
        <p>
          <strong>Your study materials:</strong> You retain full ownership of personal notes, flashcards, and essays written in your workspace. By uploading course slides, you confirm lawful educational permission to study those materials.
        </p>
        <p>
          <strong>Limited hosting license:</strong> You grant UniStudy a revocable license strictly to store, render, and process your uploads for your personal account.
        </p>
      </section>

      <section id="conduct" className="space-y-2.5 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          5. Academic integrity and acceptable use
        </h2>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Never use UniStudy during active, invigilated examinations or mid-semester tests.</li>
          <li>Do not scrape, reverse-engineer, or perform automated denial-of-service attacks against platform endpoints.</li>
          <li>Comply with our <Link href="/academic-integrity" className="text-[#00004E] dark:text-[#D89A06] underline font-medium">Academic Integrity Policy</Link>.</li>
        </ul>
      </section>

      <section id="ai-limits" className="space-y-3 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          6. Study aid verification notice
        </h2>
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs sm:text-sm space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <AlertCircle size={16} className="text-[#D89A06]" />
            <span>Always cross-check against lecturer directives</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Automated explanations, OCR transcriptions, and model answers are probabilistic study aids. Always verify critical formulas, statutory citations, and grading rubrics against your official university syllabus.
          </p>
        </div>
      </section>

      <section id="billing" className="space-y-2.5 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          7. Passes, credits, and Paystack billing
        </h2>
        <ul className="list-disc pl-6 space-y-1.5">
          <li><strong>Payment processor:</strong> Mobile Money and card top-ups are processed via <strong>Paystack</strong> (PCI-DSS Level 1).</li>
          <li><strong>No expiry:</strong> Purchased permanent credits roll over across semesters without expiring.</li>
          <li><strong>Billing support:</strong> Consumed credits are non-refundable, but any failed or duplicate Paystack debit reported within 7 days is audited and credited promptly.</li>
        </ul>
      </section>

      <section id="liability" className="space-y-2.5 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          8. Limitation of liability
        </h2>
        <p>
          To the maximum extent permitted by law, UniStudy AI Ltd. shall not be liable for indirect or consequential damages arising from platform use, and total aggregate liability shall not exceed the amount paid by you in the preceding twelve (12) months.
        </p>
      </section>

      <section id="law" className="space-y-2.5 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          9. Governing law and contact
        </h2>
        <p>
          These Terms are governed by the laws of the <strong>Republic of Ghana</strong>. Direct legal inquiries to{" "}
          <a href="mailto:unistudy.ai@gmail.com" className="text-[#00004E] dark:text-[#D89A06] underline font-medium">
            unistudy.ai@gmail.com
          </a>{" "}
          (Accra, Ghana).
        </p>
      </section>
    </CollegiateLegalShell>
  );
}
