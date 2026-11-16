import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateUser } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';
import {
  discoverMoodlePastPapers,
  downloadMoodlePdf,
  normalizeCourseCode,
  loginMoodleWithCredentials,
  fetchMoodleEnrolledCourses,
  fetchCourseFilesViaWs,
  downloadMoodleFileWithToken,
} from '../services/moodleCrawler';
import { extractQuestionsFromPdfBuffer } from './past-papers';
import { ensurePastPapersForUserCourses } from '../services/courseQuestionBanks';
import { withAIQuota } from '../middleware/quotaGuard';
import { consumeUserQuota } from '../lib/ai/quota';

const router = Router();
router.use(authenticateUser);

const syncCredentialsSchema = z.object({
  username: z.string().min(1, 'Index number or username is required'),
  password: z.string().min(1, 'Password is required'),
  baseUrl: z.string().url().optional().default('https://join.upsavirtual.site'),
});

/**
 * Direct student login using Index Number and Password via Moodle token service proxy
 */
router.post('/sync-credentials', async (req: any, res: Response): Promise<void> => {
  try {
    const parseResult = syncCredentialsSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid credentials format', details: parseResult.error.format() });
      return;
    }

    const { username, password, baseUrl } = parseResult.data;
    const userId = req.user!.id;

    // 1. Authenticate with Moodle Web Service via server-side proxy
    const { token } = await loginMoodleWithCredentials(username, password, baseUrl);

    // 2. Fetch student info & enrolled courses
    const { profile, courses: moodleCourses } = await fetchMoodleEnrolledCourses(token, baseUrl);

    // 3. Resolve user's institution
    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('institution_id')
      .eq('id', userId)
      .single();
    const institutionId = userProfile?.institution_id || null;

    // 4. Ensure each course from Moodle exists in user's `courses` table
    const syncedCourses: any[] = [];
    for (const mc of moodleCourses) {
      const normalized = mc.normalizedCode || normalizeCourseCode(mc.courseCode);
      const { data: existingCourse } = await supabaseAdmin
        .from('courses')
        .select('id, course_code, title')
        .eq('user_id', userId)
        .or(`course_code.ilike.%${normalized}%,title.ilike.%${normalized}%`)
        .limit(1)
        .maybeSingle();

      let courseRecord = existingCourse;
      if (!courseRecord) {
        const { data: newCourse, error: insertErr } = await supabaseAdmin
          .from('courses')
          .insert({
            user_id: userId,
            title: mc.fullname || mc.courseCode,
            course_code: mc.courseCode,
            institution_id: institutionId,
            colour: '#5B2D8E',
            semester: 1,
            year: new Date().getFullYear(),
          })
          .select('id, course_code, title')
          .single();

        if (!insertErr && newCourse) {
          courseRecord = newCourse;
        }
      }

      if (courseRecord) {
        syncedCourses.push(courseRecord);
      }
    }

    // 5. Ensure complete past question papers exist for all these enrolled courses
    if (syncedCourses.length > 0) {
      try {
        await ensurePastPapersForUserCourses(userId, syncedCourses, institutionId);
      } catch (paperGenErr) {
        console.warn('[MoodleSync] Past papers auto-generation notice:', paperGenErr);
      }
    }

    res.json({
      success: true,
      message: `Successfully connected as ${profile.fullName}. Enrolled courses and past question banks have been synchronized.`,
      student: {
        userId: profile.userId,
        fullName: profile.fullName,
        username: profile.username,
      },
      coursesCount: moodleCourses.length,
      courses: moodleCourses,
    });
  } catch (err: any) {
    console.error('[MoodleRouter] sync-credentials error:', err?.message || err);
    res.status(500).json({
      error: 'Failed to authenticate and sync from university portal',
      message: err?.message || 'Authentication failed',
    });
  }
});

const syncCourseSchema = z.object({
  courseId: z.number().int().positive(),
  sesskey: z.string().min(3),
  moodleSession: z.string().min(5),
  baseUrl: z.string().url().optional().default('https://join.upsavirtual.site'),
  institutionId: z.string().uuid().optional(),
});

/**
 * Preview past papers inside a Moodle course before downloading
 */
router.post('/preview-course', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = syncCourseSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid input parameters', details: parseResult.error.format() });
      return;
    }

    const { courseId, sesskey, moodleSession, baseUrl } = parseResult.data;
    const discovered = await discoverMoodlePastPapers({
      courseId,
      sesskey,
      moodleSession,
      baseUrl,
    });

    res.json({
      success: true,
      courseName: discovered.courseName,
      courseCode: discovered.courseCode,
      normalizedCode: discovered.normalizedCode,
      papersFound: discovered.papers.length,
      papers: discovered.papers.map((p) => ({
        title: p.title,
        filename: p.filename,
        year: p.year,
        examType: p.examType,
        url: p.url,
      })),
    });
  } catch (err: any) {
    console.error('[MoodleRouter] Preview error:', err?.message || err);
    res.status(500).json({
      error: 'Failed to inspect Moodle course',
      message: err?.message || 'Connection to university LMS failed',
    });
  }
});

/**
 * Sync and ingest past papers from a Moodle course into the UniStudy institutional library
 */
