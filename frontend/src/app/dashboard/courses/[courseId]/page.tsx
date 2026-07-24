import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FileText, ArrowRight } from 'lucide-react';
import { DeleteLectureButton } from '@/components/courses/DeleteLectureButton';
import { UploadLectureDialog } from '@/components/courses/UploadLectureDialog';
import { DownloadCourseButton } from '@/components/courses/DownloadCourseButton';
import { LectureList } from '@/components/courses/LectureList';

export default async function CourseDetailPage(props: { params: Promise<{ courseId: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return notFound();

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const res = await fetch(`${BACKEND_URL}/api/courses/${params.courseId}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store'
  });

  if (!res.ok) {
    return notFound();
  }
  
  const course = await res.json();

  return (
    <div className="max-w-4xl mx-auto py-8">
      <Card className="shadow-sm border-border">
        <CardHeader>
          <CardTitle className="text-2xl" style={{ color: course.colour }}>
            {course.course_code} – {course.title}
          </CardTitle>
          <CardDescription>{`Created ${new Date(course.created_at).toLocaleDateString()}`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Lectures & Materials</h2>
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/courses/${course.id}/past-papers`}>
                <Button variant="outline" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Past Papers & Drills
                </Button>
              </Link>
              <DownloadCourseButton courseId={course.id} />
              <UploadLectureDialog courseId={course.id} courseCode={course.course_code} />
            </div>
          </div>
          
          <LectureList courseId={course.id} lectures={course.lectures || []} />
        </CardContent>
      </Card>
    </div>
  );
}
