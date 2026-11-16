import { redirect } from 'next/navigation';

export default async function CourseDetailPage(props: { params: Promise<{ courseId: string }> }) {
  const params = await props.params;
  redirect(`/dashboard/lectures?courseId=${params.courseId}`);
}
