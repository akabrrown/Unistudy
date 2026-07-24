import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { YouTubeStudyClient } from './YouTubeStudyClient'

export default async function YouTubeStudyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's courses
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, course_code')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // Fetch user's pinned videos
  const { data: pinnedVideos } = await supabase
    .from('pinned_videos')
    .select('*')
    .eq('user_id', user.id)
    .order('pinned_at', { ascending: false })

  return (
    <YouTubeStudyClient 
      courses={courses || []} 
      initialPinnedVideos={pinnedVideos || []} 
    />
  )
}
