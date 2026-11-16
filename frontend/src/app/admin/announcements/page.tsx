import { createClient } from '@/lib/supabase/server'
import { AnnouncementsClient, AnnouncementItem, AnnouncementStats, InstitutionOption } from './AnnouncementsClient'

export const metadata = {
  title: 'Communications & Broadcasts | UniStudy Admin',
  description: 'Manage platform announcements, campus bulletins, and student notifications'
}

export default async function AdminAnnouncementsPage() {
  const supabase = await createClient()

  // Parallel server-side data fetching
  const [announcementsRes, profilesCountRes, paidProfilesCountRes, institutionsRes] = await Promise.all([
    supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('subscription_tier', ['pro', 'ultra']),
    supabase
      .from('institutions')
      .select('id, name, abbreviation, student_count')
      .order('student_count', { ascending: false })
      .limit(30)
  ])

  const announcements: AnnouncementItem[] = announcementsRes.data || []
  const totalStudents = profilesCountRes.count || 0
  const paidStudents = paidProfilesCountRes.count || 0
  const freeStudents = Math.max(0, totalStudents - paidStudents)

  const bannerCount = announcements.filter(a => a.type === 'banner' || !a.type).length
  const criticalCount = announcements.filter(a => a.type === 'critical').length
  const emailCount = announcements.filter(a => a.type === 'email').length
  const modalCount = announcements.filter(a => a.type === 'modal').length

  const initialStats: AnnouncementStats = {
    totalBroadcasts: announcements.length,
    activeBanners: bannerCount + criticalCount,
    totalStudents,
    paidStudents,
    freeStudents,
    emailCount,
    criticalCount,
    modalCount
  }

  const initialInstitutions: InstitutionOption[] = institutionsRes.data || []

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto pb-12">
      <AnnouncementsClient
        initialAnnouncements={announcements}
        initialStats={initialStats}
        initialInstitutions={initialInstitutions}
      />
    </div>
  )
}
