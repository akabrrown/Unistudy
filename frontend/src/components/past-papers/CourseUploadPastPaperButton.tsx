'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { UploadModal } from '@/components/past-papers/UploadModal';
import { useRouter } from 'next/navigation';

export function CourseUploadPastPaperButton({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Upload className="w-4 h-4" />
        Upload Past Paper
      </Button>
      <UploadModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSuccess={() => {
          setOpen(false);
          router.refresh();
        }}
        preselectedCourseId={courseId}
      />
    </>
  );
}
