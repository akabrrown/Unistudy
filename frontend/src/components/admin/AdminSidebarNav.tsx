'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Users,
  LayoutDashboard,
  Settings,
  Activity,
  ShieldAlert,
  Cpu,
  Mail,
  UserPlus,
  CreditCard,
  Building,
  Globe,
  BookOpen,
  LifeBuoy,
  Menu,
  X,
  Search,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { CommandPaletteModal, triggerCommandPalette } from '@/components/layout/CommandPaletteModal';
import { SignOutSubmitButton } from '@/components/layout/SignOutSubmitButton';
import { UniStudyLogo } from '@/components/brand/UniStudyLogo';
import { SPRING_SNAPPY, useAppReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface AdminNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

const ADMIN_GROUPS: AdminNavGroup[] = [
  {
    title: 'Analytics & Users',
    items: [
      { label: 'Overview', href: '/admin', icon: LayoutDashboard },
      { label: 'User Directory', href: '/admin/users', icon: Users },
      { label: 'Subscriptions & MoMo', href: '/admin/subscriptions', icon: CreditCard },
    ],
  },
  {
    title: 'Academics & CMS',
    items: [
      { label: 'Public Site CMS', href: '/admin/cms', icon: Globe },
      { label: 'Course Registry', href: '/admin/courses', icon: BookOpen },
      { label: 'Content Moderation', href: '/admin/content', icon: ShieldAlert },
      { label: 'UPSA Faculties', href: '/admin/institution-counts', icon: Building },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Support Desk', href: '/admin/support', icon: LifeBuoy },
      { label: 'AI Infrastructure', href: '/admin/ai-infrastructure', icon: Cpu },
      { label: 'Announcements', href: '/admin/announcements', icon: Mail },
      { label: 'Referrals', href: '/admin/referrals', icon: UserPlus },
      { label: 'Audit Logs', href: '/admin/audit', icon: Activity },
      { label: 'Platform Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

interface AdminSidebarNavProps {
  userEmail: string;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}

export function AdminSidebarNav({
  userEmail,
  signOutAction,
  children,
}: AdminSidebarNavProps) {
  const pathname = usePathname();
  const reducedMotion = useAppReducedMotion();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const currentItem =
    ADMIN_GROUPS.flatMap((g) => g.items).find((item) => isActive(item.href)) ||
    ADMIN_GROUPS[0].items[0];

  const renderNavLinks = (scopeId: string) => (
    <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto [&::-webkit-scrollbar]:hidden">
      {ADMIN_GROUPS.map((group) => (
        <div key={group.title} className="space-y-0.5">
          <div className="px-2.5 pb-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground/70">
            {group.title}
          </div>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors',
                  active
                    ? 'text-[#00004E] dark:text-white font-semibold bg-[#F0F3F9] dark:bg-white/[0.06]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium'
                )}
              >
                {active && (
                  <motion.span
                    layoutId={`${scopeId}-active-bar`}
                    transition={reducedMotion ? { duration: 0 } : SPRING_SNAPPY}
                    className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-full bg-[#D89A06]"
                  />
                )}
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    active
                      ? 'text-[#00004E] dark:text-[#D89A06]'
                      : 'text-muted-foreground/80 group-hover:text-foreground'
                  )}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex h-[100dvh] bg-background text-foreground">
      <CommandPaletteModal isAdmin />

      {/* Desktop Sidebar */}
      <aside className="w-60 border-r border-border/60 bg-card hidden md:flex flex-col shrink-0 select-none">
        <div className="h-14 px-4 border-b border-border/60 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 min-w-0">
            <UniStudyLogo variant="icon" height={26} className="shrink-0" alt="UniStudy Crest" />
            <span className="text-sm font-bold tracking-tight text-foreground truncate">
              UniStudy <span className="text-[#D89A06]">Admin</span>
            </span>
          </Link>
        </div>

        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={triggerCommandPalette}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-border/70 bg-muted/30 hover:bg-muted/60 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-[#D89A06] shrink-0" />
              <span>Quick jump...</span>
            </span>
            <kbd className="font-mono text-[10px] px-1 rounded bg-background border border-border">⌘K</kbd>
          </button>
        </div>

        {renderNavLinks('desktop-admin')}

        <div className="p-3 border-t border-border/60 space-y-2">
          <div className="px-2 text-[11px] text-muted-foreground truncate font-mono" title={userEmail}>
            {userEmail}
          </div>
          <form action={signOutAction}>
            <SignOutSubmitButton label="Sign Out Admin" />
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Whisper 48px-56px Linear Admin Top Bar */}
        <header className="h-14 border-b border-border/60 bg-card/80 backdrop-blur-md flex items-center justify-between px-4 md:px-6 shrink-0 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile Hamburger Drawer */}
            <div className="md:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger className="p-2 rounded-lg border border-border/70 hover:bg-muted text-foreground cursor-pointer">
                  <Menu className="w-4 h-4" />
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-[280px] bg-card flex flex-col">
                  <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
                  <div className="h-14 px-4 border-b border-border/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UniStudyLogo variant="icon" height={24} />
                      <span className="text-sm font-bold">
                        UniStudy <span className="text-[#D89A06]">Admin</span>
                      </span>
                    </div>
                    <SheetClose className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer">
                      <X className="w-4 h-4" />
                    </SheetClose>
                  </div>
                  {renderNavLinks('mobile-admin')}
                  <div className="p-3 border-t border-border/60">
                    <form action={signOutAction}>
                      <SignOutSubmitButton label="Sign Out Admin" />
                    </form>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <nav aria-label="Admin breadcrumb" className="flex items-center gap-1.5 text-xs min-w-0">
              <Link href="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
                Admin
              </Link>
              {currentItem.href !== '/admin' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                  <span className="font-semibold text-foreground truncate">{currentItem.label}</span>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 h-8 rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
            >
              <span>Student App</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
