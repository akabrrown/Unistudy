import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Upload, FileText, ArrowRight, TrendingUp, AlertTriangle, DownloadCloud } from 'lucide-react';
import Link from 'next/link';

import { CourseUploadPastPaperButton } from '@/components/past-papers/CourseUploadPastPaperButton';
import { DeletePastPaperButton } from '@/components/past-papers/DeletePastPaperButton';

export default async function PastPapersPage(props: { params: Promise<{ courseId: string }> }) {
  const params = await props.params;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return notFound();

  // Fetch course details to retrieve course_code for auto-linking
  const { data: course } = await supabase
    .from('courses')
    .select('id, course_code, title')
    .eq('id', params.courseId)
    .maybeSingle();

  const normalizedCode = course?.course_code
    ? course.course_code.toUpperCase().replace(/[^A-Z0-9]/g, '')
    : null;

  // Fetch real past papers (linked to this course directly OR matching its course code across the university)
  let papersQuery = supabase.from('past_papers').select('*');

  if (normalizedCode) {
    papersQuery = papersQuery.or(
      `course_id.eq.${params.courseId},normalized_course_code.eq.${normalizedCode}`
    );
  } else {
    papersQuery = papersQuery.eq('course_id', params.courseId);
  }

  const { data: pastPapers } = await papersQuery.order('year', { ascending: false });

  // Fetch official KLOK past papers matching this course
  let klokPapers: any[] = [];
  try {
    const KLOK_BASE_URL = process.env.KLOK_BASE_URL || 'https://kloksearch.vercel.app';
    const KLOK_API_KEY = process.env.KLOK_API_KEY || 'klok_live_ddbeef2ccb5ed98dd45873c1d35060c4';
    const queryTerm = course?.course_code ? course.course_code.trim() : (course?.title || '');
    if (queryTerm) {
      const klokRes = await fetch(`${KLOK_BASE_URL}/api/v1/past-questions?q=${encodeURIComponent(queryTerm)}`, {
        headers: { 'x-klok-api-key': KLOK_API_KEY },
        next: { revalidate: 300 }
      });
      if (klokRes.ok) {
        const kData = await klokRes.json();
        const items = kData.items || (Array.isArray(kData) ? kData : []);
        klokPapers = items.map((item: any) => ({
          id: item.id,
          course_id: params.courseId,
          course_code: course?.course_code || 'EXAM',
          title: item.name ? item.name.replace(/\.pdf$/i, '') : 'Past Examination Paper',
          year: item.year || new Date().getFullYear(),
          exam_type: 'end-semester',
          created_at: new Date(item.timemodified ? item.timemodified * 1000 : Date.now()).toISOString(),
          isKlok: true,
          download_url: `/api/v1/past-questions/download?id=${encodeURIComponent(item.id)}`
        }));
      }
    }
  } catch (err: any) {
    console.warn('[PastPapersPage] KLOK fetch error:', err.message);
  }

  // Fetch real weakness drills
  const { data: drills } = await supabase
    .from('weakness_drills')
    .select('*')
    .eq('course_id', params.courseId)
    .eq('mastered', false)
    .order('updated_at', { ascending: false });

  const papers = [...(pastPapers || []), ...klokPapers];
  const activeDrills = drills || [];

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Past Papers & Drills</h1>
          <p className="text-muted-foreground mt-1">Upload exams, get AI grading, and track your weak areas.</p>
        </div>
        <CourseUploadPastPaperButton courseId={params.courseId} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Papers List */}
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Available Papers
          </h2>
          {papers.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-xl bg-muted/20">
              <p className="text-muted-foreground">No past papers uploaded yet.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {papers.map(paper => (
                <div key={paper.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm hover:border-primary/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base">{paper.title || `${paper.year} ${paper.exam_type === 'end-semester' ? 'Final Exam' : 'Midterm'}`}</h3>
                      {paper.course_id !== params.courseId && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          University Bank
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{paper.course_code ? `${paper.course_code} · ` : ''}Uploaded {new Date(paper.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {paper.user_id === session.user.id && (
                      <DeletePastPaperButton paperId={paper.id} paperTitle={paper.title || `${paper.year} Exam`} />
                    )}
                    {paper.download_url && (
                      <a
                        href={paper.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                      >
                        <Button variant="secondary" size="sm" className="gap-1.5 cursor-pointer">
                          <DownloadCloud className="w-3.5 h-3.5 text-primary" />
                          PDF
                        </Button>
                      </a>
                    )}
                    <Link href={paper.isKlok ? (paper.download_url || `/api/v1/past-questions/download?id=${encodeURIComponent(paper.id)}`) : `/dashboard/past-papers/${paper.id}`}>
                      <Button variant="outline" size="sm" className="gap-2 cursor-pointer">
                        {paper.isKlok ? 'View Exam' : 'Attempt'}
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Trends and Drills */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold flex items-center gap-2 mb-4 text-foreground">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Weak Areas
            </h3>
            {activeDrills.length === 0 ? (
              <p className="text-sm text-muted-foreground">Attempt a past paper to uncover your weak areas.</p>
            ) : (
              <div className="space-y-3">
                {activeDrills.map(drill => (
                  <div key={drill.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                    <span className="text-sm font-medium line-clamp-1" title={drill.topic}>{drill.topic}</span>
                    <Link href={`/dashboard/past-papers/drills/${drill.id}`}>
                      <Button size="sm" variant="secondary" className="h-7 text-xs flex-shrink-0">Drill</Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
