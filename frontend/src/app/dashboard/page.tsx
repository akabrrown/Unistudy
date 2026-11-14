import { createClient } from '@/lib/supabase/server';
import { AnxietyCheckIn } from '@/components/AnxietyCheckIn';
import {
  DashboardCommandCenter,
  type DashboardAssessmentItem,
  type DashboardCalendarItem,
  type DashboardCourseItem,
  type DashboardDueQueueItem,
  type DashboardHeatmapCell,
  type DashboardPinnedVideoItem,
  type DashboardResumeItem,
} from '@/components/dashboard/DashboardCommandCenter';

interface LectureRow {
  id: string;
  title: string | null;
  week: number | null;
  slide_count: number | null;
  created_at: string | null;
}

interface CourseRow {
  id: string;
  title: string;
  course_code: string | null;
  colour: string | null;
  semester: string | null;
  year: number | null;
  archived: boolean | null;
  created_at: string | null;
  lectures: LectureRow[] | null;
}

interface ProfileRow {
  full_name: string | null;
  university: string | null;
  degree: string | null;
  year_of_study: number | null;
}

interface WalletRow {
  balance: number | null;
}

interface LastPositionRow {
  lecture_id: string | null;
  slide_number: number | null;
  updated_at: string | null;
}

interface FlashcardRow {
  id: string;
  lecture_id: string | null;
  next_review: string | null;
}

interface CalendarRow {
  id: string;
  title: string;
  date: string;
  type: 'exam' | 'assignment' | 'session';
  time?: string | null;
  course_id?: string | null;
}

interface StudySessionRow {
  id: string;
  duration_secs?: number | null;
  duration_minutes?: number | null;
  session_date?: string | null;
  created_at?: string | null;
  start_time?: string | null;
}

interface QuizAttemptRow {
  id: string;
  lecture_id: string | null;
  score: number | null;
  total: number | null;
  completed_at: string | null;
}

interface PastPaperJoinRow {
  id: string;
  title: string | null;
  year: number | null;
  course_id: string | null;
}

interface PastPaperAttemptRow {
  id: string;
  past_paper_id: string | null;
  score_percentage: number | null;
  started_at: string | null;
  completed_at: string | null;
  past_papers: PastPaperJoinRow | PastPaperJoinRow[] | null;
}

interface ConfidenceRow {
  rated_at: string | null;
}

interface PinnedVideoRow {
  id: string;
  video_id: string;
  title: string;
  channel: string | null;
  watched: boolean | null;
  pinned_at: string | null;
}

function getGreeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function toUtcDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function computeHeatLevel(points: number): 0 | 1 | 2 | 3 | 4 {
  if (points <= 0) return 0;
  if (points < 20) return 1;
  if (points < 45) return 2;
  if (points < 75) return 3;
  return 4;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const todayStr = toUtcDateKey(now);
  const startOf28Days = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 27));
  const startOf28Iso = startOf28Days.toISOString();
  const sevenDaysAgoMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;

  let profile: ProfileRow | null = null;
  let creditBalance = 0;
  let rawCourses: CourseRow[] = [];
  let lastPosition: LastPositionRow | null = null;
  let rawFlashcards: FlashcardRow[] = [];
  let rawEvents: CalendarRow[] = [];
  let rawSessions: StudySessionRow[] = [];
  let rawQuizAttempts: QuizAttemptRow[] = [];
  let rawPaperAttempts: PastPaperAttemptRow[] = [];
  let rawConfidence: ConfidenceRow[] = [];
  let rawPinnedVideos: PinnedVideoRow[] = [];

  if (user) {
    const [
      profileRes,
      walletRes,
      coursesRes,
      lastPosRes,
      flashcardsRes,
      eventsRes,
      sessionsRes,
      quizzesRes,
      papersRes,
      confidenceRes,
      videosRes,
    ] = await Promise.allSettled([
      supabase
        .from('profiles')
        .select('full_name, university, degree, year_of_study')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('credit_wallets')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('courses')
        .select('id, title, course_code, colour, semester, year, archived, created_at, lectures(id, title, week, slide_count, created_at)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('last_position')
        .select('lecture_id, slide_number, updated_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('flashcards')
        .select('id, lecture_id, next_review')
        .eq('user_id', user.id),
      supabase
        .from('calendar_events')
        .select('id, title, date, type, time')
        .eq('user_id', user.id)
        .gte('date', todayStr)
        .order('date', { ascending: true })
        .limit(8),
      supabase
        .from('study_sessions')
        .select('id, duration_secs, session_date')
        .eq('user_id', user.id)
        .gte('session_date', startOf28Days.toISOString().split('T')[0]),
      supabase
        .from('quiz_attempts')
        .select('id, lecture_id, score, total, completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(12),
      supabase
        .from('past_paper_attempts')
        .select('id, past_paper_id, score_percentage, started_at, completed_at, past_papers!past_paper_attempts_past_paper_id_fkey(id, title, year, course_id)')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(12),
      supabase
        .from('confidence_ratings')
        .select('rated_at')
        .eq('user_id', user.id)
        .gte('rated_at', startOf28Iso),
      supabase
        .from('pinned_videos')
        .select('id, video_id, title, channel, watched, pinned_at')
        .eq('user_id', user.id)
        .order('watched', { ascending: true })
        .order('pinned_at', { ascending: false })
        .limit(3),
    ]);

    if (profileRes.status === 'fulfilled' && profileRes.value.data) {
      profile = profileRes.value.data as ProfileRow;
    }
    if (walletRes.status === 'fulfilled' && walletRes.value.data) {
      creditBalance = Number((walletRes.value.data as WalletRow).balance ?? 0);
    }
    if (coursesRes.status === 'fulfilled' && coursesRes.value.data) {
      rawCourses = coursesRes.value.data as CourseRow[];
    }
    if (lastPosRes.status === 'fulfilled' && lastPosRes.value.data) {
      lastPosition = lastPosRes.value.data as LastPositionRow;
    }
    if (flashcardsRes.status === 'fulfilled' && flashcardsRes.value.data) {
      rawFlashcards = flashcardsRes.value.data as FlashcardRow[];
    }
    if (eventsRes.status === 'fulfilled' && eventsRes.value.data) {
      rawEvents = eventsRes.value.data as CalendarRow[];
    }
    if (sessionsRes.status === 'fulfilled' && sessionsRes.value.data) {
      rawSessions = sessionsRes.value.data as StudySessionRow[];
    }
    if (quizzesRes.status === 'fulfilled' && quizzesRes.value.data) {
      rawQuizAttempts = quizzesRes.value.data as QuizAttemptRow[];
    }
    if (papersRes.status === 'fulfilled' && papersRes.value.data) {
      rawPaperAttempts = papersRes.value.data as PastPaperAttemptRow[];
    }
    if (confidenceRes.status === 'fulfilled' && confidenceRes.value.data) {
      rawConfidence = confidenceRes.value.data as ConfidenceRow[];
    }
    if (videosRes.status === 'fulfilled' && videosRes.value.data) {
      rawPinnedVideos = videosRes.value.data as PinnedVideoRow[];
    }
  }

  // Filter active non-archived courses & map lecture metadata in memory
  const activeCourses = rawCourses.filter((course) => !course.archived);
  const lectureLookup = new Map<
    string,
    {
      lectureId: string;
      lectureTitle: string;
      slideCount: number;
      courseId: string;
      courseCode: string;
      courseTitle: string;
      courseColour: string | null;
    }
  >();

  const courseById = new Map<string, CourseRow>();
  for (const course of activeCourses) {
    courseById.set(course.id, course);
    const validLectures = (course.lectures || []).filter(
      (lec) => lec && !(lec.title || '').startsWith('[FAILED')
    );
    for (const lec of validLectures) {
      lectureLookup.set(lec.id, {
        lectureId: lec.id,
        lectureTitle: lec.title || 'Untitled Lecture',
        slideCount: lec.slide_count || 0,
        courseId: course.id,
        courseCode: course.course_code || 'COURSE',
        courseTitle: course.title || 'Untitled Course',
        courseColour: course.colour,
      });
    }
  }

  // Flashcards SM-2 counts per lecture and per course
  const nowMs = now.getTime();
  const dueByLecture = new Map<string, number>();
  const dueByCourse = new Map<string, number>();
  const totalByCourse = new Map<string, number>();
  let dueFlashcards = 0;

  for (const card of rawFlashcards) {
    const lid = card.lecture_id;
    const lecMeta = lid ? lectureLookup.get(lid) : undefined;
    const isDue = !card.next_review || new Date(card.next_review).getTime() <= nowMs;

    if (isDue) dueFlashcards += 1;

    if (lid && lecMeta) {
      totalByCourse.set(lecMeta.courseId, (totalByCourse.get(lecMeta.courseId) || 0) + 1);
      if (isDue) {
        dueByLecture.set(lid, (dueByLecture.get(lid) || 0) + 1);
        dueByCourse.set(lecMeta.courseId, (dueByCourse.get(lecMeta.courseId) || 0) + 1);
      }
    }
  }

  const dueQueue: DashboardDueQueueItem[] = Array.from(dueByLecture.entries())
    .map(([lectureId, dueCount]) => {
      const meta = lectureLookup.get(lectureId)!;
      return {
        lectureId,
        lectureTitle: meta.lectureTitle,
        courseId: meta.courseId,
        courseCode: meta.courseCode,
        dueCount,
      };
    })
    .sort((a, b) => b.dueCount - a.dueCount)
    .slice(0, 4);

  const courses: DashboardCourseItem[] = activeCourses.map((course) => {
    const validLectures = (course.lectures || [])
      .filter((lec) => lec && !(lec.title || '').startsWith('[FAILED'))
      .sort((a, b) => {
        const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tB - tA;
      });
    const totalSlides = validLectures.reduce((sum, lec) => sum + (lec.slide_count || 0), 0);
    const latestLecture = validLectures[0] || null;
    return {
      id: course.id,
      title: course.title,
      course_code: course.course_code,
      colour: course.colour,
      semester: course.semester,
      year: course.year,
      lectureCount: validLectures.length,
      totalSlides,
      dueCards: dueByCourse.get(course.id) || 0,
      totalCards: totalByCourse.get(course.id) || 0,
      latestLectureId: latestLecture ? latestLecture.id : null,
      latestLectureTitle: latestLecture ? latestLecture.title : null,
    };
  });

  // Determine hero Resume Studying item
  let resumeItem: DashboardResumeItem | null = null;
  if (lastPosition?.lecture_id && lectureLookup.has(lastPosition.lecture_id)) {
    const meta = lectureLookup.get(lastPosition.lecture_id)!;
    resumeItem = {
      courseId: meta.courseId,
      courseCode: meta.courseCode,
      courseTitle: meta.courseTitle,
      courseColour: meta.courseColour,
      lectureId: meta.lectureId,
      lectureTitle: meta.lectureTitle,
      slideNumber: Math.max(1, lastPosition.slide_number || 1),
      slideCount: meta.slideCount,
      updatedAt: lastPosition.updated_at,
    };
  } else {
    const firstWithLecture = courses.find((c) => c.latestLectureId);
    if (firstWithLecture && firstWithLecture.latestLectureId) {
      const meta = lectureLookup.get(firstWithLecture.latestLectureId);
      if (meta) {
        resumeItem = {
          courseId: meta.courseId,
          courseCode: meta.courseCode,
          courseTitle: meta.courseTitle,
          courseColour: meta.courseColour,
          lectureId: meta.lectureId,
          lectureTitle: meta.lectureTitle,
          slideNumber: 1,
          slideCount: meta.slideCount,
          updatedAt: null,
        };
      }
    }
  }

  // Weekly sessions + 28-day heatmap points
  const pointsByDate: Record<string, number> = {};
  const addPoints = (isoStr: string | null, pts: number) => {
    if (!isoStr) return;
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return;
    const key = toUtcDateKey(d);
    pointsByDate[key] = (pointsByDate[key] || 0) + pts;
  };

  let weeklyMinutes = 0;
  let weeklySessions = 0;

  for (const s of rawSessions) {
    const ts = s.session_date || s.created_at || s.start_time || null;
    const dur = s.duration_secs
      ? Math.round(s.duration_secs / 60)
      : Math.max(0, Number(s.duration_minutes || 25));
    addPoints(ts, Math.max(15, Math.floor(dur)));
    if (ts && new Date(ts).getTime() >= sevenDaysAgoMs) {
      weeklyMinutes += dur;
      weeklySessions += 1;
    }
  }

  for (const q of rawQuizAttempts) {
    addPoints(q.completed_at, 25);
  }
  for (const r of rawConfidence) {
    addPoints(r.rated_at, 5);
  }

  const heatmapCells: DashboardHeatmapCell[] = [];
  let activeDaysLast28 = 0;
  for (let i = 27; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const dateKey = toUtcDateKey(d);
    const points = pointsByDate[dateKey] || 0;
    if (points > 0) activeDaysLast28 += 1;
    heatmapCells.push({
      dateKey,
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      points,
      level: computeHeatLevel(points),
    });
  }

  // Combine quizzes + past paper attempts for Recent Assessments & Exam Readiness average
  const paperAssessments: DashboardAssessmentItem[] = rawPaperAttempts.map((att) => {
    const paper = Array.isArray(att.past_papers) ? att.past_papers[0] : att.past_papers;
    const course = paper?.course_id ? courseById.get(paper.course_id) : undefined;
    return {
      id: att.id,
      kind: 'past_paper',
      title: paper?.title || 'Past Paper Attempt',
      subtitle: course?.course_code || (paper?.year ? `Exam ${paper.year}` : 'Past Paper'),
      scorePercent:
        att.score_percentage !== null && att.score_percentage !== undefined
          ? Number(att.score_percentage)
          : null,
      completedAt: att.completed_at || att.started_at,
      href: `/dashboard/past-papers/results/${att.id}`,
    };
  });

  const quizAssessments: DashboardAssessmentItem[] = rawQuizAttempts.map((q) => {
    const lecMeta = q.lecture_id ? lectureLookup.get(q.lecture_id) : undefined;
    const pct =
      q.score !== null && q.score !== undefined
        ? q.total && q.total > 0
          ? (q.score / q.total) * 100
          : q.score
        : null;
    return {
      id: q.id,
      kind: 'quiz',
      title: lecMeta ? `${lecMeta.lectureTitle} Quiz` : 'Lecture Practice Quiz',
      subtitle: lecMeta?.courseCode || 'Quiz',
      scorePercent: pct !== null ? Math.min(100, Math.max(0, Math.round(pct))) : null,
      completedAt: q.completed_at,
      href: lecMeta ? `/dashboard/courses/${lecMeta.courseId}/quiz` : '/dashboard/courses',
    };
  });

  const allAssessments = [...paperAssessments, ...quizAssessments].sort((a, b) => {
    const tA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const tB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return tB - tA;
  });

  const scoredAssessments = allAssessments.filter((a) => a.scorePercent !== null);
  const avgScorePercent =
    scoredAssessments.length > 0
      ? Math.round(
          scoredAssessments.reduce((sum, item) => sum + (item.scorePercent || 0), 0) /
            scoredAssessments.length
        )
      : null;

  const fullName =
    profile?.full_name?.trim() ||
    (typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '') ||
    user?.email?.split('@')[0] ||
    'Scholar';
  const firstName = fullName.split(/\s+/)[0] || 'Scholar';

  const subtitleParts = [
    profile?.degree,
    profile?.year_of_study ? `Year ${profile.year_of_study}` : null,
    profile?.university,
  ].filter(Boolean);

  const upcomingEvents: DashboardCalendarItem[] = rawEvents.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    type: e.type,
    time: e.time || undefined,
    course_id: e.course_id || null,
  }));

  const pinnedVideos: DashboardPinnedVideoItem[] = rawPinnedVideos.map((v) => ({
    id: v.id,
    video_id: v.video_id,
    title: v.title,
    channel: v.channel,
    watched: Boolean(v.watched),
  }));

  return (
    <>
      <AnxietyCheckIn />
      <DashboardCommandCenter
        greeting={getGreeting(now.getUTCHours())}
        firstName={firstName}
        academicSubtitle={subtitleParts.length > 0 ? subtitleParts.join(' · ') : null}
        todayLabel={now.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}
        creditBalance={creditBalance}
        weeklyMinutes={weeklyMinutes}
        weeklySessions={weeklySessions}
        dueFlashcards={dueFlashcards}
        totalFlashcards={rawFlashcards.length}
        avgScorePercent={avgScorePercent}
        assessmentCount={scoredAssessments.length}
        courses={courses}
        resumeItem={resumeItem}
        dueQueue={dueQueue}
        recentAssessments={allAssessments.slice(0, 4)}
        upcomingEvents={upcomingEvents}
        pinnedVideos={pinnedVideos}
        heatmapCells={heatmapCells}
        activeDaysLast28={activeDaysLast28}
      />
    </>
  );
}
