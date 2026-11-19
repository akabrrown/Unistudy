"use client";
import React, { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function MarketingNavbar() {
  const links = [
    { label: "Home", href: "/" },
    { label: "Features", href: "/features" },
    { label: "How it works", href: "/how-it-works" },
    { label: "Pricing", href: "/pricing" },
    { label: "Contact", href: "/contact" },
  ];

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 bg-[#FFFFFF]/90 dark:bg-[#040416]/90 backdrop-blur border-b-2 border-[#D89A06]/30 dark:border-white/10 px-8 h-16 flex items-center justify-between transition-colors shadow-2xs">
      <Link href="/" className="flex items-center gap-2">
        <img src="/logo.jpeg" alt="UniStudy AI" className="h-8 w-auto object-contain dark:hidden" />
        <img src="/logo-dark.jpeg" alt="UniStudy AI" className="h-8 w-auto object-contain hidden dark:block" />
      </Link>
      {/* Desktop links */}
      <div className="hidden md:flex items-center gap-7 text-[14px] text-[#4B526B] dark:text-[#A3A8C2]">
        {links.map((link) => (
          <Link key={link.label} href={link.href} className="hover:text-[#00004E] dark:hover:text-[#D89A06] transition-colors">
            {link.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            className="p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D89A06]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            <svg className="h-6 w-6 text-[#00004E] dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="text-[14px] font-bold text-[#00004E] dark:text-[#D89A06] px-4 py-2 hover:bg-[#FEF8E7] dark:hover:bg-white/5 rounded-xl transition-colors">
            Log in
          </Link>
          <Link href="/signup" className="text-[14px] font-bold bg-[#00004E] text-white hover:bg-[#000038] border border-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#B88205] px-5 py-2 rounded-xl transition-all shadow-xs cursor-pointer">
            Get Started Free
          </Link>
        </div>
      </div>
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed z-50 top-16 left-0 w-full bg-[#F8F9FD] dark:bg-[#040416] border-b border-[#D89A06]/20 dark:border-white/10 md:hidden shadow-lg">
          <div className="flex flex-col p-4 space-y-4">
            {links.map((link) => (
              <Link key={link.label} href={link.href} className="text-[15px] font-medium text-[#4B526B] dark:text-[#A3A8C2] hover:text-[#00004E] dark:hover:text-[#D89A06] transition-colors" onClick={() => setMobileMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
            <hr className="border-[#D89A06]/20 dark:border-white/10" />
            <div className="flex flex-col gap-3">
              <Link href="/login" className="text-center text-[15px] font-medium text-[#00004E] dark:text-[#D89A06] px-4 py-3 hover:bg-[#FEF8E7] dark:hover:bg-white/5 rounded-xl transition-colors border border-[#00004E]/20 dark:border-white/10" onClick={() => setMobileMenuOpen(false)}>
                Log in
              </Link>
              <Link href="/signup" className="text-center text-[15px] font-medium bg-[#00004E] text-white hover:bg-[#000038] dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#B88205] px-5 py-3 rounded-[14px] transition-colors shadow-sm" onClick={() => setMobileMenuOpen(false)}>
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
