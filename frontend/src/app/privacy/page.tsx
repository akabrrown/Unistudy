import React from "react";
import Link from "next/link";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { Lock, ShieldCheck, Database, Server, UserCheck, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | UniStudy AI",
  description: "Learn how UniStudy AI collects, processes, protects, and handles your educational and personal data in compliance with Ghana's Data Protection Act.",
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
            <ArrowLeft size={14} /> Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 rounded-xl bg-[#EDE7F6] dark:bg-white/5 text-[#5B2D8E] dark:text-[#B39DDB]">
              <Lock size={24} />
            </span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1A0A2E] dark:text-white" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Privacy Policy
            </h1>
          </div>
          <p className="text-sm text-[#6B5A8A] dark:text-[#B39DDB]">
            Last updated: <span className="font-medium text-[#1A0A2E] dark:text-white">{lastUpdated}</span> · In accordance with the Ghana Data Protection Act, 2012 (Act 843).
          </p>
        </div>

        {/* Commitment Badge */}
        <div className="mb-10 p-4 md:p-5 rounded-2xl bg-[#EDE7F6]/60 dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10 flex items-start gap-3.5">
          <ShieldCheck className="text-[#5B2D8E] dark:text-[#B39DDB] shrink-0 mt-0.5" size={20} />
          <div className="text-xs md:text-sm text-[#4A3B66] dark:text-[#D1C4E9] leading-relaxed">
            <strong>Our Privacy Promise:</strong> We never sell your personal information. Your uploaded lecture notes and study materials are used strictly to provide you with study assistance and are <strong>never</strong> used to train public third-party AI foundation models.
          </div>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed text-[#4A3B66] dark:text-[#C5B7DF]">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              1. Introduction &amp; Legal Framework
            </h2>
            <p>
              UniStudy AI Ltd. (&ldquo;UniStudy&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is committed to protecting the privacy, confidentiality, and security of tertiary students and academic users. This Privacy Policy explains what personal data we collect, why we collect it, how it is secured, and how you can exercise your statutory rights under the <strong>Data Protection Act, 2012 (Act 843) of the Republic of Ghana</strong> and applicable international data privacy standards.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              2. Data We Collect
            </h2>
            <p>We only collect data necessary to provide and personalize our educational revision tools:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-3">
              <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10">
                <h3 className="font-semibold text-sm text-[#1A0A2E] dark:text-white mb-2 flex items-center gap-1.5">
                  <UserCheck size={16} className="text-[#5B2D8E] dark:text-[#B39DDB]" /> Account &amp; Profile Data
                </h3>
                <p className="text-xs text-[#6B5A8A] dark:text-[#B39DDB] leading-relaxed">
                  Full name, email address, password hash (encrypted via Supabase Auth), university or tertiary institution name, level of study, and enrolled academic programme.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10">
                <h3 className="font-semibold text-sm text-[#1A0A2E] dark:text-white mb-2 flex items-center gap-1.5">
                  <Database size={16} className="text-[#5B2D8E] dark:text-[#B39DDB]" /> Academic &amp; Study Materials
                </h3>
                <p className="text-xs text-[#6B5A8A] dark:text-[#B39DDB] leading-relaxed">
                  Uploaded lecture slides (PDF, PPTX), slide notes, voice memos for drills, past paper answers, flashcard review decks, and diagnostic quiz responses.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10">
                <h3 className="font-semibold text-sm text-[#1A0A2E] dark:text-white mb-2 flex items-center gap-1.5">
                  <Server size={16} className="text-[#5B2D8E] dark:text-[#B39DDB]" /> Learning Metrics &amp; Analytics
                </h3>
                <p className="text-xs text-[#6B5A8A] dark:text-[#B39DDB] leading-relaxed">
                  Spaced repetition retention intervals (SM-2 algorithm scores), study session durations, completed revision streaks, and search queries within your study workspace.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10">
                <h3 className="font-semibold text-sm text-[#1A0A2E] dark:text-white mb-2 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-[#5B2D8E] dark:text-[#B39DDB]" /> Transaction Records
                </h3>
                <p className="text-xs text-[#6B5A8A] dark:text-[#B39DDB] leading-relaxed">
                  Paystack transaction references, package tier, amount paid, and timestamps. We <strong>never</strong> store raw card numbers, expiry dates, CVVs, or mobile money PINs.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              3. How We Process Data with AI
            </h2>
            <p>
              When you request slide summaries, explanations, or quizzes, the text and images of your slides are transmitted via encrypted API connections to our enterprise AI service providers (including Google Gemini and Groq).
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Zero Foundation Model Training:</strong> Under our enterprise API terms, your private lecture slides, student notes, and prompt interactions are <strong>not</strong> used to train or refine public AI models.</li>
              <li><strong>Transient Processing:</strong> Document text sent for inference is retained only for the duration required to generate the response and return it to your workspace.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              4. Third-Party Service Providers
            </h2>
            <p>We partner only with vetted cloud infrastructure providers bound by strict confidentiality and data protection contracts:</p>
            <div className="overflow-x-auto my-3">
              <table className="w-full text-xs text-left border-collapse border border-[#D1C4E9]/60 dark:border-white/10 rounded-xl overflow-hidden">
                <thead className="bg-[#EDE7F6] dark:bg-white/10 text-[#1A0A2E] dark:text-white font-semibold">
                  <tr>
                    <th className="p-2.5 border-b border-[#D1C4E9]/60 dark:border-white/10">Provider</th>
                    <th className="p-2.5 border-b border-[#D1C4E9]/60 dark:border-white/10">Purpose</th>
                    <th className="p-2.5 border-b border-[#D1C4E9]/60 dark:border-white/10">Location / Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D1C4E9]/40 dark:divide-white/5">
                  <tr>
                    <td className="p-2.5 font-medium">Supabase</td>
                    <td className="p-2.5">User Authentication &amp; PostgreSQL Database (RLS Enforced)</td>
                    <td className="p-2.5">SOC 2 Type II, ISO 27001</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Cloudinary</td>
                    <td className="p-2.5">Encrypted Slide &amp; Image Storage</td>
                    <td className="p-2.5">ISO 27001, GDPR-Compliant Cloud</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Google Gemini &amp; Groq</td>
                    <td className="p-2.5">Multimodal Text &amp; Slide AI Processing</td>
                    <td className="p-2.5">Enterprise Zero-Retention APIs</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Paystack</td>
                    <td className="p-2.5">Card and Mobile Money Payment Processing</td>
                    <td className="p-2.5">PCI-DSS Level 1 Certified</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Upstash Redis</td>
                    <td className="p-2.5">API Rate Limiting &amp; Session Protection</td>
                    <td className="p-2.5">SOC 2 Compliant</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Resend</td>
                    <td className="p-2.5">Transactional Study Briefs &amp; Password Resets</td>
                    <td className="p-2.5">Encrypted Email Delivery</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              5. Your Rights as a Data Subject
            </h2>
            <p>
              Under Ghana&rsquo;s Data Protection Act (Act 843) and international data protection standards, you possess enforceable rights over your personal data:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Right of Access:</strong> You can view all courses, lectures, quizzes, and profile details directly within your dashboard.</li>
              <li><strong>Right to Rectification:</strong> You may edit your profile, institution, and study preferences at any time in Account Settings.</li>
              <li><strong>Right to Erasure (&ldquo;Right to be Forgotten&rdquo;):</strong> You may delete individual lectures, entire courses, or request complete account erasure by contacting support. Once deleted, your files are purged from both our database and Cloudinary storage.</li>
              <li><strong>Right to Data Portability:</strong> You can export your flashcard decks, study notes, and revision summaries in standard formats.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              6. Data Retention &amp; Security
            </h2>
            <p>
              We apply industry-standard defenses: all data in transit is encrypted using TLS 1.3, and all databases are protected by PostgreSQL Row-Level Security (RLS), ensuring that your study records and private lectures are cryptographically restricted to your authenticated user ID.
            </p>
            <p>
              Your data is retained for as long as your account is active. If your account remains inactive for eighteen (18) months, you will receive a notification before any automated archiving.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              7. Data Protection Officer &amp; Inquiries
            </h2>
            <p>
              For data protection questions, requests to exercise your rights, or privacy inquiries, contact our Data Protection desk:
            </p>
            <div className="p-4 rounded-xl bg-[#EDE7F6]/50 dark:bg-white/5 border border-[#D1C4E9]/50 dark:border-white/10 text-sm">
              <p><strong>UniStudy AI — Data Protection &amp; Privacy Office</strong></p>
              <p>Email: <a href="mailto:privacy@unistudy.ai" className="text-[#5B2D8E] dark:text-[#D1C4E9] underline">privacy@unistudy.ai</a></p>
              <p>Physical Address: Accra, Greater Accra Region, Ghana</p>
              <p className="text-xs text-[#6B5A8A] dark:text-[#B39DDB] mt-2">
                If you believe your data has been handled in breach of the Data Protection Act, 2012 (Act 843), you have the right to lodge a complaint with the Data Protection Commission (DPC) of Ghana.
              </p>
            </div>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
