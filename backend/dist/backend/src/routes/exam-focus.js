"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCourseOwnership = verifyCourseOwnership;
const crypto_1 = require("crypto");
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const generative_ai_1 = require("@google/generative-ai");
const auth_1 = require("../middleware/auth");
const expensiveGuard_1 = require("../middleware/expensiveGuard");
const quota_1 = require("../lib/ai/quota");
const safeGroq_1 = require("../lib/ai/safeGroq");
const supabase_1 = require("../lib/supabase");
const courseQuestionBanks_1 = require("../services/courseQuestionBanks");
const slideDedupe_1 = require("../../../shared/lib/slideDedupe");
const cpuOptimization_1 = require("../../../shared/lib/cpuOptimization");
const aiModels_1 = require("../../../shared/constants/aiModels");
const examFocus_1 = require("../../../shared/lib/examFocus");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
router.use((0, expensiveGuard_1.deduplicateInFlightRequests)({ methods: ['GET', 'POST'] }));
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});
const ALLOWED_EXTRACT_MIMES = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    'application/pdf',
]);
const coursePacksCache = new cpuOptimization_1.TTLCache(15_000, 300);
const ephemeralPackStore = new cpuOptimization_1.TTLCache(24 * 60 * 60 * 1000, 200);
function isMissingTableError(error) {
    const code = String(error?.code || '');
    const msg = String(error?.message || '').toLowerCase();
    return (code === '42P01' ||
        code === 'PGRST205' ||
        msg.includes('exam_focus_packs') && (msg.includes('does not exist') || msg.includes('schema cache')));
}
function normalizeCode(value) {
    return String(value || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
}
async function generateJsonWithGeminiOrFallback(prompt, temperature) {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
        const genAI = new generative_ai_1.GoogleGenerativeAI(geminiKey);
        for (const modelName of aiModels_1.GEMINI_CANDIDATE_MODELS) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    generationConfig: {
                        temperature,
                        responseMimeType: 'application/json',
                    },
                });
                const response = await model.generateContent(prompt);
                const text = response.response.text();
                if (text && text.trim())
                    return text;
            }
            catch (err) {
                const status = err?.status;
                const msg = String(err?.message || '').toLowerCase();
                if (status === 400 || msg.includes('api_key_invalid'))
                    break;
            }
        }
    }
    try {
        const groqOut = await (0, safeGroq_1.chatCompletionWithFallback)({
            messages: [
                {
                    role: 'system',
                    content: 'You are a strictly source-grounded academic assistant. Return only valid JSON.',
                },
                { role: 'user', content: prompt },
            ],
            response_format: { type: 'json_object' },
            temperature,
            max_tokens: 2400,
        });
        if (groqOut && groqOut.trim())
            return groqOut;
    }
    catch (err) {
        console.warn('[ExamFocus] AI generation fallback used:', err?.message || err);
    }
    return null;
}
async function verifyCourseOwnership(userId, courseId) {
    if (!userId || !courseId)
        return null;
    // 1. Direct ownership check: courses where id = courseId AND user_id = userId
    const { data: directCourse, error: directErr } = await supabase_1.supabaseAdmin
        .from('courses')
        .select('id, user_id, course_code, title, colour')
        .eq('id', courseId)
        .eq('user_id', userId)
        .maybeSingle();
    if (!directErr && directCourse) {
        return directCourse;
    }
    // 2. Cross-reference check:
    // If the courseId provided was from a shared bank paper, another user's course clone, or a shared catalogue course,
    // find that course's course_code and match against the requesting user's own courses.
    const { data: refCourse } = await supabase_1.supabaseAdmin
        .from('courses')
        .select('id, course_code, title')
        .eq('id', courseId)
        .maybeSingle();
    const codeToMatch = (refCourse?.course_code || refCourse?.title || '').trim();
    if (codeToMatch) {
        const { data: userMatchingCourse } = await supabase_1.supabaseAdmin
            .from('courses')
            .select('id, user_id, course_code, title, colour')
            .eq('user_id', userId)
            .ilike('course_code', codeToMatch)
            .maybeSingle();
        if (userMatchingCourse) {
            return userMatchingCourse;
        }
    }
    // 3. Fallback: if courseId was passed as a raw course_code string (e.g. "BCPC201")
    const { data: codeOnlyCourse } = await supabase_1.supabaseAdmin
        .from('courses')
        .select('id, user_id, course_code, title, colour')
        .eq('user_id', userId)
        .ilike('course_code', courseId.trim())
        .maybeSingle();
    if (codeOnlyCourse) {
        return codeOnlyCourse;
    }
    return null;
}
async function scrapeCourseContent(userId, course) {
    const [profileRes, lecturesRes] = await Promise.all([
        supabase_1.supabaseAdmin
            .from('profiles')
            .select('institution_id')
            .eq('id', userId)
            .maybeSingle(),
        supabase_1.supabaseAdmin
            .from('lectures')
            .select('id, title, week')
            .eq('course_id', course.id)
            .order('week', { ascending: true }),
    ]);
    const institutionId = profileRes.data?.institution_id || null;
    try {
        await (0, courseQuestionBanks_1.ensurePastPapersForUserCourses)(userId, [course], institutionId);
    }
    catch (seedErr) {
        console.warn('[ExamFocus] Could not auto-ensure past papers:', seedErr);
    }
    const validLectures = (lecturesRes.data || []).filter((l) => l?.id && !String(l.title || '').startsWith('[FAILED'));
    const lectureIds = validLectures.map((l) => l.id);
    const lectureMetaMap = new Map();
    for (const lec of validLectures) {
        lectureMetaMap.set(lec.id, {
            title: lec.title || 'Lecture Deck',
            week: typeof lec.week === 'number' ? lec.week : null,
        });
    }
    const targetCode = normalizeCode(course.course_code || course.title);
    const paperOrFilters = [`course_id.eq.${course.id}`, `user_id.eq.${userId}`];
    if (course.course_code) {
        const rawCode = course.course_code.trim();
        paperOrFilters.push(`course_code.ilike.%${rawCode}%`);
        paperOrFilters.push(`normalized_course_code.ilike.%${rawCode}%`);
    }
    const [slidesRes, papersRes] = await Promise.all([
        lectureIds.length > 0
            ? supabase_1.supabaseAdmin
                .from('slides')
                .select('id, lecture_id, slide_number, image_url, raw_text, explanation')
                .in('lecture_id', lectureIds)
                .order('slide_number', { ascending: true })
            : Promise.resolve({ data: [], error: null }),
        supabase_1.supabaseAdmin
            .from('past_papers')
            .select('id, title, year, exam_type, course_id, course_code, normalized_course_code, past_paper_questions(id, question_number, text_content, extracted_topic, marks_available)')
            .or(paperOrFilters.join(','))
            .order('year', { ascending: false }),
    ]);
    // Group and dedupe slides per lecture so duplicate DB rows do not inflate score
    const slidesByLecture = new Map();
    for (const row of slidesRes.data || []) {
        const arr = slidesByLecture.get(row.lecture_id) || [];
        arr.push(row);
        slidesByLecture.set(row.lecture_id, arr);
    }
    const scrapedSlides = [];
    for (const [lectureId, rows] of slidesByLecture.entries()) {
        const meta = lectureMetaMap.get(lectureId);
        const deduped = (0, slideDedupe_1.dedupeSlidesByNumber)(rows);
        for (const s of deduped) {
            scrapedSlides.push({
                slide_id: String(s.id),
                lecture_id: lectureId,
                lecture_title: meta?.title || 'Lecture Deck',
                week: meta?.week ?? null,
                slide_number: Number(s.slide_number || 1),
                image_url: String(s.image_url || ''),
                raw_text: s.raw_text || '',
                explanation: s.explanation || '',
            });
        }
    }
    const scrapedQuestions = [];
    for (const paper of papersRes.data || []) {
        const pCode = normalizeCode(paper.normalized_course_code || paper.course_code);
        const belongsToCourse = paper.course_id === course.id ||
            (targetCode &&
                pCode &&
                (pCode === targetCode || pCode.includes(targetCode) || targetCode.includes(pCode)));
        if (!belongsToCourse)
            continue;
        for (const q of paper.past_paper_questions || []) {
            if (!q?.id || !q?.text_content)
                continue;
            scrapedQuestions.push({
                question_id: String(q.id),
                paper_id: String(paper.id),
                paper_title: paper.title || `${course.course_code || 'Course'} ${paper.year || ''}`.trim(),
                year: typeof paper.year === 'number' ? paper.year : null,
                exam_type: paper.exam_type || null,
                question_number: String(q.question_number || '1'),
                text_content: String(q.text_content),
                extracted_topic: q.extracted_topic || '',
                marks_available: typeof q.marks_available === 'number' ? q.marks_available : 1,
            });
        }
    }
    return { slides: scrapedSlides, questions: scrapedQuestions };
}
async function synthesizePackSummary(userId, course, areas, matchedSlides, matchedQuestions, coverageGaps) {
    const deterministic = (0, examFocus_1.buildDeterministicExamFocusSummary)(areas, matchedSlides, matchedQuestions, coverageGaps);
    try {
        const quota = await (0, quota_1.checkUserQuota)(userId, 'exam_focus', 'default');
        if (!quota.allowed) {
            return { summaries: deterministic, aiUsed: false };
        }
        const prompt = (0, examFocus_1.buildExamFocusSynthesisPrompt)({
            courseCode: course.course_code || 'COURSE',
            courseTitle: course.title,
            areas,
            matchedSlides,
            matchedQuestions,
            coverageGaps,
        });
        const raw = await generateJsonWithGeminiOrFallback(prompt, 0.15);
        if (!raw) {
            return { summaries: deterministic, aiUsed: false };
        }
        const parsed = (0, examFocus_1.parseExamFocusSynthesisJson)(raw, {
            areas,
            matchedSlides,
            matchedQuestions,
            coverageGaps,
        });
        void (0, quota_1.consumeUserQuota)(userId, 'exam_focus', 'default').catch(() => { });
        return { summaries: parsed, aiUsed: true };
    }
    catch {
        return { summaries: deterministic, aiUsed: false };
    }
}
/**
 * POST /api/exam-focus/extract-areas
 * Extracts lecturer exam focus topics from an uploaded image screenshot (Vision OCR temp 0.1) or PDF.
 */
