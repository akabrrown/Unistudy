import React from "react";
import Link from "next/link";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { Lock, ShieldCheck, Database, Server, UserCheck, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | UniStudy AI",
  description: "How UniStudy AI collects, processes, and protects your educational data under Ghana's Data Protection Act.",
};

export default function PrivacyPage() {
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
              <Lock size={24} />
            </span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1A0A2E] dark:text-white" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Privacy policy
            </h1>
          </div>
          <p className="text-sm text-[#6B5A8A] dark:text-[#B39DDB]">
            Last updated: <span className="font-medium text-[#1A0A2E] dark:text-white">{lastUpdated}</span> (in accordance with Ghana Data Protection Act 843).
          </p>
        </div>

        <div className="mb-10 p-4 md:p-5 rounded-2xl bg-[#EDE7F6]/60 dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10 flex items-start gap-3.5">
          <ShieldCheck className="text-[#5B2D8E] dark:text-[#B39DDB] shrink-0 mt-0.5" size={20} />
          <div className="text-xs md:text-sm text-[#4A3B66] dark:text-[#D1C4E9] leading-relaxed">
            <strong>Privacy baseline:</strong> We do not sell your personal information. Your uploaded lecture notes and course materials are used strictly to provide you with study assistance and are <strong>never</strong> used to train public foundation models.
          </div>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed text-[#4A3B66] dark:text-[#C5B7DF]">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              1. Legal framework and scope
            </h2>
            <p>
              UniStudy AI Ltd. (&ldquo;UniStudy&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is committed to student data privacy and security. This Privacy Policy outlines what information we collect, why we need it, how it is secured, and your rights under the <strong>Data Protection Act, 2012 (Act 843) of the Republic of Ghana</strong>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              2. Data we collect
            </h2>
            <p>We collect data necessary to provide personalized study materials:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3">
              <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10">
                <h3 className="font-semibold text-sm text-[#1A0A2E] dark:text-white mb-2 flex items-center gap-1.5">
                  <UserCheck size={16} className="text-[#5B2D8E] dark:text-[#B39DDB]" /> Account and profile information
                </h3>
                <p className="text-xs text-[#6B5A8A] dark:text-[#B39DDB] leading-relaxed">
                  Full name, email address, encrypted password hash (managed via Supabase Auth), university name, year level, and enrolled programme of study.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10">
                <h3 className="font-semibold text-sm text-[#1A0A2E] dark:text-white mb-2 flex items-center gap-1.5">
                  <Database size={16} className="text-[#5B2D8E] dark:text-[#B39DDB]" /> Course and study content
                </h3>
                <p className="text-xs text-[#6B5A8A] dark:text-[#B39DDB] leading-relaxed">
                  Uploaded lecture slides (PDF, PPTX), slide notes, voice memos for active drills, flashcard review decks, and diagnostic quiz responses.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10">
                <h3 className="font-semibold text-sm text-[#1A0A2E] dark:text-white mb-2 flex items-center gap-1.5">
                  <Server size={16} className="text-[#5B2D8E] dark:text-[#B39DDB]" /> Learning metrics
                </h3>
                <p className="text-xs text-[#6B5A8A] dark:text-[#B39DDB] leading-relaxed">
                  Spaced repetition retention intervals (SM-2 interval scores), study session durations, completed revision streaks, and search queries within your workspace.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10">
                <h3 className="font-semibold text-sm text-[#1A0A2E] dark:text-white mb-2 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-[#5B2D8E] dark:text-[#B39DDB]" /> Payment references
                </h3>
                <p className="text-xs text-[#6B5A8A] dark:text-[#B39DDB] leading-relaxed">
                  Paystack transaction references, plan tier, amount, and payment status. We do not receive or store card numbers or mobile money security PINs.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              3. How we process data with AI
            </h2>
            <p>
              When you generate slide summaries, explanations, or quizzes, the text and slide images are sent over encrypted connections to our enterprise AI providers (including Google Gemini and Groq).
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Zero public model training:</strong> Under our enterprise API agreements, your notes, slides, and answers are never used to train or adjust public foundation models.</li>
              <li><strong>Transient processing:</strong> Document text sent for inference is kept only for the seconds needed to return your study aid to the screen.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              4. Third-party infrastructure partners
            </h2>
            <p>We work with vetted infrastructure partners bound by confidentiality and security commitments:</p>
            <div className="overflow-x-auto my-3">
              <table className="w-full text-xs text-left border-collapse border border-[#D1C4E9]/60 dark:border-white/10 rounded-xl overflow-hidden">
                <thead className="bg-[#EDE7F6] dark:bg-white/10 text-[#1A0A2E] dark:text-white font-semibold">
                  <tr>
                    <th className="p-2.5 border-b border-[#D1C4E9]/60 dark:border-white/10">Service</th>
                    <th className="p-2.5 border-b border-[#D1C4E9]/60 dark:border-white/10">Role in platform</th>
                    <th className="p-2.5 border-b border-[#D1C4E9]/60 dark:border-white/10">Compliance &amp; security</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D1C4E9]/40 dark:divide-white/5">
                  <tr>
                    <td className="p-2.5 font-medium">Supabase</td>
                    <td className="p-2.5">User authentication and database (PostgreSQL RLS)</td>
                    <td className="p-2.5">SOC 2 Type II, ISO 27001</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Cloudinary</td>
                    <td className="p-2.5">Encrypted lecture slide and slide image hosting</td>
                    <td className="p-2.5">ISO 27001 certified cloud</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Google Gemini &amp; Groq</td>
                    <td className="p-2.5">AI slide analysis, text extraction, and quiz generation</td>
                    <td className="p-2.5">Enterprise zero-retention API endpoints</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Paystack</td>
                    <td className="p-2.5">Debit card and Mobile Money payment processing</td>
                    <td className="p-2.5">PCI-DSS Level 1 certified</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Upstash Redis</td>
                    <td className="p-2.5">Rate limiting and session caching</td>
                    <td className="p-2.5">SOC 2 compliant</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Resend</td>
                    <td className="p-2.5">Study reminder emails and password resets</td>
                    <td className="p-2.5">Encrypted transactional delivery</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              5. Your statutory data rights
            </h2>
            <p>
              Under Ghana&rsquo;s Data Protection Act (Act 843), you have clear rights regarding your personal records:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Right of access:</strong> You can review your courses, lectures, quizzes, and profile information from your dashboard.</li>
              <li><strong>Right to rectification:</strong> You can update your university, programme, and study details in Account settings.</li>
              <li><strong>Right to erasure:</strong> You can delete any lecture or course, or contact support for full account removal. Deleting a lecture purges records from our database and Cloudinary storage.</li>
              <li><strong>Right to data export:</strong> You can export your flashcards and study notes at any time.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              6. Security and retention
            </h2>
            <p>
              All traffic between your browser and our servers uses TLS 1.3 encryption. Course databases enforce PostgreSQL Row-Level Security (RLS) so that records are accessible only by your verified user account.
            </p>
            <p>
              Data is retained while your account remains open. Inactive accounts are notified before automated data pruning after 18 months of inactivity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              7. Inquiries and Data Protection Officer
            </h2>
            <p>
              For privacy inquiries or to exercise your statutory rights, contact:
            </p>
            <div className="p-4 rounded-xl bg-[#EDE7F6]/50 dark:bg-white/5 border border-[#D1C4E9]/50 dark:border-white/10 text-sm">
              <p><strong>UniStudy AI (Data Protection &amp; Privacy Office)</strong></p>
              <p>Email: <a href="mailto:unistudy.ai@gmail.com" className="text-[#5B2D8E] dark:text-[#D1C4E9] underline">unistudy.ai@gmail.com</a></p>
              <p>Physical location: Accra, Ghana</p>
              <p className="text-xs text-[#6B5A8A] dark:text-[#B39DDB] mt-2">
                If you believe your information has been processed in breach of Act 843, you may lodge a complaint with the Data Protection Commission (DPC) of Ghana.
              </p>
            </div>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
