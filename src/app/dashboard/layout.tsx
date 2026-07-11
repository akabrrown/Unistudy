import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signout } from '../(auth)/actions'
import { Button } from '@/components/ui/button'
import { XPBar } from '@/components/study/XPBar'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { 
  LayoutDashboard, 
  BookOpen, 
  CalendarDays, 
  Timer, 
  Users, 
  Trophy, 
  Calculator, 
  Camera, 
  FileText, 
  LineChart,
  Accessibility,
  CreditCard,
  Shield
} from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-r border-border p-4 flex flex-col">
        <div className="font-bold text-2xl text-primary mb-8 tracking-tight">UniStudy AI</div>
        <nav className="space-y-1 flex-1">
          <Link href="/dashboard" className="flex items-center px-4 py-2.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors">
            <LayoutDashboard className="w-4 h-4 mr-3" /> Dashboard
          </Link>
          <Link href="/dashboard/courses" className="flex items-center px-4 py-2.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors">
            <BookOpen className="w-4 h-4 mr-3" /> Courses
          </Link>
          <Link href="/dashboard/calendar" className="flex items-center px-4 py-2.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors text-purple-500 font-medium">
            <CalendarDays className="w-4 h-4 mr-3" /> Study Calendar
          </Link>
          <Link href="/dashboard/focus" className="flex items-center px-4 py-2.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors text-purple-500 font-medium">
            <Timer className="w-4 h-4 mr-3" /> Focus Timer
          </Link>
          <Link href="/dashboard/groups" className="flex items-center px-4 py-2.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors text-sky-500 font-medium">
            <Users className="w-4 h-4 mr-3" /> Study Groups
          </Link>
          <Link href="/dashboard/leaderboard" className="flex items-center px-4 py-2.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors text-yellow-500 font-medium">
            <Trophy className="w-4 h-4 mr-3" /> Leaderboard
          </Link>
          <Link href="/dashboard/calculator" className="flex items-center px-4 py-2.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors">
            <Calculator className="w-4 h-4 mr-3" /> AI Calculator
          </Link>
          <Link href="/dashboard/scanner" className="flex items-center px-4 py-2.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors font-medium text-amber-500">
            <Camera className="w-4 h-4 mr-3" /> Notes Scanner
          </Link>
          <Link href="/dashboard/essay-grader" className="flex items-center px-4 py-2.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors font-medium text-amber-500">
            <FileText className="w-4 h-4 mr-3" /> Essay Grader
          </Link>
          <Link href="/dashboard/analytics" className="flex items-center px-4 py-2.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors text-primary font-medium">
            <LineChart className="w-4 h-4 mr-3" /> Analytics & Insights
          </Link>
          
          <div className="pt-4 border-t border-border mt-4 space-y-1">
            <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Settings</p>
            <Link href="/dashboard/settings/accessibility" className="flex items-center px-4 py-2.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors">
              <Accessibility className="w-4 h-4 mr-3" /> Accessibility
            </Link>
            <Link href="/dashboard/settings/billing" className="flex items-center px-4 py-2.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors">
              <CreditCard className="w-4 h-4 mr-3" /> Billing & Pro
            </Link>
          </div>

          {profile?.role === 'admin' && (
            <Link href="/admin" className="flex items-center justify-center px-4 py-2.5 mt-4 border border-destructive/50 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-md transition-colors font-medium text-center">
              <Shield className="w-4 h-4 mr-2" /> Admin Panel
            </Link>
          )}
        </nav>
        <div className="mt-auto border-t border-border pt-4">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="text-sm">
              <div className="font-medium text-foreground">{profile?.full_name || 'Student'}</div>
              <div className="text-muted-foreground text-xs">{profile?.university || 'Setup needed'}</div>
            </div>
          </div>
          
          <div className="px-2 mb-4">
            <XPBar xp={profile?.total_xp || 0} />
          </div>

          <div className="flex items-center gap-2 mb-6 px-2">
            <div className="flex-1">
              <form action={signout}>
                <Button variant="outline" className="w-full" type="submit">Sign Out</Button>
              </form>
            </div>
            <div className="flex-none">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
