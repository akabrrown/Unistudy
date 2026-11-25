'use client';

import { useParams } from 'next/navigation';
import { InteractiveDrillRunner } from '@/components/drills/InteractiveDrillRunner';

export default function CourseWeaknessDrillPage() {
  const params = useParams<{ courseId: string; drillId: string }>();
  return (
    <InteractiveDrillRunner
      drillId={params?.drillId || ''}
      fallbackCourseId={params?.courseId || undefined}
    />
  );
}
