'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function PastPaperAttemptRedirectPage() {
  const params = useParams<{ courseId?: string; paperId?: string }>();
  const router = useRouter();

  useEffect(() => {
    if (params?.paperId) {
      const query = params?.courseId ? `?courseId=${encodeURIComponent(params.courseId)}` : '';
      router.replace(`/dashboard/past-papers/${encodeURIComponent(params.paperId)}${query}`);
    }
  }, [params?.courseId, params?.paperId, router]);

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-5">
      <Skeleton className="h-8 w-56 rounded-lg" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-80 w-full rounded-2xl" />
    </div>
  );
}
