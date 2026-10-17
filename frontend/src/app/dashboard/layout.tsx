import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, institutions(abbreviation, name)')
    .eq('id', user.id)
    .single()

  // Fetch the single most recent announcement
  const { data: latestAnnouncement } = await supabase
    .from('announcements')
    .select('id, title, body')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <DashboardShell profile={profile} latestAnnouncement={latestAnnouncement}>
      {children}
    </DashboardShell>
  )
}