router.post('/extract-areas', (0, expensiveGuard_1.protectExpensiveEndpoint)({ maxPerMinute: 10, maxConcurrent: 2 }), upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'Please upload a syllabus image or PDF file.' });
        }
        if (!ALLOWED_EXTRACT_MIMES.has(file.mimetype)) {
            return res.status(400).json({
                error: 'Unsupported file format. Upload a PNG, JPG, WebP image, or PDF document.',
            });
        }
        // 1. Free PDF selectable text extraction first (0 AI tokens)
        if (file.mimetype === 'application/pdf') {
            try {
                const parsedPdf = await (0, pdf_parse_1.default)(file.buffer);
                const textAreas = (0, examFocus_1.parseLecturerAreasInput)(parsedPdf.text || '');
                if (textAreas.length > 0) {
                    return res.json({
                        rawText: textAreas.join('\n'),
                        areas: textAreas,
                        source: 'pdf_text',
                    });
                }
            }
            catch {
                // Fall through to Vision OCR on scanned image-only PDFs
            }
        }
        // 2. Vision OCR extraction at low temperature (0.1)
        const quota = await (0, quota_1.checkUserQuota)(req.user.id, 'handwriting_scan', 'default');
        if (!quota.allowed) {
            return res.status(403).json({
                error: 'quota_exceeded',
                message: 'Daily OCR quota or wallet balance reached. Paste or type the topics directly instead.',
            });
        }
        const ocrPrompt = (0, examFocus_1.buildAreasOcrPrompt)();
        const base64Data = file.buffer.toString('base64');
        let extractedText = '';
        if (!extractedText && process.env.MISTRAL_API_KEY && file.mimetype.startsWith('image/')) {
            for (const modelName of aiModels_1.MISTRAL_VISION_MODELS) {
                try {
                    const mRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
                        method: 'POST',
                        signal: AbortSignal.timeout(10000),
                        headers: {
                            Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: modelName,
                            temperature: 0.1,
                            max_tokens: 1500,
                            messages: [
                                {
                                    role: 'user',
                                    content: [
                                        { type: 'text', text: ocrPrompt },
                                        {
                                            type: 'image_url',
                                            image_url: `data:${file.mimetype};base64,${base64Data}`,
                                        },
                                    ],
                                },
                            ],
                        }),
                    });
                    if (mRes.ok) {
                        const json = await mRes.json();
                        const content = json.choices?.[0]?.message?.content?.trim();
                        if (content) {
                            extractedText = content;
                            break;
                        }
                    }
                }
                catch {
                    // Try next candidate
                }
            }
        }
        if (!extractedText && process.env.OPENROUTER_API_KEY && file.mimetype.startsWith('image/')) {
            for (const modelName of aiModels_1.OPENROUTER_CANDIDATE_MODELS.slice(0, 2)) {
                try {
                    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                        method: 'POST',
                        signal: AbortSignal.timeout(10000),
                        headers: {
                            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: modelName,
                            temperature: 0.1,
                            max_tokens: 1500,
                            messages: [
                                {
                                    role: 'user',
                                    content: [
                                        { type: 'text', text: ocrPrompt },
                                        {
                                            type: 'image_url',
                                            image_url: { url: `data:${file.mimetype};base64,${base64Data}` },
                                        },
                                    ],
                                },
                            ],
                        }),
                    });
                    if (orRes.ok) {
                        const json = await orRes.json();
                        const content = json.choices?.[0]?.message?.content?.trim();
                        if (content) {
                            extractedText = content;
                            break;
                        }
                    }
                }
                catch {
                    // Try next candidate
                }
            }
        }
        if (!extractedText && process.env.GEMINI_API_KEY) {
            const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            for (const modelName of aiModels_1.GEMINI_CANDIDATE_MODELS) {
                try {
                    const model = genAI.getGenerativeModel({
                        model: modelName,
                        generationConfig: { temperature: 0.1, maxOutputTokens: 1500 },
                    });
                    const out = await model.generateContent([
                        ocrPrompt,
                        { inlineData: { data: base64Data, mimeType: file.mimetype } },
                    ]);
                    const candidate = out.response.text()?.trim();
                    if (candidate) {
                        extractedText = candidate;
                        break;
                    }
                }
                catch {
                    // Try next model candidate
                }
            }
        }
        if (!extractedText || /^NO_AREAS_FOUND$/i.test(extractedText.trim())) {
            return res.status(422).json({
                error: 'Could not detect clear exam topics in that file. Please try a sharper photo or paste the topics.',
            });
        }
        const areas = (0, examFocus_1.parseLecturerAreasInput)(extractedText);
        if (areas.length === 0) {
            return res.status(422).json({
                error: 'No exam topics found in the uploaded file.',
            });
        }
        void (0, quota_1.consumeUserQuota)(req.user.id, 'handwriting_scan', 'default').catch(() => { });
        return res.json({
            rawText: areas.join('\n'),
            areas,
            source: 'vision_ocr',
        });
    }
    catch (err) {
        console.error('[ExamFocus] Area extraction error:', err);
        return res.status(500).json({ error: 'Failed to extract exam areas from file.' });
    }
});
/**
 * POST /api/exam-focus/generate
 * Scrapes matching slides & past paper questions for lecturer areas and saves an Exam Focus Pack.
 */
