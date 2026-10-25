import React from "react";
import Link from "next/link";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { FileText, Shield, AlertCircle, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service | UniStudy AI",
  description: "Terms and conditions governing the use of the UniStudy AI study and revision platform.",
};

export default function TermsPage() {
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
              <FileText size={24} />
            </span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1A0A2E] dark:text-white" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Terms of service
            </h1>
          </div>
          <p className="text-sm text-[#6B5A8A] dark:text-[#B39DDB]">
            Last updated: <span className="font-medium text-[#1A0A2E] dark:text-white">{lastUpdated}</span> (effective immediately upon registration or platform use).
          </p>
        </div>

        <div className="mb-10 p-4 md:p-5 rounded-2xl bg-[#EDE7F6]/60 dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10 flex items-start gap-3.5">
          <Shield className="text-[#5B2D8E] dark:text-[#B39DDB] shrink-0 mt-0.5" size={20} />
          <div className="text-xs md:text-sm text-[#4A3B66] dark:text-[#D1C4E9] leading-relaxed">
            <strong>Key summary:</strong> UniStudy AI is a revision and active recall platform designed to help university students understand lecture materials, practice with quizzes, and prepare for examinations. We respect your intellectual property, enforce academic honesty, and process payments securely via Paystack.
          </div>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed text-[#4A3B66] dark:text-[#C5B7DF]">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              1. Acceptance of terms
            </h2>
            <p>
              By accessing, browsing, registering, or using UniStudy AI (&ldquo;UniStudy&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), accessible at unistudy.ai or unistudy-silk.vercel.app, you agree to these Terms of Service and our <Link href="/privacy" className="text-[#5B2D8E] dark:text-[#D1C4E9] font-medium underline">Privacy policy</Link>. If you do not agree to these terms, discontinue use of the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              2. Description of services
            </h2>
            <p>
              UniStudy AI provides study assistance and exam revision features:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Upload and processing of lecture slides (PDF, PPTX) into structured slide views and notes.</li>
              <li>Slide explanations, summaries, and conceptual breakdowns.</li>
              <li>Spaced-repetition flashcard generation and memory retention scheduling.</li>
              <li>Diagnostic quizzes, past question analysis, and mock exam simulations.</li>
              <li>Academic scheduling, study analytics, and streak tracking.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              3. User accounts and eligibility
            </h2>
            <p>
              To use our study tools, you must register with a valid email address and password. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Provide accurate, current registration information.</li>
              <li>Maintain the confidentiality of your login credentials and accept responsibility for account activity.</li>
              <li>Be at least 16 years of age or enrolled in a secondary or tertiary educational institution.</li>
              <li>Promptly notify us at <a href="mailto:unistudy.ai@gmail.com" className="text-[#5B2D8E] dark:text-[#D1C4E9] underline">unistudy.ai@gmail.com</a> if you notice unauthorized account access.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              4. User content and intellectual property
            </h2>
            <p>
              <strong>Your materials:</strong> You retain ownership of any personal notes, flashcards, or summaries you create on UniStudy. By uploading lecture slides or documents, you confirm that you have lawful permission or a fair-use educational privilege to analyze those materials for personal study.
            </p>
            <p>
              <strong>License to UniStudy:</strong> You grant UniStudy a limited, revocable license solely to host, convert, display, and process your content through our infrastructure (such as generating study cards and slide explanations for your account). We do not sell your personal notes or course documents to third parties.
            </p>
            <p>
              <strong>Platform property:</strong> The UniStudy AI software, interface design, brand identity, and custom software routines remain the intellectual property of UniStudy AI Ltd.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              5. Academic integrity and acceptable use
            </h2>
            <p>
              UniStudy AI is built to encourage genuine understanding, critical thinking, and mastery. You agree that:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>You will not use UniStudy AI to cheat, plagiarize, or coordinate answers during active, invigilated examinations.</li>
              <li>You will adhere to your university&rsquo;s student code of conduct and academic integrity standards.</li>
              <li>You will not reverse engineer, crawl, scrape, or perform denial-of-service tests against our endpoints.</li>
              <li>You will not upload malicious files, copyrighted commercial textbooks without permission, or defamatory material.</li>
            </ul>
            <p>
              Misuse may result in immediate account termination. Review our full <Link href="/academic-integrity" className="text-[#5B2D8E] dark:text-[#D1C4E9] underline font-medium">Academic integrity policy</Link>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              6. AI disclaimers and limitations
            </h2>
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs md:text-sm text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle size={16} /> Important notice regarding AI-generated content:
              </div>
              <p>
                UniStudy uses AI language and vision models (including Google Gemini and Groq). AI-generated explanations and quiz questions are probabilistic study aids. While we continually refine prompt accuracy, language models can occasionally generate inaccurate, incomplete, or dated outputs.
              </p>
              <p>
                <strong>Always verify critical definitions, formulas, case law, and medical principles against your official university syllabus, prescribed textbooks, and lecturers&rsquo; directives.</strong>
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              7. Fees, credits, and Paystack billing
            </h2>
            <p>
              UniStudy provides a free tier alongside Pay-As-You-Go credit packs and premium features:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Billing partner:</strong> Credit purchases are processed by <strong>Paystack</strong>, a licensed and PCI-DSS Level 1 compliant payment gateway. UniStudy does not store your card details or mobile money PINs.</li>
              <li><strong>Credit validity:</strong> Pay-As-You-Go credits remain in your balance and do not expire at semester end.</li>
              <li><strong>Refunds:</strong> Because automated inference consumes direct computing capacity, consumed credits are non-refundable. If a platform outage or billing error prevents usage, reach out within 7 days for review.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              8. Limitation of liability
            </h2>
            <p>
              To the maximum extent permitted by law, UniStudy AI Ltd. and its team shall not be liable for any indirect, incidental, special, or consequential damages (including loss of grades, academic standing, or data) arising from your use of the platform. In no event will our total liability exceed the total amount paid by you to UniStudy in the twelve (12) months preceding the claim.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              9. Governing law
            </h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the <strong>Republic of Ghana</strong>. Any dispute arising out of or relating to these terms shall be submitted to the competent courts of Ghana.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              10. Contact and legal inquiries
            </h2>
            <p>
              If you have questions regarding these terms, contact our team:
            </p>
            <div className="p-4 rounded-xl bg-[#EDE7F6]/50 dark:bg-white/5 border border-[#D1C4E9]/50 dark:border-white/10 text-sm">
              <p><strong>UniStudy AI Ltd. (Legal &amp; Compliance)</strong></p>
              <p>Email: <a href="mailto:unistudy.ai@gmail.com" className="text-[#5B2D8E] dark:text-[#D1C4E9] underline">unistudy.ai@gmail.com</a></p>
              <p>Location: Accra, Ghana</p>
            </div>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
