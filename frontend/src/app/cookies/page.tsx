import React from "react";
import Link from "next/link";
import { MarketingNavbar } from "@/components/layout/MarketingNavbar";
import { MarketingFooter } from "@/components/layout/MarketingFooter";
import { Cookie, ShieldCheck, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

export const dynamic = 'force-static';

export const metadata = {
  title: "Cookie & Storage Policy | UniStudy AI",
  description: "Essential cookies and browser storage technologies used by UniStudy AI.",
};

export default function CookiesPage() {
  const lastUpdated = "October 25, 2026";

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#040416] text-[#00004E] dark:text-[#E2E8F0] transition-colors flex flex-col font-sans">
      <MarketingNavbar />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 md:py-16">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mb-4"
          >
            <ArrowLeft size={14} /> Back to home
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Cookie size={24} />
            </span>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              Cookie and storage policy
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Last updated: <span className="font-medium text-foreground">{lastUpdated}</span> (transparent, minimal storage disclosure).
          </p>
        </div>

        <div className="mb-10 p-4 md:p-5 rounded-2xl bg-secondary/50 dark:bg-card border border-border flex items-start gap-3.5">
          <ShieldCheck className="text-primary shrink-0 mt-0.5" size={20} />
          <div className="text-xs md:text-sm text-foreground leading-relaxed">
            <strong>Zero ad tracking:</strong> UniStudy AI <strong>does not use advertising cookies, marketing trackers, or cross-site pixels</strong>. We only use essential session tokens and functional local storage required to keep you signed in and enable offline study.
          </div>
        </div>

        <div className="space-y-10 text-[15px] leading-relaxed text-foreground/90">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
              1. What are cookies and local storage?
            </h2>
            <p>
              Cookies are small data files saved to your browser. Modern web applications also use <strong>LocalStorage</strong> and <strong>IndexedDB</strong>, allowing educational tools like UniStudy to cache notes and flashcards so you can continue revising when campus internet drops or speeds slow down.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
              2. What we store on your device
            </h2>
            <p>The following items are saved locally to support your study session:</p>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-[#D9E0EE] dark:border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm text-[#00004E] dark:text-white">
                    <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
                    <span>Supabase authentication session (`sb-*-auth-token`)</span>
                  </div>
                  <span className="text-[11px] bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 font-bold px-2 py-0.5 rounded-full uppercase">
                    Strictly necessary
                  </span>
                </div>
                <p className="text-xs text-[#5A6484] dark:text-[#94A3B8]">
                  Keeps you signed in so you do not have to enter credentials on every navigation. Managed by Supabase Auth with secure SameSite flags.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-[#D9E0EE] dark:border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm text-[#00004E] dark:text-white">
                    <CheckCircle2 size={16} className="text-blue-600 dark:text-blue-400" />
                    <span>Theme preference (`theme`)</span>
                  </div>
                  <span className="text-[11px] bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full uppercase">
                    Functional
                  </span>
                </div>
                <p className="text-xs text-[#5A6484] dark:text-[#94A3B8]">
                  Remembers your light or dark mode visual preference in browser LocalStorage.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-white/5 border border-[#D9E0EE] dark:border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm text-[#00004E] dark:text-white">
                    <CheckCircle2 size={16} className="text-[#D89A06] dark:text-[#F3CA68]" />
                    <span>Offline study cache (IndexedDB / Dexie.js)</span>
                  </div>
                  <span className="text-[11px] bg-[#D89A06]/15 dark:bg-[#D89A06]/20 text-[#8C6404] dark:text-[#F3CA68] font-bold px-2 py-0.5 rounded-full uppercase">
                    Offline performance
                  </span>
                </div>
                <p className="text-xs text-[#5A6484] dark:text-[#94A3B8]">
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
            <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
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
            <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
              4. Inquiries and questions
            </h2>
            <p>
              For questions regarding our storage practices, contact us at <a href="mailto:unistudy.ai@gmail.com" className="text-primary underline font-medium">unistudy.ai@gmail.com</a>.
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