router.post('/generate', (0, expensiveGuard_1.protectExpensiveEndpoint)({ maxPerMinute: 10, maxConcurrent: 2 }), async (req, res) => {
    try {
        const parsedBody = examFocus_1.ExamFocusGenerateInputSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return res.status(400).json({
                error: 'Invalid exam focus payload',
                details: parsedBody.error.format(),
            });
        }
        const { courseId, title, rawAreasInput, forceRefresh } = parsedBody.data;
        const userId = req.user.id;
        const course = await verifyCourseOwnership(userId, courseId);
        if (!course) {
            return res.status(400).json({ error: 'Valid course required to generate Exam Focus pack.' });
        }
        const targetCourseId = course.id;
        const areas = (0, examFocus_1.parseLecturerAreasInput)(rawAreasInput);
        if (areas.length === 0) {
            return res.status(400).json({ error: 'Enter at least one valid exam area or topic.' });
        }
        const areasHash = (0, examFocus_1.computeAreasHash)(areas);
        const packTitle = title ||
            `${course.course_code || course.title} Exam Focus (${areas.length} ${areas.length === 1 ? 'Area' : 'Areas'})`;
        if (!forceRefresh) {
            try {
                const { data: existingPack, error: existingErr } = await supabase_1.supabaseAdmin
                    .from('exam_focus_packs')
                    .select('id, user_id, course_id, title, raw_areas_input, areas, areas_hash, matched_slides, matched_questions, generated_questions, study_summary, coverage_gaps, created_at, updated_at')
                    .eq('user_id', userId)
                    .in('course_id', Array.from(new Set([targetCourseId, courseId])))
                    .eq('areas_hash', areasHash)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (!existingErr && existingPack) {
                    return res.json({ ...existingPack, cached: true, persisted: true });
                }
            }
            catch {
                // Proceed with fresh scrape if lookup unavailable
            }
        }
        const { slides, questions } = await scrapeCourseContent(userId, course);
        const { matchedSlides, matchedQuestions, coverageGaps } = (0, examFocus_1.matchSlidesAndQuestionsToAreas)({
            areas,
            slides,
            questions,
        });
        const { summaries, aiUsed } = await synthesizePackSummary(userId, course, areas, matchedSlides, matchedQuestions, coverageGaps);
        const now = new Date().toISOString();
        const baseRecord = {
            user_id: userId,
            course_id: targetCourseId,
            title: packTitle,
            raw_areas_input: rawAreasInput,
            areas,
            areas_hash: areasHash,
            matched_slides: matchedSlides,
            matched_questions: matchedQuestions,
            generated_questions: [],
            study_summary: summaries,
            coverage_gaps: coverageGaps,
            created_at: now,
            updated_at: now,
        };
        const { data: inserted, error: insertErr } = await supabase_1.supabaseAdmin
            .from('exam_focus_packs')
            .insert(baseRecord)
            .select('id, user_id, course_id, title, raw_areas_input, areas, areas_hash, matched_slides, matched_questions, generated_questions, study_summary, coverage_gaps, created_at, updated_at')
            .single();
        coursePacksCache.delete(`${userId}:${targetCourseId}`);
        coursePacksCache.delete(`${userId}:${courseId}`);
        if (!insertErr && inserted) {
            return res.json({
                ...inserted,
                ai_synthesized: aiUsed,
                persisted: true,
            });
        }
        if (insertErr && !isMissingTableError(insertErr)) {
            throw insertErr;
        }
        const fallbackId = `local-${(0, crypto_1.randomUUID)()}`;
        const localPack = { id: fallbackId, ...baseRecord, ai_synthesized: aiUsed, persisted: false };
        ephemeralPackStore.set(`${userId}:${targetCourseId}:${fallbackId}`, localPack);
        ephemeralPackStore.set(`${userId}:${courseId}:${fallbackId}`, localPack);
        return res.json(localPack);
    }
    catch (err) {
        console.error('[ExamFocus] Generate pack error:', err);
        return res.status(500).json({ error: 'Failed to generate Exam Focus Pack.' });
    }
});
/**
 * GET /api/exam-focus/:courseId
 * Lists saved Exam Focus Packs for an owned course.
 */
