import React from "react";
import Link from "next/link";
import { ShieldCheck, Mail } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="bg-[#F0F3F9] dark:bg-[#06061E] border-t border-[#D89A06]/20 dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12 pb-12 border-b border-[#D89A06]/15 dark:border-white/5">
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.jpeg" alt="UniStudy AI" className="h-8 w-auto object-contain dark:hidden" />
              <img src="/logo-dark.jpeg" alt="UniStudy AI" className="h-8 w-auto object-contain hidden dark:block" />
            </Link>
            <p className="text-[14px] text-[#4B526B] dark:text-[#A3A8C2] leading-relaxed max-w-sm">
              Study companion designed for university students. Turn lecture slides, syllabi, and past questions into personalized quizzes, flashcards, and revision notes.
            </p>
            <div className="flex items-center gap-2 text-xs font-medium text-[#00004E] dark:text-[#D89A06] bg-[#FEF8E7] dark:bg-[#00004E]/50 border border-[#D89A06]/20 px-3 py-1.5 rounded-full w-fit">
              <ShieldCheck size={14} className="text-[#00004E] dark:text-[#D89A06]" />
              <span>Compliant with Ghana Data Protection Act (Act 843)</span>
            </div>
          </div>

          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-wider text-[#00004E] dark:text-white mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-[14px] text-[#4B526B] dark:text-[#A3A8C2]">
              <li>
                <Link href="/features" className="hover:text-[#00004E] dark:hover:text-[#D89A06] transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-[#00004E] dark:hover:text-[#D89A06] transition-colors">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-[#00004E] dark:hover:text-[#D89A06] transition-colors">
                  Pay-as-you-go pricing
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-[#00004E] dark:hover:text-[#D89A06] transition-colors flex items-center gap-1.5">
                  <span>Create account</span>
                  <span className="text-[10px] bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] px-1.5 py-0.5 rounded font-semibold">Free</span>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-wider text-[#00004E] dark:text-white mb-4">
              Legal &amp; trust
            </h4>
            <ul className="space-y-2.5 text-[14px] text-[#4B526B] dark:text-[#A3A8C2]">
              <li>
                <Link href="/terms" className="hover:text-[#00004E] dark:hover:text-[#D89A06] transition-colors">
                  Terms of service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#00004E] dark:hover:text-[#D89A06] transition-colors">
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-[#00004E] dark:hover:text-[#D89A06] transition-colors">
                  Cookie &amp; storage policy
                </Link>
              </li>
              <li>
                <Link href="/academic-integrity" className="hover:text-[#00004E] dark:hover:text-[#D89A06] transition-colors">
                  Academic integrity
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[13px] font-bold uppercase tracking-wider text-[#00004E] dark:text-white mb-4">
              Support
            </h4>
            <ul className="space-y-2.5 text-[14px] text-[#4B526B] dark:text-[#A3A8C2]">
              <li>
                <Link href="/contact" className="hover:text-[#00004E] dark:hover:text-[#D89A06] transition-colors">
                  Contact support
                </Link>
              </li>
              <li>
                <a href="mailto:unistudy.ai@gmail.com" className="hover:text-[#00004E] dark:hover:text-[#D89A06] transition-colors flex items-center gap-1.5">
                  <Mail size={14} />
                  <span>unistudy.ai@gmail.com</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#9E8CB5]">
          <p>© {new Date().getFullYear()} UniStudy AI Ltd. All rights reserved.</p>
          <p className="text-center md:text-right">
            Built for tertiary students across Ghana and West Africa
          </p>
        </div>
      </div>
    </footer>
  );
}
