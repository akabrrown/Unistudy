import { requireAdmin } from '@/lib/security/adminGuard'
import Link from 'next/link'
import { LogOut, Users, LayoutDashboard, Settings, Activity, ShieldAlert, Cpu, Mail, UserPlus, Key, Database, BarChart2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin()

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">
            UniAdmin
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Platform Control</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors font-medium text-sm text-muted-foreground hover:text-foreground">
            <LayoutDashboard className="w-5 h-5" />
            Overview
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors font-medium text-sm text-muted-foreground hover:text-foreground">
            <Users className="w-5 h-5" />
            User Management
          </Link>
          <Link href="/admin/content" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors font-medium text-sm text-muted-foreground hover:text-foreground">
            <ShieldAlert className="w-5 h-5" />
            Content Moderation
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors font-medium text-sm text-muted-foreground hover:text-foreground">
            <Settings className="w-5 h-5" />
            Platform Settings
          </Link>
          <Link href="/admin/institution-counts" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors font-medium text-sm text-muted-foreground hover:text-foreground">
            <BarChart2 className="w-5 h-5" />
            Institution Counts
          </Link>
          <Link href="/admin/ai-infrastructure" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors font-medium text-sm text-muted-foreground hover:text-foreground">
            <Cpu className="w-5 h-5" />
            AI Infrastructure
          </Link>
          <Link href="/admin/referrals" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors font-medium text-sm text-muted-foreground hover:text-foreground">
            <UserPlus className="w-5 h-5" />
            Referral Tracker
          </Link>
          <Link href="/admin/announcements" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted transition-colors font-medium text-sm text-muted-foreground hover:text-foreground">
            <Mail className="w-5 h-5" />
            Announcements
          </Link>

        </nav>

        <div className="p-4 border-t border-border">
          <form action={async () => {
            'use server'
            const supabase = await createClient()
            await supabase.auth.signOut()
            redirect('/')
          }}>
            <button className="flex w-full items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors">
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card/50 flex items-center justify-between px-8">
          <div className="font-semibold text-sm">Logged in as {user.email} (Admin)</div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <span className="text-xs hover:underline text-muted-foreground cursor-pointer">Return to Student App</span>
            </Link>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
