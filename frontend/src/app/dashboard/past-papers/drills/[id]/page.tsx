'use client';

import { useParams } from 'next/navigation';
import { InteractiveDrillRunner } from '@/components/drills/InteractiveDrillRunner';

export default function StandaloneWeaknessDrillPage() {
  const params = useParams<{ id: string }>();
  return <InteractiveDrillRunner drillId={params?.id || ''} />;
}