router.get('/:courseId', async (req, res) => {
    try {
        const userId = req.user.id;
        const courseId = String(req.params.courseId);
        const course = await verifyCourseOwnership(userId, courseId);
        if (!course) {
            // Do not return 404 to avoid polluting browser console or breaking frontend transitions
            return res.json([]);
        }
        const resolvedCourseId = course.id;
        const cacheKey = `${userId}:${resolvedCourseId}`;
        const cached = coursePacksCache.get(cacheKey);
        if (cached) {
            res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
            return res.json(cached);
        }
        const courseIds = Array.from(new Set([resolvedCourseId, courseId]));
        const { data, error } = await supabase_1.supabaseAdmin
            .from('exam_focus_packs')
            .select('id, user_id, course_id, title, raw_areas_input, areas, areas_hash, matched_slides, matched_questions, generated_questions, study_summary, coverage_gaps, created_at, updated_at')
            .eq('user_id', userId)
            .in('course_id', courseIds)
            .order('created_at', { ascending: false })
            .limit(20);
        if (error && !isMissingTableError(error)) {
            throw error;
        }
        const packs = Array.isArray(data) ? data : [];
        coursePacksCache.set(cacheKey, packs);
        res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
        return res.json(packs);
    }
    catch (err) {
        console.error('[ExamFocus] List packs error:', err);
        return res.status(500).json({ error: 'Failed to load Exam Focus Packs.' });
    }
});
/**
 * POST /api/exam-focus/:packId/generate-practice
 * Generates targeted MCQ + Theory practice questions grounded in an area's matched slides.
 */
