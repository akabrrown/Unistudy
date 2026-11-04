'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import { Loader2 } from 'lucide-react';

export default function LectureRedirectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const lectureId = params.lectureId as string;
  const slide = searchParams.get('slide');

  useEffect(() => {
    async function resolveAndRedirect() {
      if (!lectureId) {
        router.replace('/dashboard/courses');
        return;
      }

      try {
        const lecture = await apiFetch(`/lectures/detail/${lectureId}`);
        const courseId = lecture?.course_id || (Array.isArray(lecture?.courses) ? lecture.courses[0]?.id : (lecture?.courses as any)?.id);

        if (courseId) {
          const query = slide ? `?slide=${slide}` : '';
          router.replace(`/dashboard/courses/${courseId}/lectures/${lectureId}${query}`);
        } else {
          router.replace('/dashboard/courses');
        }
      } catch (err) {
        router.replace('/dashboard/courses');
      }
    }

    resolveAndRedirect();
  }, [lectureId, slide, router]);

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col items-center justify-center gap-3 bg-background border border-border rounded-xl">
      <Loader2 className="animate-spin w-8 h-8 text-primary" />
      <p className="text-sm text-muted-foreground">Opening slides...</p>
    </div>
  );
}

