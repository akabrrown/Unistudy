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

  return (
    <nav className="sticky top-0 z-40 bg-[#FAF8FF]/90 dark:bg-[#0F0C29]/90 backdrop-blur border-b border-[#D1C4E9]/60 dark:border-white/10 px-8 h-16 flex items-center justify-between transition-colors">
      <Link href="/" className="flex items-center gap-2">
        <img src="/logo.jpeg" alt="UniStudy AI" className="h-8 w-auto object-contain dark:hidden" />
        <img src="/logo-dark.jpeg" alt="UniStudy AI" className="h-8 w-auto object-contain hidden dark:block" />
      </Link>
      <div className="hidden md:flex items-center gap-7 text-[14px] text-[#6B5A8A] dark:text-[#B39DDB]">
        {links.map((link) => (
          <Link key={link.label} href={link.href} className="hover:text-[#5B2D8E] dark:hover:text-white transition-colors">
            {link.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Link href="/login" className="text-[14px] font-medium text-[#5B2D8E] dark:text-[#D1C4E9] px-4 py-2 hover:bg-[#EDE7F6] dark:hover:bg-white/5 rounded-xl transition-colors">
          Log in
        </Link>
        <Link href="/signup" className="text-[14px] font-medium bg-[#5B2D8E] text-white px-5 py-2 rounded-[14px] hover:bg-[#3D1A6E] transition-colors">
          Get Started Free
        </Link>
      </div>
    </nav>
  );
}
