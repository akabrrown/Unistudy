import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { videoId, title, channel, thumbnail, courseId, lectureId } = await req.json()

    if (!videoId || !title || !courseId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { error } = await supabase.from('pinned_videos').insert({
      user_id: user.id,
      course_id: courseId,
      lecture_id: lectureId || null,
      video_id: videoId,
      title,
      channel,
      thumbnail_url: thumbnail,
      watched: false
    })

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath('/dashboard/youtube');
    revalidatePath(`/dashboard/courses/${courseId}/lectures`);

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to pin video:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
