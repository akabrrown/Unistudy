import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      videoId?: string;
      title?: string;
      channel?: string;
      thumbnail?: string;
      courseId?: string;
      lectureId?: string | null;
    };
    const { videoId, title, channel, thumbnail, courseId, lectureId } = body;

    if (!videoId || !title || !courseId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify course ownership (IDOR defense)
    const { data: ownedCourse } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!ownedCourse) {
      return NextResponse.json({ error: 'Invalid course selection' }, { status: 403 });
    }

    // Prevent duplicate pins of the same video to the same course
    const { data: existingPin } = await supabase
      .from('pinned_videos')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('video_id', videoId)
      .maybeSingle();

    if (existingPin) {
      return NextResponse.json({
        success: true,
        alreadyPinned: true,
        video: existingPin,
      });
    }

    const { data: inserted, error } = await supabase
      .from('pinned_videos')
      .insert({
        user_id: user.id,
        course_id: courseId,
        lecture_id: lectureId || null,
        video_id: videoId,
        title,
        channel: channel || 'Academic Lecture',
        thumbnail_url:
          thumbnail || `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`,
        watched: false,
      })
      .select('*')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath('/dashboard/youtube');
    revalidatePath('/dashboard/youtube/pinned');
    revalidatePath(`/dashboard/courses/${courseId}/lectures`);

    return NextResponse.json({ success: true, video: inserted });
  } catch (error: unknown) {
    console.error('Failed to pin video:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      id?: string;
      videoId?: string;
      watched?: boolean;
      courseId?: string;
    };

    if (typeof body.watched !== 'boolean' && !body.courseId) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (typeof body.watched === 'boolean') {
      updates.watched = body.watched;
    }
    if (body.courseId) {
      const { data: ownedCourse } = await supabase
        .from('courses')
        .select('id')
        .eq('id', body.courseId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!ownedCourse) {
        return NextResponse.json({ error: 'Invalid course selection' }, { status: 403 });
      }
      updates.course_id = body.courseId;
    }

    let query = supabase.from('pinned_videos').update(updates).eq('user_id', user.id);
    if (body.id) {
      query = query.eq('id', body.id);
    } else if (body.videoId) {
      query = query.eq('video_id', body.videoId);
    } else {
      return NextResponse.json({ error: 'Video identifier required' }, { status: 400 });
    }

    const { data: updated, error } = await query.select('*');
    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath('/dashboard/youtube');
    revalidatePath('/dashboard/youtube/pinned');

    return NextResponse.json({ success: true, videos: updated || [] });
  } catch (error: unknown) {
    console.error('Failed to update pinned video:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');
    if (!id) {
      const body = (await req.json().catch(() => ({}))) as { id?: string };
      id = body.id || null;
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing pinned video id' }, { status: 400 });
    }

    const { error } = await supabase
      .from('pinned_videos')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath('/dashboard/youtube');
    revalidatePath('/dashboard/youtube/pinned');

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Failed to delete pinned video:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
