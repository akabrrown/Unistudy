import React from "react";
import { CollegiateLegalShell, BrowserStorageInspector } from "@/components/legal/CollegiateLegalShell";

export const dynamic = "force-static";

export const metadata = {
  title: "Cookie & Storage Policy | UniStudy AI",
  description: "Essential cookies and browser storage technologies used by UniStudy AI.",
};

const SECTIONS = [
  { id: "diagnostic", label: "1. Live Device Diagnostic" },
  { id: "stored", label: "2. What We Store Locally" },
  { id: "manage", label: "3. Clearing Browser Storage" },
];

export default function CookiesPage() {
  return (
    <CollegiateLegalShell
      title="Cookie & Storage Policy"
      subtitle="Transparent disclosure of authentication cookies and offline study storage."
      summaryBanner={
        <>
          <strong>Zero Ad Tracking:</strong> UniStudy deploys <strong>zero advertising cookies, behavioral pixels, or cross-site trackers</strong>. Local storage is used strictly to keep you signed in and cache your slides and flashcards for offline study.
        </>
      }
      sections={SECTIONS}
    >
      <section id="diagnostic" className="space-y-3 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          1. Live storage check on your browser
        </h2>
        <BrowserStorageInspector />
      </section>

      <section id="stored" className="space-y-4 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          2. Keys stored on your device
        </h2>

        <div className="overflow-x-auto rounded-xl border border-border/80 bg-white dark:bg-[#0A0A28]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/60 text-foreground font-semibold border-b border-border/70">
              <tr>
                <th className="p-3">Storage Key</th>
                <th className="p-3">Mechanism</th>
                <th className="p-3">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              <tr>
                <td className="p-3 font-mono font-semibold text-foreground">
                  <code>sb-*-auth-token</code>
                </td>
                <td className="p-3 font-mono text-muted-foreground">HTTP-Only Cookie</td>
                <td className="p-3 text-muted-foreground">
                  Maintains your authenticated Supabase session securely across page reloads (`SameSite=Lax`).
                </td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-semibold text-foreground">
                  <code>theme</code> &amp; <code>unistudy_settings_*</code>
                </td>
                <td className="p-3 font-mono text-muted-foreground">LocalStorage</td>
                <td className="p-3 text-muted-foreground">
                  Saves light/dark mode, accessibility font scale, and reading ruler preferences.
                </td>
              </tr>
              <tr>
                <td className="p-3 font-mono font-semibold text-foreground">
                  <code>UniStudyOfflineDB</code>
                </td>
                <td className="p-3 font-mono text-muted-foreground">IndexedDB (Dexie)</td>
                <td className="p-3 text-muted-foreground">
                  Caches active lecture decks, slide notes, and flashcards so revision continues during Wi-Fi drops.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="manage" className="space-y-3 scroll-mt-24">
        <h2 className="text-xl font-bold text-[#00004E] dark:text-white tracking-tight">
          3. Managing and clearing browser data
        </h2>
        <p>
          Clearing cookies signs you out and resets cached offline decks (your cloud records remain safely in your account):
        </p>
        <ul className="list-disc pl-6 space-y-1.5 text-xs sm:text-sm">
          <li><strong>Chrome / Edge / Brave:</strong> Settings &rarr; Privacy and security &rarr; Clear browsing data &rarr; Cookies and site data.</li>
          <li><strong>Firefox:</strong> Settings &rarr; Privacy &amp; Security &rarr; Cookies and Site Data &rarr; Clear Data.</li>
          <li><strong>Safari:</strong> Settings &rarr; Safari &rarr; Advanced &rarr; Website Data &rarr; Remove All.</li>
        </ul>
      </section>
    </CollegiateLegalShell>
  );
}
