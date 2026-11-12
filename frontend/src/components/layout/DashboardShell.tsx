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
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
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
  Share2,
  Plus,
  Archive,
  Upload,
  Clock,
  Pin,
  Flame,
  TrendingUp,
  AlertTriangle,
  Cpu,
  Compass,
  CheckCircle2,
  Layers,
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
  subItems?: SubNavItem[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        subItems: [
          { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
          { label: 'Smart Search', href: '/dashboard/search', icon: Search },
          { label: 'Shared Materials', href: '/dashboard/shared', icon: Share2 },
          { label: 'Math & Graph Toolkit', href: '/dashboard/calculator', icon: Calculator },
        ],
      },
      {
        label: 'Courses',
        href: '/dashboard/courses',
        icon: BookOpen,
        subItems: [
          { label: 'Active Courses', href: '/dashboard/courses', icon: BookOpen },
          { label: 'New Course', href: '/dashboard/courses?action=new', icon: Plus },
          { label: 'Archived Courses', href: '/dashboard/courses#archived', icon: Archive },
        ],
      },
      {
        label: 'Past Papers',
        href: '/dashboard/past-papers',
        icon: Award,
        subItems: [
          { label: 'All Papers', href: '/dashboard/past-papers#all-papers', icon: FileText },
          { label: 'By Course', href: '/dashboard/past-papers#by-course', icon: Layers },
          { label: 'Upload Paper', href: '/dashboard/past-papers?action=upload', icon: Upload },
        ],
      },
      {
        label: 'Study Calendar',
        href: '/dashboard/calendar',
        icon: CalendarDays,
        subItems: [
          { label: 'Month View', href: '/dashboard/calendar?view=calendar', icon: CalendarDays },
          { label: 'Weekly Timetable', href: '/dashboard/calendar?view=timetable', icon: Clock },
          { label: 'Schedule Session', href: '/dashboard/calendar?action=add', icon: Plus },
        ],
      },
      {
        label: 'Notes Scanner',
        href: '/dashboard/scanner',
        icon: Camera,
        subItems: [
          { label: 'Handwriting OCR', href: '/dashboard/scanner', icon: Camera },
          { label: 'Graph Question OCR', href: '/dashboard/calculator?tab=graph', icon: Compass },
          { label: 'Math Image Solver', href: '/dashboard/calculator?tab=solver', icon: Calculator },
        ],
      },
      {
        label: 'Essay Grader',
        href: '/dashboard/essay-grader',
        icon: FileText,
        subItems: [
          { label: 'Grade Draft', href: '/dashboard/essay-grader#editor', icon: FileText },
          { label: 'Rubric Breakdown', href: '/dashboard/essay-grader#rubric', icon: CheckCircle2 },
          { label: '100/100 Model Essay', href: '/dashboard/essay-grader#model-essay', icon: Award },
        ],
      },
      {
        label: 'Analytics & Insights',
        href: '/dashboard/analytics',
        icon: LineChart,
        subItems: [
          { label: 'Study Heatmap', href: '/dashboard/analytics#heatmap', icon: Flame },
          { label: 'Learning Velocity', href: '/dashboard/analytics#velocity', icon: TrendingUp },
          { label: 'Peak Study Hours', href: '/dashboard/analytics#peak-hours', icon: Clock },
          { label: 'Blind Spots', href: '/dashboard/analytics#blind-spots', icon: AlertTriangle },
          { label: 'Provider Allowances', href: '/dashboard/analytics#allowances', icon: Cpu },
        ],
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
          { label: 'Search Lectures', href: '/dashboard/youtube#discover', icon: Search },
          { label: 'Pinned Library', href: '/dashboard/youtube#pinned', icon: Pin },
        ],
      },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Profile', href: '/dashboard/settings/profile', icon: UserIcon },
      { label: 'Accessibility', href: '/dashboard/settings/accessibility', icon: Accessibility },
      { label: 'Billing', href: '/dashboard/settings/billing', icon: CreditCard },
    ],
  },
];

