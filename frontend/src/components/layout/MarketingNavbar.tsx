"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { UniStudyLogo } from "@/components/brand/UniStudyLogo";
import {
  Menu,
  X,
  Home,
  Layers,
  BookOpen,
  CreditCard,
  ShieldCheck,
  LifeBuoy,
  ArrowRight,
  GraduationCap,
  LogIn,
  Sparkles,
} from "lucide-react";

export function MarketingNavbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent background scroll when side drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navLinks = [
    {
      label: "Home",
      href: "/",
      icon: Home,
      description: "Overview, live past papers & campus news",
    },
    {
      label: "Academic Tools",
      href: "/features",
      icon: Layers,
      description: "AI Study Tutor, slide ingestion, OCR math",
    },
    {
      label: "How It Works",
      href: "/how-it-works",
      icon: BookOpen,
      description: "Step-by-step active recall & mock exams",
    },
    {
      label: "Pricing & Credits",
      href: "/pricing",
      icon: CreditCard,
      description: "Pay-As-You-Go credit packs with no lock-in",
    },
    {
      label: "Academic Integrity",
      href: "/academic-integrity",
      icon: ShieldCheck,
      description: "Syllabus grounding and honor code policy",
    },
    {
      label: "Student Support",
      href: "/contact",
      icon: LifeBuoy,
      description: "Direct assistance, inquiries & bug reports",
    },
  ];

  return (
    <>
      <nav className="sticky top-0 z-40 bg-[#FFFFFF]/90 dark:bg-[#040416]/90 backdrop-blur-md border-b-2 border-[#D89A06]/30 dark:border-white/10 px-6 sm:px-8 h-16 flex items-center justify-between transition-colors shadow-2xs">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <UniStudyLogo height={32} />
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-7 text-[13px] font-semibold text-[#4B526B] dark:text-[#A3A8C2]">
          {navLinks.slice(0, 5).map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`transition-colors py-1 relative hover:text-[#00004E] dark:hover:text-[#D89A06] ${
                  isActive ? "text-[#00004E] dark:text-[#D89A06] font-bold" : ""
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-[#D89A06] rounded-full" />
                )}
              </Link>
            );
          })}
          <Link
            href="/contact"
            className={`transition-colors py-1 relative hover:text-[#00004E] dark:hover:text-[#D89A06] ${
              pathname === "/contact" ? "text-[#00004E] dark:text-[#D89A06] font-bold" : ""
            }`}
          >
            Support
          </Link>
        </div>

        {/* Right Actions & Mobile Hamburger */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-[13px] font-bold text-[#00004E] dark:text-[#D89A06] px-4 py-2 hover:bg-[#FEF8E7] dark:hover:bg-white/5 rounded-xl transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-[13px] font-bold bg-[#00004E] text-white hover:bg-[#000038] border border-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#B88205] px-4.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Action Controls */}
          <div className="flex lg:hidden items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open public navigation menu"
              className="p-2 rounded-xl border border-border/80 bg-card hover:bg-muted text-[#00004E] dark:text-white transition-colors cursor-pointer shadow-2xs"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Professional Slide-Out Side Menu (Drawer) for Public Website */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-In Drawer Panel from Right */}
          <aside className="fixed top-0 right-0 bottom-0 w-full sm:w-[380px] bg-[#FFFFFF] dark:bg-[#0A0A28] border-l border-[#D89A06]/30 dark:border-white/10 shadow-2xl flex flex-col justify-between overflow-hidden z-50 animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#D89A06]/20 dark:border-white/10 flex items-center justify-between bg-[#F8F9FD] dark:bg-[#05051C]">
              <div className="space-y-1">
                <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                  <UniStudyLogo height={28} />
                </Link>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-[#D89A06] uppercase tracking-wider font-mono">
                    Official UPSA Academic Suite
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer border border-border/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-2 font-mono">
                Explore Platform
              </div>

              {navLinks.map((link) => {
                const IconComponent = link.icon;
                const isActive = pathname === link.href;

                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-start gap-3.5 p-3 rounded-xl transition-all group ${
                      isActive
                        ? "bg-[#FEF8E7] dark:bg-[#00004E]/60 border-2 border-[#D89A06]"
                        : "hover:bg-muted/60 border border-transparent hover:border-border/60"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                        isActive
                          ? "bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E]"
                          : "bg-[#00004E]/10 dark:bg-white/10 text-[#00004E] dark:text-[#D89A06]"
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-bold tracking-tight ${
                            isActive
                              ? "text-[#00004E] dark:text-white"
                              : "text-foreground group-hover:text-[#00004E] dark:group-hover:text-[#D89A06]"
                          }`}
                        >
                          {link.label}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-bold uppercase bg-[#D89A06] text-[#00004E] px-1.5 py-0.2 rounded-full font-mono">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {link.description}
                      </p>
                    </div>
                  </Link>
                );
              })}

              {/* Dedicated Academic Callout Card */}
              <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-[#FEF8E7] to-white dark:from-[#00004E]/40 dark:to-[#0A0A28] border-2 border-[#D89A06]/30 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#00004E] dark:text-[#D89A06]">
                  <GraduationCap className="w-4 h-4 text-[#D89A06]" />
                  <span>UPSA Student Advantage</span>
                </div>
                <p className="text-[11px] text-[#3A4363] dark:text-[#A3A8C2] leading-relaxed">
                  Access authentic past examination papers, syllabus slides, and 30 free daily compute tokens.
                </p>
              </div>
            </div>

            {/* Drawer Footer with Quick Auth Actions */}
            <div className="p-5 border-t border-[#D89A06]/20 dark:border-white/10 bg-[#F8F9FD] dark:bg-[#05051C] space-y-2.5">
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs bg-[#00004E] text-white hover:bg-[#000038] border-2 border-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] shadow-sm transition-all cursor-pointer"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-xs border border-border bg-card hover:bg-muted text-foreground transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[#D89A06]" />
                <span>Sign In to Student Portal</span>
              </Link>

              <div className="pt-2 text-center text-[10px] text-muted-foreground/70 font-medium">
                University of Professional Studies, Accra (UPSA)
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
