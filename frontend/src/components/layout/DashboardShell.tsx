'use client';

import React, { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { signout } from '@/app/(auth)/actions';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { ModelSelector } from '@/components/layout/ModelSelector';
import SmartSearchBar from '@/components/layout/SmartSearchBar';
import { AnnouncementBanner } from '@/components/layout/AnnouncementBanner';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { UniStudyLogo } from '@/components/brand/UniStudyLogo';
import { cn, formatAcademicLevel } from '@/lib/utils';
import {
  LayoutDashboard,
  BrainCircuit,
  BookOpen,
  CalendarDays,
  Camera,
  FileText,
  LineChart,
  Accessibility,
  CreditCard,
  Shield,
  PlaySquare,
  User as UserIcon,
  Award,
  Search,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  Calculator,
  Plus,
  Archive,
  Upload,
  Clock,
  Pin,
  Compass,
  Target,
  GraduationCap,
  Coins,
} from 'lucide-react';

interface SubNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  color?: string;
  badge?: string;
  subItems?: SubNavItem[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Core & AI',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        label: 'AI Study Tutor',
        href: '/dashboard/chat',
        icon: BrainCircuit,
        badge: 'AI',
      },
    ],
  },
  {
    title: 'Academic Suite',
    items: [
      {
        label: 'Courses & Slides',
        href: '/dashboard/courses',
        icon: BookOpen,
        subItems: [
          { label: 'Active Courses', href: '/dashboard/courses', icon: BookOpen },
          { label: 'Exam Areas', href: '/dashboard/courses?action=exam-areas', icon: Target },
          { label: 'Recent Lectures', href: '/dashboard/lectures', icon: Clock },
          { label: 'New Course', href: '/dashboard/courses?action=new', icon: Plus },
          { label: 'Archived Courses', href: '/dashboard/courses?tab=archived', icon: Archive },
          { label: 'Math Solver', href: '/dashboard/calculator?tab=solver', icon: Calculator },
          { label: 'Graph Plotter', href: '/dashboard/calculator?tab=graph', icon: Compass },
        ],
      },
      {
        label: 'Past Exam Papers',
        href: '/dashboard/past-papers',
        icon: Award,
        subItems: [
          { label: 'Question Bank', href: '/dashboard/past-papers', icon: FileText },
          { label: 'Exam Areas', href: '/dashboard/past-papers?action=exam-areas', icon: Target },
          { label: 'Upload Paper', href: '/dashboard/past-papers?action=upload', icon: Upload },
        ],
      },
      {
        label: 'Study Calendar',
        href: '/dashboard/calendar',
        icon: CalendarDays,
        subItems: [
          { label: 'Live Calendar', href: '/dashboard/calendar?view=calendar', icon: CalendarDays },
          { label: 'Weekly Timetable', href: '/dashboard/calendar?view=timetable', icon: Clock },
          { label: 'Add Event', href: '/dashboard/calendar?action=add', icon: Plus },
        ],
      },
      {
        label: 'Notes Scanner',
        href: '/dashboard/scanner',
        icon: Camera,
      },
      {
        label: 'Essay Grader',
        href: '/dashboard/essay-grader',
        icon: FileText,
      },
      {
        label: 'Analytics & Insights',
        href: '/dashboard/analytics',
        icon: LineChart,
      },
    ],
  },
  {
    title: 'Resources',
    items: [
      {
        label: 'YouTube Study',
        href: '/dashboard/youtube',
        icon: PlaySquare,
        color: 'text-red-500',
        subItems: [
          { label: 'Discover Lectures', href: '/dashboard/youtube', icon: Search },
          { label: 'Pinned Library', href: '/dashboard/youtube/pinned', icon: Pin },
        ],
      },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Profile Studio', href: '/dashboard/settings/profile', icon: UserIcon },
      { label: 'Accessibility', href: '/dashboard/settings/accessibility', icon: Accessibility },
      { label: 'Billing & Credits', href: '/dashboard/settings/billing', icon: CreditCard },
    ],
  },
];

interface DashboardProfile {
  role?: string | null;
  avatar_url?: string | null;
  full_name?: string | null;
  username?: string | null;
  faculty?: string | null;
  degree_programme?: string | null;
  year_of_study?: string | number | null;
  subscription_tier?: string | null;
  institutions?: {
    name?: string | null;
    abbreviation?: string | null;
  } | null;
}

interface DashboardShellProps {
  profile: DashboardProfile | null;
  latestAnnouncement: { id: string; title: string; body: string } | null;
  initialWalletBalance?: number;
  children: React.ReactNode;
}