router.post('/:packId/generate-practice', (0, expensiveGuard_1.protectExpensiveEndpoint)({ maxPerMinute: 10, maxConcurrent: 2 }), async (req, res) => {
    try {
        const parsedBody = examFocus_1.ExamFocusPracticeGenerateInputSchema.safeParse(req.body);
        if (!parsedBody.success) {
            return res.status(400).json({ error: 'Invalid area parameter' });
        }
        const userId = req.user.id;
        const packId = String(req.params.packId);
        const { area, courseId: hintCourseId, matchedSlidesFallback } = parsedBody.data;
        let pack = null;
        let isPersisted = false;
        if (!packId.startsWith('local-')) {
            const { data, error } = await supabase_1.supabaseAdmin
                .from('exam_focus_packs')
                .select('id, user_id, course_id, matched_slides, matched_questions, generated_questions')
                .eq('id', packId)
                .eq('user_id', userId)
                .maybeSingle();
            if (!error && data) {
                pack = data;
                isPersisted = true;
            }
        }
        else if (hintCourseId) {
            pack = ephemeralPackStore.get(`${userId}:${hintCourseId}:${packId}`);
        }
        const resolvedCourseId = pack?.course_id || hintCourseId;
        if (!resolvedCourseId) {
            return res.status(404).json({ error: 'Exam Focus Pack not found.' });
        }
        const course = await verifyCourseOwnership(userId, resolvedCourseId);
        if (!course) {
            return res.status(404).json({ error: 'Course not found or access denied.' });
        }
        const areaSlides = (pack?.matched_slides ||
            matchedSlidesFallback ||
            []).filter((s) => s.area.toLowerCase() === area.toLowerCase());
        const areaExistingQs = (pack?.matched_questions || []).filter((q) => q.area.toLowerCase() === area.toLowerCase());
        let practiceQuestions = (0, examFocus_1.buildDeterministicGapPracticeQuestions)(area, areaSlides);
        const quota = await (0, quota_1.checkUserQuota)(userId, 'exam_focus', 'default');
        if (quota.allowed) {
            const prompt = (0, examFocus_1.buildGapPracticeQuestionsPrompt)({
                area,
                courseCode: course.course_code || 'COURSE',
                courseTitle: course.title,
                slides: areaSlides,
                existingQuestions: areaExistingQs,
            });
            const raw = await generateJsonWithGeminiOrFallback(prompt, 0.15);
            if (raw) {
                practiceQuestions = (0, examFocus_1.parseGapPracticeQuestionsJson)(raw, {
                    area,
                    validSlideNumbers: areaSlides.map((s) => s.slide_number),
                    courseTitle: course.title,
                    slides: areaSlides,
                });
                void (0, quota_1.consumeUserQuota)(userId, 'exam_focus', 'default').catch(() => { });
            }
        }
        const existingGenerated = Array.isArray(pack?.generated_questions) ? pack.generated_questions : [];
        const updatedGenerated = [
            ...existingGenerated.filter((entry) => String(entry?.area || '').toLowerCase() !== area.toLowerCase()),
            {
                area,
                questions: practiceQuestions,
                created_at: new Date().toISOString(),
            },
        ];
        if (isPersisted && pack?.id) {
            await supabase_1.supabaseAdmin
                .from('exam_focus_packs')
                .update({
                generated_questions: updatedGenerated,
                updated_at: new Date().toISOString(),
            })
                .eq('id', pack.id)
                .eq('user_id', userId);
            coursePacksCache.delete(`${userId}:${course.id}`);
        }
        else if (pack) {
            pack.generated_questions = updatedGenerated;
            ephemeralPackStore.set(`${userId}:${course.id}:${packId}`, pack);
        }
        return res.json({
            area,
            questions: practiceQuestions,
            generated_questions: updatedGenerated,
        });
    }
    catch (err) {
        console.error('[ExamFocus] Practice question generation error:', err);
        return res.status(500).json({ error: 'Failed to generate targeted practice questions.' });
    }
});
/**
 * POST /api/exam-focus/:packId/refresh
 * Re-scrapes newly uploaded lecture slides and past papers for an existing saved pack.
 */