interface DashboardProfile {
  role?: string | null;
  avatar_url?: string | null;
  full_name?: string | null;
  username?: string | null;
  institutions?: {
    name?: string | null;
    abbreviation?: string | null;
  } | null;
}

interface DashboardShellProps {
  profile: DashboardProfile | null;
  latestAnnouncement: { id: string; title: string; body: string } | null;
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

export function DashboardShell({ profile, latestAnnouncement, children }: DashboardShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
    if (pathname !== basePath && !pathname.startsWith(basePath + '/')) return false;
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
    <nav className="space-y-4 flex-1 overflow-y-auto overflow-x-hidden pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {NAV_SECTIONS.map((section, sectionIdx) => (
        <div key={section.title} className={cn(sectionIdx > 0 && "pt-2")}>
          {!collapsed ? (
            <p className="px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 select-none">
              {section.title}
            </p>
          ) : (
            sectionIdx > 0 && <div className="border-t border-border/60 my-2 mx-1" />
          )}

          <div className="space-y-1">
            {section.items.map((item) => {
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
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                            aria-label={item.label}
                          >
                            <Icon className={cn("w-5 h-5", item.color)} />
                          </Link>
                        }
                      />
                      <TooltipContent side="right" sideOffset={12}>
                        <div className="font-medium">{item.label}</div>
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
                      "flex items-center rounded-xl transition-all duration-200 group",
                      active
                        ? "bg-primary/10 text-primary font-semibold shadow-xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
                      className="flex-1 flex items-center min-w-0 px-3.5 py-2.5 text-sm font-medium"
                    >
                      <Icon
                        className={cn(
                          "w-4 h-4 mr-3 transition-colors shrink-0",
                          item.color ? item.color : active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>

                    {hasSubItems && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(item)}
                        aria-expanded={isOpen}
                        aria-label={`Toggle ${item.label} submenu`}
                        className={cn(
                          "p-2 mr-1 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40",
                          active
                            ? "text-primary hover:bg-primary/15"
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
                    <div className="ml-5 pl-3 border-l border-border/70 space-y-0.5 py-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                      {item.subItems!.map((sub) => {
                        const SubIcon = sub.icon;
                        const subActive = isSubItemActive(sub.href);
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setClickedSub({ pathname: sub.href.split('#')[0].split('?')[0], href: sub.href })}
                            className={cn(
                              "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                              subActive
                                ? "bg-primary/10 text-primary font-semibold"
                                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                            )}
                          >
                            <SubIcon className={cn("w-3.5 h-3.5 shrink-0", subActive ? "text-primary" : "opacity-75")} />
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

      {/* Admin Panel Link */}
      {profile?.role === 'admin' && (
        <div className={cn("pt-2", collapsed ? "flex justify-center" : "")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/admin"
                    className="flex items-center justify-center w-10 h-10 border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-xl transition-all"
                    aria-label="Admin Panel"
                  >
                    <Shield className="w-4 h-4" />
                  </Link>
                }
              />
              <TooltipContent side="right" sideOffset={12}>
                Admin Panel
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/admin"
              className="flex items-center justify-center px-4 py-2.5 border border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-xl transition-colors font-medium text-sm text-center"
            >
              <Shield className="w-4 h-4 mr-2 shrink-0" />
              <span>Admin Panel</span>
            </Link>
          )}
        </div>
      )}
    </nav>
  );

  // Bottom section: Profile, ModelSelector, Sign Out, ThemeToggle
  const renderBottom = (collapsed: boolean) => (
    <div className="mt-auto border-t border-border pt-3">
      {/* User profile */}
      {collapsed ? (
        <div className="flex justify-center mb-3">
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/dashboard/settings/profile"
                  className="flex items-center justify-center group/avatar focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-full"
                  aria-label="User Profile"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-transparent group-hover/avatar:ring-primary/40 transition-all"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold ring-2 ring-transparent group-hover/avatar:ring-primary/40 transition-all">
                      {profile?.full_name?.charAt(0) || profile?.username?.charAt(0) || 'U'}
                    </div>
                  )}
                </Link>
              }
            />
            <TooltipContent side="right" sideOffset={12}>
              <div className="text-xs font-semibold">{profile?.full_name || profile?.username || 'Student'}</div>
              {profile?.institutions?.name && (
                <div className="text-[10px] text-muted-foreground">{profile.institutions.name}</div>
              )}
            </TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-3 px-2">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-10 h-10 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/20 shrink-0 flex items-center justify-center text-primary font-bold">
              {profile?.full_name?.charAt(0) || profile?.username?.charAt(0) || 'U'}
            </div>
          )}
          <div className="text-sm min-w-0 flex-1">
            <div className="font-medium text-foreground truncate">
              {profile?.username || profile?.full_name?.split(' ')[0] || 'Student'}
            </div>
            <div className="text-muted-foreground text-xs truncate">
              {profile?.institutions?.abbreviation || profile?.institutions?.name || (
                <Link href="/dashboard/settings/profile" className="text-primary hover:underline">
                  Setup needed
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Model Selector */}
      <ModelSelector isCollapsed={collapsed} />

      {/* Bottom controls */}
      {collapsed ? (
        <div className="flex flex-col items-center gap-2 mb-2">
          <Tooltip>
            <TooltipTrigger
              render={
                <form action={signout}>
                  <button
                    type="submit"
                    className="w-10 h-10 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-border flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-destructive/40"
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
        <div className="flex items-center gap-2 mb-2 md:mb-4 px-1">
          <div className="flex-1">
            <form action={signout}>
              <Button variant="outline" className="w-full text-sm font-medium" type="submit">
                <LogOut className="w-4 h-4 mr-2" />
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
        {/* Mobile Sidebar (always full layout inside sheet drawer) */}
        <MobileSidebar>
          <div className="mb-4 px-2 pt-2 md:pt-0">
            <SmartSearchBar />
          </div>
          {renderNav(false)}
          {renderBottom(false)}
        </MobileSidebar>

        {/* Desktop Collapsible/Expandable Sidebar */}
        <aside
          className={cn(
            "hidden md:flex flex-col fixed inset-y-0 left-0 z-30 bg-card border-r border-border transition-all duration-300 ease-in-out select-none",
            isCollapsed ? "w-20 p-3" : "w-64 p-4"
          )}
        >
          {/* Header & Collapse Toggle */}
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-3 mb-5">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Link
                      href="/dashboard"
                      className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg hover:bg-primary/20 transition-colors shadow-xs"
                      aria-label="UniStudy Home"
                    >
                      U
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
                      className="w-10 h-10 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs"
                      aria-label="Expand sidebar (Ctrl+B)"
                    >
                      <PanelLeftOpen className="w-5 h-5" />
                    </button>
                  }
                />
                <TooltipContent side="right" sideOffset={12}>
                  Expand sidebar <span className="text-[10px] text-muted-foreground ml-1">(Ctrl+B)</span>
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center justify-between h-11 mb-5 px-1">
              <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
                <img src="/logo.jpeg" alt="UniStudy AI" className="h-9 w-auto object-contain dark:hidden" />
                <img src="/logo-dark.jpeg" alt="UniStudy AI" className="h-9 w-auto object-contain hidden dark:block" />
              </Link>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={toggleCollapse}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
                      aria-label="Collapse sidebar (Ctrl+B)"
                    >
                      <PanelLeftClose className="w-5 h-5" />
                    </button>
                  }
                />
                <TooltipContent side="right" sideOffset={12}>
                  Collapse sidebar <span className="text-[10px] text-muted-foreground ml-1">(Ctrl+B)</span>
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Search bar */}
          <div className={cn("mb-5", isCollapsed ? "flex justify-center" : "px-1")}>
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={expandSidebar}
                      className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all shadow-xs"
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

          {/* Bottom section */}
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
