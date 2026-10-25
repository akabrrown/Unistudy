import React from "react";
import Link from "next/link";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { FileText, Shield, AlertCircle, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service | UniStudy AI",
  description: "Terms and conditions governing the use of the UniStudy AI learning and study companion platform.",
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
            <ArrowLeft size={14} /> Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 rounded-xl bg-[#EDE7F6] dark:bg-white/5 text-[#5B2D8E] dark:text-[#B39DDB]">
              <FileText size={24} />
            </span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1A0A2E] dark:text-white" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Terms of Service
            </h1>
          </div>
          <p className="text-sm text-[#6B5A8A] dark:text-[#B39DDB]">
            Last updated: <span className="font-medium text-[#1A0A2E] dark:text-white">{lastUpdated}</span> · Effective immediately upon account registration or platform use.
          </p>
        </div>

        {/* Notice Card */}
        <div className="mb-10 p-4 md:p-5 rounded-2xl bg-[#EDE7F6]/60 dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10 flex items-start gap-3.5">
          <Shield className="text-[#5B2D8E] dark:text-[#B39DDB] shrink-0 mt-0.5" size={20} />
          <div className="text-xs md:text-sm text-[#4A3B66] dark:text-[#D1C4E9] leading-relaxed">
            <strong>Key Summary:</strong> UniStudy AI is an educational revision and active recall platform designed to help tertiary students understand lecture materials, practice with quizzes, and prepare for examinations. We respect your intellectual property, enforce strict academic honesty standards, and process payments securely via Paystack.
          </div>
        </div>

        {/* Document Body */}
        <div className="space-y-10 text-[15px] leading-relaxed text-[#4A3B66] dark:text-[#C5B7DF]">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing, browsing, registering, or using UniStudy AI (&ldquo;UniStudy&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), accessible at unistudy.ai or unistudy-silk.vercel.app, you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;) and our <Link href="/privacy" className="text-[#5B2D8E] dark:text-[#D1C4E9] font-medium underline">Privacy Policy</Link>. If you do not agree to all provisions of these Terms, you must immediately discontinue use of the platform.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              2. Description of the Services
            </h2>
            <p>
              UniStudy AI provides an interactive learning, revision, and study assistance suite. Core features include:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Upload and processing of lecture slides (PDF, PPTX) into digitized slide views and summaries.</li>
              <li>AI-generated slide explanations, summaries, and Feynman-technique study dialogues.</li>
              <li>Spaced-repetition flashcard generation and SM-2 memory retention scheduling.</li>
              <li>Diagnostic quiz generation, past question analysis, and mock exam simulations.</li>
              <li>Academic scheduling, study analytics, and streak tracking.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              3. User Accounts and Eligibility
            </h2>
            <p>
              To use our study tools, you must create an account with a valid email address and secure password. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Provide accurate, current, and complete registration information.</li>
              <li>Maintain the confidentiality of your login credentials and accept responsibility for all activity on your account.</li>
              <li>Be at least 16 years of age or enrolled in a secondary or tertiary educational institution.</li>
              <li>Immediately notify us at <a href="mailto:unistudy.ai@gmail.com" className="text-[#5B2D8E] dark:text-[#D1C4E9] underline">unistudy.ai@gmail.com</a> if you detect any unauthorized access or breach of security.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              4. User Content and Intellectual Property Rights
            </h2>
            <p>
              <strong>Your Materials:</strong> You retain full ownership and copyright of any personal notes, summaries, or materials you create on UniStudy. By uploading lecture slides or documents, you represent that you have lawful permission or a fair-use educational privilege to possess and analyze those materials for personal, non-commercial educational study.
            </p>
            <p>
              <strong>License to UniStudy:</strong> You grant UniStudy a limited, revocable, non-exclusive license solely to host, parse, convert, display, and process your content through our AI infrastructure (e.g., generating flashcards and slide explanations for your account). We do not sell your personal notes or lecture materials to third parties.
            </p>
            <p>
              <strong>Platform Intellectual Property:</strong> The UniStudy AI software, branding, user interface, algorithmic features, and proprietary prompts are the exclusive intellectual property of UniStudy AI Ltd.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              5. Academic Integrity &amp; Acceptable Use
            </h2>
            <p>
              UniStudy AI is built to foster genuine understanding, critical thinking, and mastery. You expressly agree that:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>You will <strong>never</strong> use UniStudy AI to engage in academic dishonesty, plagiarism, or unauthorized collaboration during active, proctored examinations.</li>
              <li>You will adhere to your educational institution&rsquo;s student code of conduct, honor code, and academic integrity policies.</li>
              <li>You will not reverse engineer, decompile, crawl, scrape, or perform denial-of-service attacks against our APIs or infrastructure.</li>
              <li>You will not upload malicious files, pirated commercial textbooks, or defamatory content.</li>
            </ul>
            <p>
              Violation of this section may lead to immediate termination of your account without refund. Please review our full <Link href="/academic-integrity" className="text-[#5B2D8E] dark:text-[#D1C4E9] underline font-medium">Academic Integrity Policy</Link>.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              6. AI Disclaimers and Limitations
            </h2>
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs md:text-sm text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle size={16} /> Important Notice Regarding AI-Generated Content:
              </div>
              <p>
                UniStudy utilizes state-of-the-art AI language and vision models (including Google Gemini and Groq). AI-generated explanations, answers, and quiz questions are probabilistic educational aids. While we continually optimize for precision, AI models may occasionally produce incorrect, incomplete, or dated information (&ldquo;hallucinations&rdquo;).
              </p>
              <p>
                <strong>Always verify critical definitions, formulas, and legal/medical principles against your official university course syllabus, prescribed textbooks, and lecturers&rsquo; directives. UniStudy AI is not a substitute for formal instruction.</strong>
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              7. Fees, Credits, and Paystack Payment Processing
            </h2>
            <p>
              UniStudy offers a free tier as well as Pay-As-You-Go credit packs and premium access:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Billing Provider:</strong> All credit purchases and payments are securely processed by <strong>Paystack</strong>, a licensed and PCI-DSS Level 1 certified payment gateway. UniStudy does not receive or store your raw card numbers or mobile money PINs.</li>
              <li><strong>Credits Validity:</strong> Purchased Pay-As-You-Go credits remain in your balance and do not expire at the end of the academic term.</li>
              <li><strong>Refunds:</strong> Because AI inference consumes non-recoverable computational resources, credit purchases are generally non-refundable once consumed. However, if a verified platform outage or billing error prevents you from using paid services, please contact support within 7 days for review.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              8. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by applicable law, UniStudy AI Ltd. and its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages—including loss of grades, academic standing, profits, data, or goodwill—arising from your use or inability to use the platform. In no event shall our total aggregate liability exceed the total amount paid by you to UniStudy in the twelve (12) months preceding the claim.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              9. Governing Law and Jurisdiction
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the <strong>Republic of Ghana</strong>, without regard to its conflict of law principles. Any dispute, controversy, or claim arising out of or relating to these Terms shall be submitted to the competent courts of Ghana.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              10. Modifications and Contact
            </h2>
            <p>
              We reserve the right to revise these Terms periodically. Notice of significant revisions will be posted on the platform or sent to your registered email address.
            </p>
            <p>
              If you have any questions or legal inquiries regarding these Terms, contact our legal desk:
            </p>
            <div className="p-4 rounded-xl bg-[#EDE7F6]/50 dark:bg-white/5 border border-[#D1C4E9]/50 dark:border-white/10 text-sm">
              <p><strong>UniStudy AI Ltd. — Legal &amp; Compliance</strong></p>
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
