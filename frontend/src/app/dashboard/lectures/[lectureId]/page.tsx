'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api/client';
import { Skeleton } from '@/components/ui/skeleton';

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
        const courseId =
          lecture?.course_id ||
          (Array.isArray(lecture?.courses)
            ? lecture.courses[0]?.id
            : (lecture?.courses as any)?.id);

        if (courseId) {
          const query = slide ? `?slide=${encodeURIComponent(slide)}` : '';
          router.replace(`/dashboard/courses/${courseId}/lectures/${lectureId}${query}`);
        } else {
          router.replace('/dashboard/courses');
        }
      } catch {
        router.replace('/dashboard/courses');
      }
    }

    void resolveAndRedirect();
  }, [lectureId, slide, router]);

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] rounded-xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="h-14 border-b border-border px-5 flex items-center justify-between">
        <Skeleton className="h-6 w-56 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-5">
        <div className="lg:col-span-8 flex flex-col justify-between gap-4">
          <Skeleton className="w-full aspect-video rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
        <div className="lg:col-span-4 space-y-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
