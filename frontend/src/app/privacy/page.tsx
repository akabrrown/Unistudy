import React from "react";
import { CollegiateLegalShell } from "@/components/legal/CollegiateLegalShell";
import { UserCheck, Database, Server, ShieldCheck, ArrowRight } from "lucide-react";

export const dynamic = "force-static";

export const metadata = {
  title: "Privacy Policy | UniStudy AI",
  description: "How UniStudy AI collects, processes, and protects your educational data under Ghana's Data Protection Act.",
};

const SECTIONS = [
  { id: "scope", label: "1. Act 843 Legal Framework" },
  { id: "collected", label: "2. Data We Collect" },
  { id: "ai-isolation", label: "3. Zero-Training AI Isolation" },
  { id: "partners", label: "4. Infrastructure Partners" },
  { id: "rights", label: "5. Your Statutory Rights" },
  { id: "security", label: "6. Encryption & Retention" },
  { id: "dpo", label: "7. Data Protection Office" },
];

export default function PrivacyPage() {
  return (
    <CollegiateLegalShell
      title="Privacy Policy"
      subtitle="Governed by the Data Protection Act, 2012 (Act 843) of the Republic of Ghana."
      summaryBanner={
        <>
          <strong>Privacy Guarantee:</strong> We never sell your personal data. Uploaded lecture slides, notes, and exam attempts remain isolated inside your private workspace and are <strong>never used to train public AI models</strong>.
        </>
      }
      sections={SECTIONS}
    >
      <section id="scope" className="space-y-3 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          1. Legal framework and scope
        </h2>
        <p>
          UniStudy AI Ltd. (&ldquo;UniStudy&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) protects student privacy across all web and mobile study tools in accordance with the <strong>Data Protection Act, 2012 (Act 843) of the Republic of Ghana</strong>.
        </p>
      </section>

      <section id="collected" className="space-y-3 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          2. Data we collect
        </h2>
        <div className="grid md:grid-cols-2 gap-4 pt-1">
          {[
            {
              icon: UserCheck,
              title: "Account & Academic Profile",
              desc: "Name, email address, bcrypt password hash (Supabase Auth), university, level, and degree programme.",
            },
            {
              icon: Database,
              title: "Course & Study Materials",
              desc: "Uploaded lecture slides (PDF, PPTX), personal slide notes, flashcard decks, and past paper attempts.",
            },
            {
              icon: Server,
              title: "Learning Progress",
              desc: "SM-2 spaced repetition intervals, focus session durations, and quiz mastery percentages.",
            },
            {
              icon: ShieldCheck,
              title: "Payment References",
              desc: "Paystack transaction reference, credit bundle, and status. Card numbers and MoMo PINs never touch our servers.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-4 rounded-xl bg-white dark:bg-[#0A0A28] border border-border/80 space-y-1.5">
              <h3 className="font-bold text-xs sm:text-sm text-[#00004E] dark:text-white flex items-center gap-2">
                <Icon size={15} className="text-[#D89A06]" />
                <span>{title}</span>
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pictorial Data-Isolation Pipeline */}
      <section id="ai-isolation" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          3. How we process data with AI (Zero public model training)
        </h2>

        <div className="rounded-2xl border border-border/80 bg-white dark:bg-[#0A0A28] p-5 space-y-3">
          <div className="text-[11px] font-mono font-bold text-[#D89A06] uppercase">
            DATA ISOLATION PIPELINE
          </div>
          <div className="grid sm:grid-cols-4 gap-3 text-xs">
            {[
              ["01. Your Slide PDF", "Uploaded over TLS 1.3"],
              ["02. Row-Level Vault", "Locked to auth.uid()"],
              ["03. Ephemeral API", "Zero-retention inference"],
              ["04. Private Output", "Never trains public LLMs"],
            ].map(([step, note], idx) => (
              <div key={step} className="p-3 rounded-xl bg-[#F8F9FD] dark:bg-white/[0.04] border border-border/70 flex flex-col justify-between">
                <div className="font-bold text-[#00004E] dark:text-white flex items-center justify-between">
                  <span>{step}</span>
                  {idx < 3 && <ArrowRight className="w-3 h-3 text-[#D89A06] hidden sm:inline" />}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">{note}</div>
              </div>
            ))}
          </div>
        </div>

        <ul className="list-disc pl-6 space-y-1.5 text-sm">
          <li><strong>Zero model training:</strong> Enterprise API endpoints process slide text transiently without training foundation models on your notes.</li>
          <li><strong>Strict tenant boundary:</strong> Another student cannot query or retrieve your private slide notes or uploaded drafts.</li>
        </ul>
      </section>

      <section id="partners" className="space-y-3 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          4. Infrastructure partners
        </h2>
        <div className="overflow-x-auto rounded-xl border border-border/80 bg-white dark:bg-[#0A0A28]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/60 text-foreground font-semibold border-b border-border/70">
              <tr>
                <th className="p-3">Provider</th>
                <th className="p-3">Platform Role</th>
                <th className="p-3">Security Standard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {[
                ["Supabase", "Authentication & PostgreSQL Row-Level Security", "SOC 2 Type II, ISO 27001"],
                ["Cloudinary", "Encrypted slide & document storage", "ISO 27001 certified"],
                ["Google Gemini & Groq", "Slide analysis, OCR & exam grading", "Zero-retention API endpoints"],
                ["Paystack", "Mobile Money & card checkout", "PCI-DSS Level 1 certified"],
                ["Upstash Redis", "Rate limiting & ephemeral caching", "SOC 2 compliant"],
                ["Resend", "Verification & password recovery emails", "TLS transactional delivery"],
              ].map(([srv, role, sec]) => (
                <tr key={srv}>
                  <td className="p-3 font-semibold text-foreground">{srv}</td>
                  <td className="p-3 text-muted-foreground">{role}</td>
                  <td className="p-3 font-mono text-[11px] text-foreground">{sec}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="rights" className="space-y-3 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          5. Your statutory data rights (Act 843)
        </h2>
        <ul className="list-disc pl-6 space-y-1.5">
          <li><strong>Right of access:</strong> Inspect all courses, lectures, flashcards, and credit ledger entries from your dashboard.</li>
          <li><strong>Right to rectification:</strong> Update your academic profile and programme details anytime in Settings.</li>
          <li><strong>Right to erasure:</strong> Delete individual lecture decks or courses immediately, or request full account deletion.</li>
          <li><strong>Right to export:</strong> Download your study packs, Markdown notes, and printable revision sheets at any time.</li>
        </ul>
      </section>

      <section id="security" className="space-y-3 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          6. Security and retention
        </h2>
        <p>
          All connections enforce HTTPS/TLS 1.3 with HSTS headers. Database tables enforce PostgreSQL Row-Level Security (`auth.uid() = user_id`). Accounts inactive for 18 months receive advance email notice prior to automated archive pruning.
        </p>
      </section>

      <section id="dpo" className="space-y-3 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          7. Data Protection Officer
        </h2>
        <div className="p-4 rounded-xl bg-white dark:bg-[#0A0A28] border border-border/80 text-xs sm:text-sm space-y-1">
          <p className="font-bold text-[#00004E] dark:text-white">UniStudy AI (Data Protection &amp; Privacy Office)</p>
          <p>
            Email:{" "}
            <a href="mailto:unistudy.ai@gmail.com" className="text-[#00004E] dark:text-[#D89A06] underline font-medium">
              unistudy.ai@gmail.com
            </a>{" "}
            · Accra, Ghana
          </p>
          <p className="text-xs text-muted-foreground pt-1">
            You may also lodge statutory inquiries with the Data Protection Commission (DPC) of Ghana.
          </p>
        </div>
      </section>
    </CollegiateLegalShell>
  );
}
