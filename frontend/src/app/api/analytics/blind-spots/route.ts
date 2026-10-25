import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { groqChat } from '@/lib/ai/groq';

export async function GET(req: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error || !userId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  try {
    // 1. Fetch confidence ratings with lecture information
    const { data: confidence } = await supabase
      .from('confidence_ratings')
      .select('rating, slide_id, slides(lecture_id, lectures(id, title, course_id, courses(course_code)))')
      .eq('user_id', userId);

    // 2. Fetch quiz attempts with lecture information
    const { data: quizzes } = await supabase
      .from('quiz_attempts')
      .select('lecture_id, score, total, lectures(id, title, courses(course_code))')
      .eq('user_id', userId);

    // Aggregate confidence by lecture
    const confByLecture: Record<
      string,
      { ratings: number[]; title: string; courseCode: string; courseId: string }
    > = {};

    (confidence || []).forEach((c: any) => {
      const slide = Array.isArray(c.slides) ? c.slides[0] : c.slides;
      const lid = slide?.lecture_id;
      if (!lid) return;

      const lecture = Array.isArray(slide?.lectures) ? slide.lectures[0] : slide?.lectures;
      const course = Array.isArray(lecture?.courses) ? lecture.courses[0] : lecture?.courses;

      if (!confByLecture[lid]) {
        confByLecture[lid] = {
          ratings: [],
          title: lecture?.title || 'Lecture Topic',
          courseCode: course?.course_code || '',
          courseId: lecture?.course_id || '',
        };
      }
      confByLecture[lid].ratings.push(c.rating);
    });

    // Aggregate quiz scores by lecture
    const scoreByLecture: Record<
      string,
      { scores: number[]; title: string; courseCode: string }
    > = {};

    (quizzes || []).forEach((q: any) => {
      const lid = q.lecture_id;
      if (!lid) return;

      const lecture = Array.isArray(q.lectures) ? q.lectures[0] : q.lectures;
      const course = Array.isArray(lecture?.courses) ? lecture.courses[0] : lecture?.courses;

      if (!scoreByLecture[lid]) {
        scoreByLecture[lid] = {
          scores: [],
          title: lecture?.title || 'Lecture Topic',
          courseCode: course?.course_code || '',
        };
      }
      const percentage = q.total && q.total > 0 ? (q.score / q.total) * 100 : q.score;
      scoreByLecture[lid].scores.push(percentage);
    });

    // Detect knowledge gaps: confidence >= 3.0 but quiz average < 70%
    const candidateLectureIds = Object.keys(confByLecture).filter(
      (lid) => scoreByLecture[lid] && scoreByLecture[lid].scores.length > 0
    );

    const blindSpots = candidateLectureIds
      .map((lid) => {
        const confData = confByLecture[lid];
        const scoreData = scoreByLecture[lid];

        const avgConf =
          confData.ratings.reduce((s, v) => s + v, 0) / confData.ratings.length;
        const avgScore =
          scoreData.scores.reduce((s, v) => s + v, 0) / scoreData.scores.length;

        const isBlindSpot = avgConf >= 3.0 && avgScore < 70;
        const title = confData.courseCode
          ? `${confData.courseCode} – ${confData.title}`
          : confData.title;

        return {
          lectureId: lid,
          courseId: confData.courseId || '',
          title,
          avgConf,
          avgScore,
          isBlindSpot,
        };
      })
      .filter((r) => r.isBlindSpot);

    if (blindSpots.length === 0) {
      return NextResponse.json({ blindSpots: [] });
    }

    // Generate plain-language mentoring insight per blind spot (max 3)
    const insights = await Promise.all(
      blindSpots.slice(0, 3).map(async (bs) => {
        try {
          const prompt = `A student rated their self-confidence ${bs.avgConf.toFixed(1)}/5 on "${bs.title}", but only scored ${bs.avgScore.toFixed(0)}% on quizzes. In ONE concise sentence, explain why this recognition-recall gap occurs and what specific active recall drill they should do. Do not use AI clichés or fluff.`;
          const text = await groqChat(prompt);
          return {
            ...bs,
            insight: text.trim().replace(/^["']|["']$/g, ''),
          };
        } catch (_err) {
          return {
            ...bs,
            insight: `Familiarity with slide terminology can mask gaps in active problem-solving; practice active retrieval and quiz drills on this topic before exams.`,
          };
        }
      })
    );

    return NextResponse.json({ blindSpots: insights });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to detect blind spots', details: err.message },
      { status: 500 }
    );
  }
}
