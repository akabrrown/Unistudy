import React from "react";
import Link from "next/link";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { Cookie, ShieldCheck, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Cookie & Storage Policy | UniStudy AI",
  description: "Learn about the minimal essential cookies and browser storage technologies used by UniStudy AI.",
};

export default function CookiesPage() {
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
              <Cookie size={24} />
            </span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1A0A2E] dark:text-white" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Cookie &amp; Storage Policy
            </h1>
          </div>
          <p className="text-sm text-[#6B5A8A] dark:text-[#B39DDB]">
            Last updated: <span className="font-medium text-[#1A0A2E] dark:text-white">{lastUpdated}</span> · Transparent, privacy-first storage disclosure.
          </p>
        </div>

        {/* Commitment Badge */}
        <div className="mb-10 p-4 md:p-5 rounded-2xl bg-[#EDE7F6]/60 dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10 flex items-start gap-3.5">
          <ShieldCheck className="text-[#5B2D8E] dark:text-[#B39DDB] shrink-0 mt-0.5" size={20} />
          <div className="text-xs md:text-sm text-[#4A3B66] dark:text-[#D1C4E9] leading-relaxed">
            <strong>Zero Ad Tracking:</strong> Unlike commercial social networks, UniStudy AI <strong>does not use advertising cookies, marketing trackers, Google AdSense, or third-party data broker pixels</strong>. We only use essential session tokens and functional local storage required to keep you signed in and enable offline study.
          </div>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed text-[#4A3B66] dark:text-[#C5B7DF]">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              1. What Are Cookies and Local Web Storage?
            </h2>
            <p>
              Cookies are small text files placed on your device when you visit a website. In modern web applications, browsers also support <strong>Local Storage</strong> and <strong>IndexedDB</strong>, which allow educational apps like UniStudy to store study notes, theme preferences, and revision decks locally on your device so you can study even on weak or intermittent internet connections.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              2. Exactly What We Store on Your Device
            </h2>
            <p>Here is an exhaustive list of all storage mechanisms utilized by UniStudy AI:</p>

            <div className="space-y-3">
              {/* Essential Item */}
              <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm text-[#1A0A2E] dark:text-white">
                    <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
                    <span>Supabase Authentication Session (`sb-*-auth-token`)</span>
                  </div>
                  <span className="text-[11px] bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 font-bold px-2 py-0.5 rounded-full uppercase">
                    Strictly Necessary
                  </span>
                </div>
                <p className="text-xs text-[#6B5A8A] dark:text-[#B39DDB]">
                  <strong>Purpose:</strong> Stores an encrypted, cryptographically signed session token so you don&rsquo;t have to type your password on every page reload. Managed directly by Supabase Auth with secure HTTP-only / same-site flags.
                </p>
              </div>

              {/* Functional Item */}
              <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm text-[#1A0A2E] dark:text-white">
                    <CheckCircle2 size={16} className="text-blue-600 dark:text-blue-400" />
                    <span>Theme Preference (`theme`)</span>
                  </div>
                  <span className="text-[11px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full uppercase">
                    Functional
                  </span>
                </div>
                <p className="text-xs text-[#6B5A8A] dark:text-[#B39DDB]">
                  <strong>Purpose:</strong> Remembers whether you selected Light Mode or Dark Mode in your browser&rsquo;s LocalStorage.
                </p>
              </div>

              {/* IndexedDB Item */}
              <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm text-[#1A0A2E] dark:text-white">
                    <CheckCircle2 size={16} className="text-purple-600 dark:text-purple-400" />
                    <span>Offline Study Cache (IndexedDB / Dexie.js)</span>
                  </div>
                  <span className="text-[11px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full uppercase">
                    Performance / Offline
                  </span>
                </div>
                <p className="text-xs text-[#6B5A8A] dark:text-[#B39DDB]">
                  <strong>Purpose:</strong> Caches your flashcards, courses, and review schedules locally in your browser so you can continue revising when campus Wi-Fi drops or when offline.
                </p>
              </div>

              {/* What We Don't Do */}
              <div className="p-4 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
                <div className="flex items-center gap-2 font-semibold text-sm text-red-800 dark:text-red-300 mb-1">
                  <XCircle size={16} className="text-red-600 dark:text-red-400" />
                  <span>Third-Party Tracking &amp; Advertising Cookies</span>
                </div>
                <p className="text-xs text-red-700 dark:text-red-400">
                  UniStudy <strong>does not</strong> deploy Facebook Pixel, TikTok Pixel, Google AdSense, or cross-site tracking beacons. We do not sell your study patterns to marketing networks.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              3. Managing &amp; Clearing Browser Storage
            </h2>
            <p>
              Because our cookies are strictly functional and essential for your study session to function, turning them off will prevent you from staying signed in. However, you can clear them at any time via your browser settings:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-xs md:text-sm">
              <li><strong>Chrome / Brave / Edge:</strong> Settings $\rightarrow$ Privacy &amp; Security $\rightarrow$ Clear browsing data $\rightarrow$ Cookies and other site data.</li>
              <li><strong>Firefox:</strong> Settings $\rightarrow$ Privacy &amp; Security $\rightarrow$ Cookies and Site Data $\rightarrow$ Clear Data.</li>
              <li><strong>Safari:</strong> Settings $\rightarrow$ Safari $\rightarrow$ Advanced $\rightarrow$ Website Data $\rightarrow$ Remove All Website Data.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              4. Questions
            </h2>
            <p>
              For questions regarding our storage practices, contact us at <a href="mailto:unistudy.ai@gmail.com" className="text-[#5B2D8E] dark:text-[#D1C4E9] underline font-medium">unistudy.ai@gmail.com</a>.
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
