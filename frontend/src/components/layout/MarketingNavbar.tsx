"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ThemeToggle } from "./ThemeToggle";
import { UniStudyLogo } from "@/components/brand/UniStudyLogo";
import { SPRING_SNAPPY, SPRING_FLUID, useAppReducedMotion } from "@/lib/motion";
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
  LogIn,
} from "lucide-react";

export function MarketingNavbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const reducedMotion = useAppReducedMotion();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
      description: "Overview, live past papers & syllabus tools",
    },
    {
      label: "Academic Tools",
      href: "/features",
      icon: Layers,
      description: "Slide reader, past paper simulator & math plotter",
    },
    {
      label: "How It Works",
      href: "/how-it-works",
      icon: BookOpen,
      description: "Three steps from lecture PDF to timed mock exam",
    },
    {
      label: "Pricing",
      href: "/pricing",
      icon: CreditCard,
      description: "Free 6-hour passes & Mobile Money credit packs",
    },
    {
      label: "Integrity",
      href: "/academic-integrity",
      icon: ShieldCheck,
      description: "Citation grounding & university honor code",
    },
    {
      label: "Support",
      href: "/contact",
      icon: LifeBuoy,
      description: "Direct student helpdesk & past paper requests",
    },
  ];

  return (
    <>
      <nav className="sticky top-0 z-40 bg-[#FFFFFF]/90 dark:bg-[#040416]/90 backdrop-blur-md border-b border-border/60 dark:border-white/10 px-6 sm:px-8 h-16 flex items-center justify-between transition-colors">
        <Link href="/" className="flex items-center gap-2.5 group shrink-0">
          <UniStudyLogo height={32} />
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-6 text-[13px] font-medium text-[#4B526B] dark:text-[#A3A8C2]">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors py-1.5 relative hover:text-[#00004E] dark:hover:text-white ${
                  isActive ? "text-[#00004E] dark:text-white font-semibold" : ""
                }`}
              >
                <span>{link.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="marketing-nav-underline"
                    transition={reducedMotion ? { duration: 0 } : SPRING_SNAPPY}
                    className="absolute -bottom-[17px] left-0 right-0 h-[2px] bg-[#D89A06]"
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right Actions & Mobile Hamburger */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2.5">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-[13px] font-semibold text-[#00004E] dark:text-white px-3.5 py-2 hover:bg-muted/70 rounded-lg transition-colors active:scale-[0.98]"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-[13px] font-semibold bg-[#00004E] text-white hover:bg-[#000038] border border-[#D89A06]/60 dark:bg-[#D89A06] dark:text-[#00004E] dark:hover:bg-[#C28905] px-4 py-2 rounded-lg transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1.5 active:scale-[0.98]"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex lg:hidden items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="p-2 rounded-lg border border-border/70 bg-card hover:bg-muted text-[#00004E] dark:text-white transition-colors cursor-pointer active:scale-[0.97]"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.18 }}
              className="fixed inset-0 bg-black/55 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            <motion.aside
              initial={reducedMotion ? { opacity: 0 } : { x: "100%" }}
              animate={reducedMotion ? { opacity: 1 } : { x: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { x: "100%" }}
              transition={reducedMotion ? { duration: 0.12 } : SPRING_FLUID}
              className="fixed top-0 right-0 bottom-0 w-full sm:w-[360px] bg-[#FFFFFF] dark:bg-[#0A0A28] border-l border-border/60 dark:border-white/10 shadow-2xl flex flex-col justify-between overflow-hidden z-50"
            >
              <div className="px-5 h-16 border-b border-border/50 dark:border-white/10 flex items-center justify-between">
                <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                  <UniStudyLogo height={28} />
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {navLinks.map((link) => {
                  const IconComponent = link.icon;
                  const isActive = pathname === link.href;

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-start gap-3 p-3 rounded-xl transition-colors group ${
                        isActive
                          ? "bg-[#F0F3F9] dark:bg-white/[0.06] border-l-2 border-l-[#D89A06]"
                          : "hover:bg-muted/60"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isActive
                            ? "bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E]"
                            : "bg-muted text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground">
                          {link.label}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {link.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="p-5 border-t border-border/50 dark:border-white/10 bg-muted/20 space-y-2.5">
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 h-10 px-4 rounded-lg font-semibold text-xs bg-[#00004E] text-white hover:bg-[#000038] border border-[#D89A06]/60 dark:bg-[#D89A06] dark:text-[#00004E] transition-colors cursor-pointer"
                >
                  <span>Create Free Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 h-10 px-4 rounded-lg font-semibold text-xs border border-border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
