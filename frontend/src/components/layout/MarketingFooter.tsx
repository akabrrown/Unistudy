import React from "react";
import Link from "next/link";
import { ShieldCheck, Mail, ArrowUpRight } from "lucide-react";
import { UniStudyLogo } from "@/components/brand/UniStudyLogo";

export function MarketingFooter() {
  return (
    <footer className="bg-[#F0F3F9] dark:bg-[#06061E] border-t border-border/60 dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12 pb-10 border-b border-border/50 dark:border-white/10">
          <div className="lg:col-span-2 space-y-3.5">
            <Link href="/" className="inline-flex items-center gap-2">
              <UniStudyLogo height={30} />
            </Link>
            <p className="text-[13.5px] text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed max-w-sm">
              Academic workspace built for university students. Turn lecture slide decks, syllabi, and past exam papers into cited study notes, flashcards, and timed mock exams.
            </p>
            <div className="inline-flex items-center gap-2 text-xs text-[#4B526B] dark:text-[#A3A8C2] pt-1">
              <ShieldCheck size={14} className="text-[#00004E] dark:text-[#D89A06] shrink-0" />
              <span>Ghana Data Protection Act (Act 843) compliant</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-[#00004E] dark:text-white mb-3.5">
              Platform
            </h4>
            <ul className="space-y-2.5 text-[13.5px] text-[#4B526B] dark:text-[#A3A8C2]">
              <li>
                <Link href="/features" className="hover:text-[#00004E] dark:hover:text-white transition-colors">
                  Academic Tools
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-[#00004E] dark:hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-[#00004E] dark:hover:text-white transition-colors">
                  Passes &amp; Credits
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-[#00004E] dark:hover:text-white transition-colors inline-flex items-center gap-1">
                  <span>Create Student Account</span>
                  <ArrowUpRight className="w-3 h-3 opacity-60" />
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-[#00004E] dark:text-white mb-3.5">
              Trust &amp; Legal
            </h4>
            <ul className="space-y-2.5 text-[13.5px] text-[#4B526B] dark:text-[#A3A8C2]">
              <li>
                <Link href="/academic-integrity" className="hover:text-[#00004E] dark:hover:text-white transition-colors">
                  Academic Integrity
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#00004E] dark:hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#00004E] dark:hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-[#00004E] dark:hover:text-white transition-colors">
                  Cookie &amp; Storage Policy
                </Link>
              </li>
              <li>
                <Link href="/brand" className="hover:text-[#00004E] dark:hover:text-white transition-colors">
                  Brand Guidelines
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-[#00004E] dark:text-white mb-3.5">
              Support
            </h4>
            <ul className="space-y-2.5 text-[13.5px] text-[#4B526B] dark:text-[#A3A8C2]">
              <li>
                <Link href="/contact" className="hover:text-[#00004E] dark:hover:text-white transition-colors">
                  Student Helpdesk
                </Link>
              </li>
              <li>
                <a href="mailto:unistudy.ai@gmail.com" className="hover:text-[#00004E] dark:hover:text-white transition-colors inline-flex items-center gap-1.5">
                  <Mail size={13} className="shrink-0" />
                  <span>unistudy.ai@gmail.com</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[#4B526B] dark:text-[#A3A8C2]">
          <p>© {new Date().getFullYear()} UniStudy AI Ltd. All rights reserved.</p>
          <p className="text-center sm:text-right">
            Built for university students at UPSA and across West Africa
          </p>
        </div>
      </div>
    </footer>
  );
}