const subscribeStorage = (cb: () => void) => {
  window.addEventListener('storage', cb);
  window.addEventListener('unistudy-sidebar-change', cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener('unistudy-sidebar-change', cb);
  };
};

const getSidebarCollapsedSnapshot = () => {
  try {
    return localStorage.getItem('unistudy_sidebar_collapsed') === 'true';
  } catch {
    return false;
  }
};

const subscribeHash = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

const getHashSnapshot = () => (typeof window !== 'undefined' ? window.location.hash || '' : '');

export function DashboardShell({ profile, latestAnnouncement, initialWalletBalance, children }: DashboardShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [walletBalance, setWalletBalance] = useState<number>(initialWalletBalance ?? 20);
  const [freePasses, setFreePasses] = useState<number | null>(null);
  const [paidCredits, setPaidCredits] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function syncWallet() {
      try {
        const res = await fetch('/api/quota/status', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (typeof data.wallet_balance === 'number') setWalletBalance(data.wallet_balance);
            else if (typeof data.walletBalance === 'number') setWalletBalance(data.walletBalance);
            if (typeof data.free_passes === 'number') setFreePasses(data.free_passes);
            if (typeof data.paid_credits === 'number') setPaidCredits(data.paid_credits);
          }
        }
      } catch {
        // retain balance
      }
    }
    syncWallet();

    const handleCreditsChanged = (e: Event) => {
      const ce = e as CustomEvent<{ balance?: number; freePasses?: number; paidCredits?: number }>;
      if (typeof ce.detail?.balance === 'number') {
        setWalletBalance(ce.detail.balance);
      }
      if (typeof ce.detail?.freePasses === 'number') {
        setFreePasses(ce.detail.freePasses);
      }
      if (typeof ce.detail?.paidCredits === 'number') {
        setPaidCredits(ce.detail.paidCredits);
      }
    };
    window.addEventListener('unistudy-credits-changed', handleCreditsChanged);

    return () => {
      isMounted = false;
      window.removeEventListener('unistudy-credits-changed', handleCreditsChanged);
    };
  }, [pathname]);

  const isCollapsed = useSyncExternalStore(
    subscribeStorage,
    getSidebarCollapsedSnapshot,
    () => false
  );
  const currentHash = useSyncExternalStore(subscribeHash, getHashSnapshot, () => '');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [clickedSub, setClickedSub] = useState<{ pathname: string; href: string } | null>(null);

  const setCollapsedStorage = useCallback((next: boolean) => {
    try {
      localStorage.setItem('unistudy_sidebar_collapsed', String(next));
      window.dispatchEvent(new Event('unistudy-sidebar-change'));
    } catch {}
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsedStorage(!getSidebarCollapsedSnapshot());
  }, [setCollapsedStorage]);

  const expandSidebar = useCallback(() => {
    setCollapsedStorage(false);
  }, [setCollapsedStorage]);

  // Keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (!isInput && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapse();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCollapse]);

  const isRouteActive = useCallback((href: string) => {
    const baseHref = href.split('#')[0].split('?')[0];
    if (baseHref === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname === baseHref || pathname.startsWith(baseHref + '/');
  }, [pathname]);

  const isNavGroupActive = useCallback((item: NavItem) => {
    if (isRouteActive(item.href)) return true;
    return (item.subItems || []).some((sub) => isRouteActive(sub.href));
  }, [isRouteActive]);

  const activeClickedSubHref =
    clickedSub && clickedSub.pathname === pathname ? clickedSub.href : null;

  const isSubItemActive = (subHref: string) => {
    if (activeClickedSubHref) {
      return activeClickedSubHref === subHref;
    }
    const [pathAndQuery, hash] = subHref.split('#');
    const [basePath, queryStr] = pathAndQuery.split('?');
    if (pathname !== basePath) return false;
    if (queryStr) {
      const expected = new URLSearchParams(queryStr);
      for (const [k, v] of expected.entries()) {
        if (searchParams.get(k) !== v) return false;
      }
      return true;
    }
    if (hash) {
      return currentHash === `#${hash}`;
    }
    return !searchParams.toString() && !currentHash;
  };

  const toggleGroup = (item: NavItem) => {
    const currentlyOpen = openGroups[item.href] ?? isNavGroupActive(item);
    setOpenGroups((prev) => ({ ...prev, [item.href]: !currentlyOpen }));
  };

  // Render navigation list
  const renderNav = (collapsed: boolean) => (
    <nav className="space-y-3.5 flex-1 overflow-y-auto overflow-x-hidden pr-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* Prominent Admin Panel Button for Administrators */}
      {profile?.role === 'admin' && (
        <div className={cn("pb-2 mb-2 border-b border-[#D89A06]/20", collapsed ? "flex justify-center" : "px-0.5")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/admin"
                    className="flex items-center justify-center w-10 h-10 border-2 border-[#D89A06] bg-[#D89A06]/15 text-[#00004E] dark:text-[#D89A06] hover:bg-[#D89A06] hover:text-[#00004E] rounded-xl transition-all shadow-xs"
                    aria-label="Admin Control Panel"
                  >
                    <Shield className="w-4 h-4 text-[#D89A06]" />
                  </Link>
                }
              />
              <TooltipContent side="right" sideOffset={12}>
                <span className="font-semibold text-xs">Admin Control Panel</span>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/admin"
              className="flex items-center justify-between px-3.5 py-2.5 border-2 border-[#D89A06] bg-[#FEF8E7] dark:bg-[#00004E]/60 hover:bg-[#FDF2D0] dark:hover:bg-[#00004E] text-[#00004E] dark:text-[#D89A06] rounded-xl transition-all font-bold text-xs shadow-xs group"
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-[#D89A06] group-hover:scale-110 transition-transform" />
                <span className="font-bold text-[#00004E] dark:text-white">Admin Control Center</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded font-extrabold bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E]">
                ADMIN
              </span>
            </Link>
          )}
        </div>
      )}

      {NAV_SECTIONS.map((section, sectionIdx) => (
        <div key={section.title} className={cn(sectionIdx > 0 && "pt-1")}>
          {!collapsed ? (
            <div className="flex items-center justify-between px-3 mb-1.5 select-none">
              <span className="text-[10px] font-bold font-mono text-muted-foreground/80 uppercase tracking-widest">
                {section.title}
              </span>
            </div>
          ) : (
            sectionIdx > 0 && <div className="border-t border-border/50 my-2 mx-1" />
          )}

          <div className="space-y-1">
            {section.items.map((item: NavItem) => {
              const active = isNavGroupActive(item);
              const Icon = item.icon;
              const hasSubItems = Boolean(item.subItems && item.subItems.length > 0);
              const isOpen = openGroups[item.href] ?? active;

              if (collapsed) {
                return (
                  <div key={item.href} className="flex justify-center">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                              active
                                ? "bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] shadow-sm font-bold"
                                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                            )}
                            aria-label={item.label}
                          >
                            <Icon className={cn("w-4 h-4", item.color)} />
                          </Link>
                        }
                      />
                      <TooltipContent side="right" sideOffset={12}>
                        <div className="font-medium text-xs">{item.label}</div>
                        {hasSubItems && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {item.subItems!.map((s) => s.label).join(' · ')}
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              }

              return (
                <div key={item.href} className="space-y-0.5">
                  <div
                    className={cn(
                      "flex items-center rounded-xl transition-all duration-200 group relative overflow-hidden",
                      active
                        ? "bg-[#00004E] text-white dark:bg-[#D89A06] dark:text-[#00004E] font-bold shadow-xs"
                        : "text-[#3A4363] dark:text-[#A3A8C2] hover:bg-[#F0F3F9] dark:hover:bg-white/5 hover:text-[#00004E] dark:hover:text-white font-medium"
                    )}
                  >
                    <Link
                      href={item.href}
                      onClick={() => {
                        setClickedSub(null);
                        if (hasSubItems) {
                          setOpenGroups((prev) => ({ ...prev, [item.href]: true }));
                        }
                      }}
                      className="flex-1 flex items-center min-w-0 px-3 py-2 text-xs font-semibold"
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4 mr-2.5 transition-colors shrink-0",
                          item.color
                            ? item.color
                            : active
                            ? "text-[#D89A06] dark:text-[#00004E]"
                            : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            "ml-auto mr-1 text-[9px] font-mono px-1.5 py-0.2 rounded-md font-extrabold uppercase",
                            active
                              ? "bg-[#D89A06] text-[#00004E] dark:bg-[#00004E] dark:text-[#D89A06]"
                              : "bg-[#D89A06]/20 text-[#D89A06]"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>

                    {hasSubItems && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(item)}
                        aria-expanded={isOpen}
                        aria-label={`Toggle ${item.label} submenu`}
                        className={cn(
                          "p-2 mr-1 rounded-lg transition-colors focus:outline-hidden",
                          active
                            ? "text-white/80 hover:text-white dark:text-[#00004E]/80 dark:hover:text-[#00004E]"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                        )}
                      >
                        {isOpen ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {hasSubItems && isOpen && (
                    <div className="ml-4 pl-2.5 border-l-2 border-[#D89A06]/40 dark:border-[#D89A06]/30 space-y-0.5 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                      {item.subItems!.map((sub) => {
                        const SubIcon = sub.icon;
                        const subActive = isSubItemActive(sub.href);
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() =>
                              setClickedSub({ pathname: sub.href.split('#')[0].split('?')[0], href: sub.href })
                            }
                            className={cn(
                              "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors",
                              subActive
                                ? "bg-[#FEF8E7] dark:bg-[#00004E]/40 text-[#00004E] dark:text-[#D89A06] font-bold border border-[#D89A06]/40 shadow-2xs"
                                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                            )}
                          >
                            <SubIcon className={cn("w-3 h-3 shrink-0", subActive ? "text-[#D89A06]" : "opacity-75")} />
                            <span className="truncate">{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  // Bottom section: AI Credits Wallet, Profile Card, ModelSelector, Sign Out, ThemeToggle
  const renderBottom = (collapsed: boolean) => (
    <div className="mt-auto border-t border-[#D89A06]/20 dark:border-white/10 pt-3 space-y-2.5">
      {/* Academic Credits Row (Linear Standard) */}
      {collapsed ? (
        <div className="flex justify-center mb-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/dashboard/settings/billing"
                  className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-muted/60 text-[#00004E] dark:text-[#D89A06] transition-all group"
                  aria-label="Billing & Credits"
                >
                  <Coins className="w-4 h-4 text-[#D89A06] group-hover:scale-105 transition-transform" />
                </Link>
              }
            />
            <TooltipContent side="right" sideOffset={12}>
              <div className="text-xs font-bold">
                {freePasses !== null ? `${freePasses}/8 Passes + ${paidCredits ?? 0} Credits` : `${walletBalance} Credits`}
              </div>
              <div className="text-[10px] text-muted-foreground">Free passes refill every 6 hours · Manage billing</div>
            </TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <div className="px-2.5 py-1.5 flex items-center justify-between text-xs rounded-xl hover:bg-muted/40 transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <Coins className="w-3.5 h-3.5 text-[#D89A06] shrink-0" />
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-semibold text-foreground">
                {freePasses !== null ? `${freePasses}/8 passes` : `${walletBalance} credits`}
              </span>
              {paidCredits !== null && paidCredits > 0 && (
                <span className="text-[10px] text-muted-foreground font-mono">+{paidCredits}</span>
              )}
            </div>
          </div>
          <Link
            href="/dashboard/settings/billing"
            className="text-[11px] font-semibold text-[#00004E] dark:text-[#D89A06] hover:underline shrink-0"
          >
            Billing
          </Link>
        </div>
      )}

      {/* Student Profile Row (Notion / Linear Standard) */}
      {collapsed ? (
        <div className="flex justify-center mb-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/dashboard/settings/profile"
                  className="flex items-center justify-center group/avatar focus:outline-hidden rounded-full"
                  aria-label="User Profile"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-border shadow-2xs"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] font-bold text-xs flex items-center justify-center ring-1 ring-border shadow-2xs">
                      {profile?.full_name?.charAt(0) || profile?.username?.charAt(0) || 'U'}
                    </div>
                  )}
                </Link>
              }
            />
            <TooltipContent side="right" sideOffset={12}>
              <div className="text-xs font-bold">{profile?.full_name || profile?.username || 'UPSA Scholar'}</div>
              <div className="text-[10px] text-muted-foreground">
                {profile?.institutions?.name || 'University of Professional Studies, Accra'}
                {profile?.year_of_study ? ` • ${formatAcademicLevel(profile.year_of_study, profile?.degree_programme)}` : ''}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <Link
          href="/dashboard/settings/profile"
          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-muted/50 transition-colors group"
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-border"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#00004E] text-[#D89A06] dark:bg-[#D89A06] dark:text-[#00004E] shrink-0 flex items-center justify-center font-bold text-xs ring-1 ring-border">
              {profile?.full_name?.charAt(0) || profile?.username?.charAt(0) || 'U'}
            </div>
          )}
          <div className="text-xs min-w-0 flex-1">
            <div className="font-semibold text-foreground truncate group-hover:text-[#00004E] dark:group-hover:text-[#D89A06] transition-colors">
              {profile?.username || profile?.full_name?.split(' ')[0] || 'UPSA Scholar'}
            </div>
            <div className="text-muted-foreground text-[11px] truncate flex items-center gap-1">
              <span>
                {profile?.institutions?.abbreviation || 'UPSA'} · {formatAcademicLevel(profile?.year_of_study, profile?.degree_programme)}
              </span>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        </Link>
      )}

      {/* Model Selector */}
      <div className="px-0.5">
        <ModelSelector isCollapsed={collapsed} />
      </div>

      {/* Bottom Controls: Sign Out & Theme Toggle */}
      {collapsed ? (
        <div className="flex flex-col items-center gap-2 mb-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <form action={signout}>
                  <button
                    type="submit"
                    className="w-10 h-10 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-border flex items-center justify-center transition-colors focus:outline-hidden"
                    aria-label="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </form>
              }
            />
            <TooltipContent side="right" sideOffset={12}>
              Sign Out
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <div className="inline-flex">
                  <ThemeToggle />
                </div>
              }
            />
            <TooltipContent side="right" sideOffset={12}>
              Toggle Theme
            </TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-0.5">
          <div className="flex-1">
            <form action={signout}>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-semibold h-8 border-border hover:border-destructive/40 hover:text-destructive cursor-pointer"
                type="submit"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sign Out
              </Button>
            </form>
          </div>
          <div className="flex-none">
            <ThemeToggle />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider delay={100}>
      <div className="min-h-screen bg-background flex flex-col md:flex-row">
        {/* Mobile Sidebar (Drawer) */}
        <MobileSidebar profile={profile}>
          <div className="mb-3 px-1 pt-1">
            <SmartSearchBar />
          </div>
          {renderNav(false)}
          {renderBottom(false)}
        </MobileSidebar>

        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "hidden md:flex flex-col fixed inset-y-0 left-0 z-30 bg-[#FFFFFF] dark:bg-[#070720] border-r border-[#D89A06]/20 dark:border-white/10 transition-all duration-300 ease-in-out select-none shadow-xs",
            isCollapsed ? "w-20 p-3" : "w-64 p-4"
          )}
        >
          {/* Subtle Top Gold Highlight Bar */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#00004E] via-[#D89A06] to-[#00004E]" />

          {/* Header & Collapse Toggle */}
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-3 mb-4 pt-1">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Link
                      href="/dashboard"
                      className="w-10 h-10 rounded-xl flex items-center justify-center hover:opacity-90 transition-all shadow-xs border border-[#D89A06]/30 bg-card focus:outline-hidden"
                      aria-label="UniStudy Home"
                    >
                      <UniStudyLogo variant="icon" height={26} />
                    </Link>
                  }
                />
                <TooltipContent side="right" sideOffset={12}>
                  UniStudy AI
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={toggleCollapse}
                      className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-hidden shadow-2xs cursor-pointer"
                      aria-label="Expand sidebar (Ctrl+B)"
                    >
                      <PanelLeftOpen className="w-4 h-4" />
                    </button>
                  }
                />
                <TooltipContent side="right" sideOffset={12}>
                  Expand sidebar <span className="text-[10px] text-muted-foreground ml-1">(Ctrl+B)</span>
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center justify-between h-10 mb-4 px-1 pt-0.5">
              <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
                <UniStudyLogo height={32} />
              </Link>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={toggleCollapse}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors focus:outline-hidden cursor-pointer"
                      aria-label="Collapse sidebar (Ctrl+B)"
                    >
                      <PanelLeftClose className="w-4 h-4" />
                    </button>
                  }
                />
                <TooltipContent side="right" sideOffset={12}>
                  Collapse sidebar <span className="text-[10px] text-muted-foreground ml-1">(Ctrl+B)</span>
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Search Bar */}
          <div className={cn("mb-4", isCollapsed ? "flex justify-center" : "px-0.5")}>
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={expandSidebar}
                      className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all shadow-2xs cursor-pointer"
                      aria-label="Search slides, papers..."
                    >
                      <Search className="w-4 h-4" />
                    </button>
                  }
                />
                <TooltipContent side="right" sideOffset={12}>
                  Search <span className="text-[10px] text-muted-foreground ml-1">(Click to expand)</span>
                </TooltipContent>
              </Tooltip>
            ) : (
              <SmartSearchBar />
            )}
          </div>

          {/* Navigation Items */}
          {renderNav(isCollapsed)}

          {/* Bottom Profile & Actions */}
          {renderBottom(isCollapsed)}
        </aside>

        {/* Main Content Area */}
        <main
          className={cn(
            "flex-1 p-4 md:p-8 overflow-y-auto relative min-h-screen transition-all duration-300 ease-in-out",
            isCollapsed ? "md:ml-20" : "md:ml-64"
          )}
        >
          <AnnouncementBanner announcement={latestAnnouncement} />
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}
