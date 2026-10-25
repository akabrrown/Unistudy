import React from "react";
import Link from "next/link";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { Cookie, ShieldCheck, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Cookie & Storage Policy | UniStudy AI",
  description: "Essential cookies and browser storage technologies used by UniStudy AI.",
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
            <ArrowLeft size={14} /> Back to home
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 rounded-xl bg-[#EDE7F6] dark:bg-white/5 text-[#5B2D8E] dark:text-[#B39DDB]">
              <Cookie size={24} />
            </span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1A0A2E] dark:text-white" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Cookie and storage policy
            </h1>
          </div>
          <p className="text-sm text-[#6B5A8A] dark:text-[#B39DDB]">
            Last updated: <span className="font-medium text-[#1A0A2E] dark:text-white">{lastUpdated}</span> (transparent, minimal storage disclosure).
          </p>
        </div>

        <div className="mb-10 p-4 md:p-5 rounded-2xl bg-[#EDE7F6]/60 dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10 flex items-start gap-3.5">
          <ShieldCheck className="text-[#5B2D8E] dark:text-[#B39DDB] shrink-0 mt-0.5" size={20} />
          <div className="text-xs md:text-sm text-[#4A3B66] dark:text-[#D1C4E9] leading-relaxed">
            <strong>Zero ad tracking:</strong> UniStudy AI <strong>does not use advertising cookies, marketing trackers, or cross-site pixels</strong>. We only use essential session tokens and functional local storage required to keep you signed in and enable offline study.
          </div>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed text-[#4A3B66] dark:text-[#C5B7DF]">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              1. What are cookies and local storage?
            </h2>
            <p>
              Cookies are small data files saved to your browser. Modern web applications also use <strong>LocalStorage</strong> and <strong>IndexedDB</strong>, allowing educational tools like UniStudy to cache notes and flashcards so you can continue revising when campus internet drops or speeds slow down.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              2. What we store on your device
            </h2>
            <p>The following items are saved locally to support your study session:</p>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm text-[#1A0A2E] dark:text-white">
                    <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
                    <span>Supabase authentication session (`sb-*-auth-token`)</span>
                  </div>
                  <span className="text-[11px] bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 font-bold px-2 py-0.5 rounded-full uppercase">
                    Strictly necessary
                  </span>
                </div>
                <p className="text-xs text-[#6B5A8A] dark:text-[#B39DDB]">
                  Keeps you signed in so you do not have to enter credentials on every navigation. Managed by Supabase Auth with secure SameSite flags.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm text-[#1A0A2E] dark:text-white">
                    <CheckCircle2 size={16} className="text-blue-600 dark:text-blue-400" />
                    <span>Theme preference (`theme`)</span>
                  </div>
                  <span className="text-[11px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full uppercase">
                    Functional
                  </span>
                </div>
                <p className="text-xs text-[#6B5A8A] dark:text-[#B39DDB]">
                  Remembers your light or dark mode visual preference in browser LocalStorage.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-[#D1C4E9]/60 dark:border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm text-[#1A0A2E] dark:text-white">
                    <CheckCircle2 size={16} className="text-purple-600 dark:text-purple-400" />
                    <span>Offline study cache (IndexedDB / Dexie.js)</span>
                  </div>
                  <span className="text-[11px] bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full uppercase">
                    Offline performance
                  </span>
                </div>
                <p className="text-xs text-[#6B5A8A] dark:text-[#B39DDB]">
                  Caches active flashcards and lecture notes in your browser database so review sessions continue uninterrupted during network disruptions.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
                <div className="flex items-center gap-2 font-semibold text-sm text-red-800 dark:text-red-300 mb-1">
                  <XCircle size={16} className="text-red-600 dark:text-red-400" />
                  <span>Third-party tracking and advertising cookies</span>
                </div>
                <p className="text-xs text-red-700 dark:text-red-400">
                  UniStudy does not deploy advertising pixels or cross-site tracking beacons. We do not sell study habits or user metrics to advertising networks.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              3. Managing and clearing browser storage
            </h2>
            <p>
              Because our cookies are strictly functional, disabling them prevents you from staying signed in. You can clear them at any time via your browser settings:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-xs md:text-sm">
              <li><strong>Chrome / Brave / Edge:</strong> Settings → Privacy and security → Clear browsing data → Cookies and other site data.</li>
              <li><strong>Firefox:</strong> Settings → Privacy &amp; Security → Cookies and Site Data → Clear Data.</li>
              <li><strong>Safari:</strong> Settings → Safari → Advanced → Website Data → Remove All Website Data.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#1A0A2E] dark:text-white tracking-tight">
              4. Inquiries and questions
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
