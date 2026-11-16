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

  // Fetch the single most recent announcement targeted to all or matching student's tier/faculty/level
  const userTier = profile?.subscription_tier === 'pro' || profile?.subscription_tier === 'ultra' ? 'tier:pro' : 'tier:free'
  const userFaculty = profile?.faculty ? `faculty:${profile.faculty}` : null
  const userLevel = profile?.year_of_study ? `level:${profile.year_of_study}` : null
  const allowedTargets = ['all', userTier]
  if (userFaculty) allowedTargets.push(userFaculty)
  if (userLevel) allowedTargets.push(userLevel)

  const { data: latestAnnouncement } = await supabase
    .from('announcements')
    .select('id, title, body')
    .in('target', allowedTargets)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <DashboardShell profile={profile} latestAnnouncement={latestAnnouncement}>
      {children}
    </DashboardShell>
  )
}

