import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PinnedLibraryClient } from './PinnedLibraryClient';

export default async function YouTubePinnedLibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: courses }, { data: pinnedVideos }] = await Promise.all([
    supabase
      .from('courses')
      .select('id, title, course_code')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('pinned_videos')
      .select('*')
      .eq('user_id', user.id)
      .order('pinned_at', { ascending: false }),
  ]);

  return (
    <PinnedLibraryClient
      courses={courses || []}
      initialPinnedVideos={pinnedVideos || []}
    />
  );
}

