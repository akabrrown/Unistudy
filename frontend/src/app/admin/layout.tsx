import { requireAdmin } from '@/lib/security/adminGuard'
import Link from 'next/link'
import {
  LogOut,
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
  LifeBuoy
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UniStudyLogo } from '@/components/brand/UniStudyLogo'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin()

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex shrink-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2.5">
            <UniStudyLogo variant="icon" height={34} className="shrink-0" alt="UniStudy Crest" />
            <div>
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                UniStudy <span className="text-[#D89A06]">Admin</span>
              </h2>
              <p className="text-[11px] text-muted-foreground font-medium">Production CMS &amp; Control</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
          <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            Analytics &amp; Users
          </div>
          <Link href="/admin" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-muted transition-colors font-medium text-xs text-muted-foreground hover:text-foreground">
            <LayoutDashboard className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
            Overview
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-muted transition-colors font-medium text-xs text-muted-foreground hover:text-foreground">
            <Users className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
            User Management
          </Link>
          <Link href="/admin/subscriptions" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-muted transition-colors font-medium text-xs text-muted-foreground hover:text-foreground">
            <CreditCard className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
            Subscriptions &amp; MoMo
          </Link>

          <div className="pt-3 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            Content &amp; Academics
          </div>
          <Link href="/admin/cms" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-muted transition-colors font-medium text-xs text-muted-foreground hover:text-foreground">
            <Globe className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
            Public Site CMS
          </Link>
          <Link href="/admin/courses" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-muted transition-colors font-medium text-xs text-muted-foreground hover:text-foreground">
            <BookOpen className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
            Course Directory &amp; Merge
          </Link>
          <Link href="/admin/content" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-muted transition-colors font-medium text-xs text-muted-foreground hover:text-foreground">
            <ShieldAlert className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
            Content Moderation
          </Link>
          <Link href="/admin/institution-counts" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-muted transition-colors font-medium text-xs text-muted-foreground hover:text-foreground">
            <Building className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
            UPSA Faculties
          </Link>

          <div className="pt-3 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            System &amp; Infrastructure
          </div>
          <Link href="/admin/support" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-muted transition-colors font-medium text-xs text-muted-foreground hover:text-foreground">
            <LifeBuoy className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
            Support Desk
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-muted transition-colors font-medium text-xs text-muted-foreground hover:text-foreground">
            <Settings className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
            Platform Settings
          </Link>
          <Link href="/admin/ai-infrastructure" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-muted transition-colors font-medium text-xs text-muted-foreground hover:text-foreground">
            <Cpu className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
            AI Infrastructure
          </Link>
          <Link href="/admin/announcements" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-muted transition-colors font-medium text-xs text-muted-foreground hover:text-foreground">
            <Mail className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
            Announcements
          </Link>
          <Link href="/admin/referrals" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-muted transition-colors font-medium text-xs text-muted-foreground hover:text-foreground">
            <UserPlus className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
            Referrals
          </Link>
          <Link href="/admin/audit" className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-muted transition-colors font-medium text-xs text-muted-foreground hover:text-foreground">
            <Activity className="w-4 h-4 text-[#00004E] dark:text-[#D89A06]" />
            Audit Logs
          </Link>
        </nav>

        <div className="p-4 border-t border-border">
          <form action={async () => {
            'use server'
            const supabase = await createClient()
            await supabase.auth.signOut()
            redirect('/')
          }}>
            <button className="flex w-full items-center gap-3 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors cursor-pointer">
              <LogOut className="w-4 h-4" />
              Sign Out Admin
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-16 border-b border-border bg-card/60 backdrop-blur-md flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live System Active
            </span>
            <div className="text-xs text-muted-foreground hidden sm:block">
              Signed in: <strong className="text-foreground">{user.email}</strong>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
            >
              Open Student App →
            </Link>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
