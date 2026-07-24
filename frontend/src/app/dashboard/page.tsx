import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { MoodCheckin } from '@/components/study/MoodCheckin'
import { EffortTracker } from '@/components/EffortTracker'
import { DailyMotivationalQuote } from '@/components/DailyMotivationalQuote'
import { AnxietyCheckIn } from '@/components/AnxietyCheckIn'
import { ExamScheduler } from '@/components/ExamScheduler'
import { ExamCountdownList } from '@/components/ExamCountdownList'
import { FolderPlus, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  let courses: any[] = []
  let upcomingExams: any[] = []
  
  if (user) {
    const { data: coursesData } = await supabase
      .from('courses')
      .select('*, lectures!inner(id)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    courses = coursesData || []

    const { data: examsData } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'exam')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(5)
      
    upcomingExams = examsData || []
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10">
      <AnxietyCheckIn />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#1A0A2E]">Your Study Desk</h1>
          <p className="text-muted-foreground mt-1">Organize your materials and start learning.</p>
        </div>
        <div className="w-full md:w-auto">
          <MoodCheckin />
        </div>
      </div>

      <DailyMotivationalQuote />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <EffortTracker />
        </div>
        <div className="space-y-6">
          <div className="bg-card border rounded-xl p-4 shadow-sm">
            <h3 className="font-medium mb-3">Upcoming Exams</h3>
            <ExamCountdownList exams={upcomingExams} courses={courses} />
            <ExamScheduler />
          </div>
        </div>
      </div>
      
      {courses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-[#FAF8FF] rounded-3xl border border-[#EBE5F0] dark:bg-card dark:border-border">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-[#EBE5F0] mb-6 dark:bg-muted dark:border-muted">
            <BookOpen size={36} className="text-[#5B2D8E] dark:text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-[#1A0A2E] mb-3 dark:text-foreground">No courses yet</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8 text-[15px] leading-relaxed">
            Upload your syllabus, lecture slides, or reading materials to create your first course. We will automatically generate your study plan and flashcards.
          </p>
          <Link 
            href="/dashboard/courses" 
            className="flex items-center gap-2 bg-[#5B2D8E] text-white px-8 py-4 rounded-full font-semibold hover:bg-[#3D1A6E] transition-colors shadow-md hover:shadow-lg dark:bg-primary dark:hover:bg-primary/90"
          >
            <FolderPlus size={18} />
            Go to Courses
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Recent Courses</h2>
            <Link href="/dashboard/courses" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.slice(0, 3).map(course => (
              <Link key={course.id} href={`/dashboard/courses/${course.id}`}>
                <Card className="relative overflow-hidden group hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: course.colour || '#5B2D8E' }} />
                  <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-1">{course.course_code || 'COURSE'}</p>
                      <CardTitle className="text-xl">{course.title || 'Untitled'}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <BookOpen size={18} />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mt-4 border-t pt-4">
                    <div className="text-sm text-muted-foreground">{course.lectures?.length || 0} lectures</div>
                  </div>
                </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