router.post('/sync-course', withAIQuota('handwriting_scan'), async (req: any, res: Response): Promise<void> => {
  try {
    const parseResult = syncCourseSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid input parameters', details: parseResult.error.format() });
      return;
    }

    const { courseId, sesskey, moodleSession, baseUrl } = parseResult.data;
    const userId = req.user!.id;

    // 1. Resolve user's institution ID (default to UPSA if registered with UPSA or not yet set)
    let institutionId = parseResult.data.institutionId;
    if (!institutionId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('institution_id, university')
        .eq('id', userId)
        .single();

      if (profile?.institution_id) {
        institutionId = profile.institution_id;
      } else {
        // Find UPSA in institutions table
        const { data: upsaInst } = await supabaseAdmin
          .from('institutions')
          .select('id')
          .or('abbreviation.eq.UPSA,name.ilike.%Professional Studies%')
          .limit(1)
          .single();

        institutionId = upsaInst?.id;
      }
    }

    // 2. Discover exam papers in Moodle
    const discovered = await discoverMoodlePastPapers({
      courseId,
      sesskey,
      moodleSession,
      baseUrl,
    });

    if (discovered.papers.length === 0) {
      res.json({
        success: true,
        message: 'No past question PDFs found in this course folder',
        courseCode: discovered.courseCode,
        papersSynced: 0,
        papers: [],
      });
      return;
    }

    const syncedPapers: any[] = [];

    // 3. Ingest each discovered paper (process up to 5 papers per sync batch)
    const papersToProcess = discovered.papers.slice(0, 5);

    for (const paperMeta of papersToProcess) {
      try {
        // Avoid duplicate ingestion if the same title & normalized code already exists in this institution
        const { data: existingPaper } = await supabaseAdmin
          .from('past_papers')
          .select('id, title')
          .eq('normalized_course_code', paperMeta.normalizedCode)
          .eq('year', paperMeta.year)
          .eq('exam_type', paperMeta.examType)
          .limit(1)
          .maybeSingle();

        if (existingPaper) {
          syncedPapers.push({
            id: existingPaper.id,
            title: existingPaper.title,
            status: 'already_exists',
          });
          continue;
        }

        // Download PDF
        const pdfBuffer = await downloadMoodlePdf(paperMeta.url, moodleSession);
        if (pdfBuffer.length < 50) {
          console.warn(`[MoodleSync] PDF buffer too small for ${paperMeta.title}, skipping`);
          continue;
        }

        // Insert paper record into central repository
        const { data: insertedPaper, error: paperInsertErr } = await supabaseAdmin
          .from('past_papers')
          .insert({
            user_id: userId,
            title: paperMeta.title,
            course_code: paperMeta.courseCode,
            normalized_course_code: paperMeta.normalizedCode,
            year: paperMeta.year,
            exam_type: paperMeta.examType,
            status: 'ready',
            institution_id: institutionId,
            shared_to_community: true,
          })
          .select()
          .single();

        if (paperInsertErr || !insertedPaper) {
          console.error('[MoodleSync] Failed to insert paper:', paperInsertErr);
          continue;
        }

        // Extract questions using AI OCR parser
        const extractedQuestions = await extractQuestionsFromPdfBuffer(pdfBuffer);

        if (Array.isArray(extractedQuestions) && extractedQuestions.length > 0) {
          const dbQuestions = extractedQuestions.map((q: any, i: number) => {
            const isMcq = q.question_type?.toLowerCase() === 'mcq';
            return {
              past_paper_id: insertedPaper.id,
              question_number: String(q.question_number || (i + 1)),
              text_content: String(q.text_content || 'Question content'),
              extracted_topic: `${isMcq ? 'MCQ' : 'THEORY'}|${String(q.extracted_topic || 'General')}`,
              marks_available: Number(q.marks_available || 1),
            };
          });

          await supabaseAdmin.from('past_paper_questions').insert(dbQuestions);
        }

        syncedPapers.push({
          id: insertedPaper.id,
          title: insertedPaper.title,
          questionsCount: extractedQuestions.length,
          status: 'synced',
        });
      } catch (paperErr: any) {
        console.error(`[MoodleSync] Failed to process ${paperMeta.title}:`, paperErr?.message);
      }
    }

    // Deduct quota for successful ingestion batch
    if (syncedPapers.some((p) => p.status === 'synced')) {
      try {
        await consumeUserQuota(userId, 'handwriting_scan');
      } catch (quotaErr) {
        console.warn('Quota consumption warning:', quotaErr);
      }
    }

    res.json({
      success: true,
      message: `Successfully processed ${syncedPapers.length} past exam paper(s)`,
      courseName: discovered.courseName,
      courseCode: discovered.courseCode,
      normalizedCode: discovered.normalizedCode,
      papersSynced: syncedPapers.length,
      papers: syncedPapers,
    });
  } catch (err: any) {
    console.error('[MoodleRouter] Sync error:', err?.message || err);
    res.status(500).json({
      error: 'Failed to sync Moodle course past papers',
      message: err?.message || 'An error occurred during synchronization',
    });
  }
});

/**
 * Check count and details of available institutional past papers for a given course code
 */
router.get('/match-course', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawCode = (req.query.code as string) || '';
    if (!rawCode.trim()) {
      res.json({ count: 0, papers: [] });
      return;
    }

    const normalized = normalizeCourseCode(rawCode);
    const userId = (req as any).user?.id;

    // Get user institution
    let institutionId: string | null = null;
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('institution_id')
        .eq('id', userId)
        .single();
      institutionId = profile?.institution_id || null;
    }

    const query = supabaseAdmin
      .from('past_papers')
      .select('id, title, year, exam_type, status, course_code, institution_id')
      .eq('normalized_course_code', normalized);

    const { data: papers, error } = await query.order('year', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      courseCode: rawCode.toUpperCase(),
      normalizedCode: normalized,
      count: papers ? papers.length : 0,
      papers: papers || [],
    });
  } catch (err: any) {
    console.error('[MoodleRouter] Match error:', err);
    res.status(500).json({ error: 'Failed to match course past papers' });
  }
});

export default router;