router.post('/:packId/refresh', (0, expensiveGuard_1.protectExpensiveEndpoint)({ maxPerMinute: 10, maxConcurrent: 2 }), async (req, res) => {
    try {
        const userId = req.user.id;
        const packId = String(req.params.packId);
        const { data: existing, error } = await supabase_1.supabaseAdmin
            .from('exam_focus_packs')
            .select('id, user_id, course_id, title, raw_areas_input, areas, areas_hash, generated_questions')
            .eq('id', packId)
            .eq('user_id', userId)
            .maybeSingle();
        if (error || !existing) {
            return res.status(404).json({ error: 'Saved Exam Focus Pack not found.' });
        }
        const course = await verifyCourseOwnership(userId, existing.course_id);
        if (!course) {
            return res.status(404).json({ error: 'Course not found.' });
        }
        const areas = Array.isArray(existing.areas)
            ? existing.areas
            : (0, examFocus_1.parseLecturerAreasInput)(existing.raw_areas_input || '');
        const { slides, questions } = await scrapeCourseContent(userId, course);
        const { matchedSlides, matchedQuestions, coverageGaps } = (0, examFocus_1.matchSlidesAndQuestionsToAreas)({
            areas,
            slides,
            questions,
        });
        const { summaries, aiUsed } = await synthesizePackSummary(userId, course, areas, matchedSlides, matchedQuestions, coverageGaps);
        const { data: updated, error: updErr } = await supabase_1.supabaseAdmin
            .from('exam_focus_packs')
            .update({
            matched_slides: matchedSlides,
            matched_questions: matchedQuestions,
            study_summary: summaries,
            coverage_gaps: coverageGaps,
            updated_at: new Date().toISOString(),
        })
            .eq('id', packId)
            .eq('user_id', userId)
            .select('id, user_id, course_id, title, raw_areas_input, areas, areas_hash, matched_slides, matched_questions, generated_questions, study_summary, coverage_gaps, created_at, updated_at')
            .single();
        if (updErr)
            throw updErr;
        coursePacksCache.delete(`${userId}:${course.id}`);
        return res.json({ ...updated, ai_synthesized: aiUsed, persisted: true });
    }
    catch (err) {
        console.error('[ExamFocus] Refresh pack error:', err);
        return res.status(500).json({ error: 'Failed to refresh Exam Focus Pack.' });
    }
});
/**
 * DELETE /api/exam-focus/:packId
 * Owner-scoped deletion of a saved Exam Focus Pack.
 */
router.delete('/:packId', async (req, res) => {
    try {
        const userId = req.user.id;
        const packId = String(req.params.packId);
        const { data: deleted, error } = await supabase_1.supabaseAdmin
            .from('exam_focus_packs')
            .delete()
            .eq('id', packId)
            .eq('user_id', userId)
            .select('course_id')
            .maybeSingle();
        if (error && !isMissingTableError(error)) {
            throw error;
        }
        if (deleted?.course_id) {
            coursePacksCache.delete(`${userId}:${deleted.course_id}`);
        }
        else {
            coursePacksCache.invalidatePrefix(`${userId}:`);
        }
        return res.json({ success: true });
    }
    catch (err) {
        console.error('[ExamFocus] Delete pack error:', err);
        return res.status(500).json({ error: 'Failed to delete Exam Focus Pack.' });
    }
});
exports.default = router;
