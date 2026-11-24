"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractQuestionsFromPdfBuffer = extractQuestionsFromPdfBuffer;
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const generative_ai_1 = require("@google/generative-ai");
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const safeGroq_1 = require("../lib/ai/safeGroq");
const aiModels_1 = require("../../../shared/constants/aiModels");
const pastPaperGrader_1 = require("../../../shared/lib/pastPaperGrader");
const pastPaperTitle_1 = require("../../../shared/lib/pastPaperTitle");
const router = (0, express_1.Router)();
const auth_1 = require("../middleware/auth");
const quotaGuard_1 = require("../middleware/quotaGuard");
const quota_1 = require("../lib/ai/quota");
const router_1 = require("../lib/ai/router");
const courseQuestionBanks_1 = require("../services/courseQuestionBanks");
const moodleCrawler_1 = require("../services/moodleCrawler");
router.use(auth_1.authenticateUser);
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const [profileRes, coursesRes] = await Promise.all([
            supabase_1.supabaseAdmin
                .from('profiles')
                .select('institution_id')
                .eq('id', userId)
                .single(),
            supabase_1.supabaseAdmin
                .from('courses')
                .select('id, course_code, title, colour')
                .eq('user_id', userId),
        ]);
        const institutionId = profileRes.data?.institution_id || null;
        const userCourses = coursesRes.data;
        // If student has no courses created on their system, return empty
        if (!userCourses || userCourses.length === 0) {
            return res.json([]);
        }
        // 2. Ensure each enrolled course has past question papers ready strictly for these courses
        try {
            await (0, courseQuestionBanks_1.ensurePastPapersForUserCourses)(userId, userCourses, institutionId);
        }
        catch (seedErr) {
            console.warn('[Past Papers] Error ensuring course question banks:', seedErr);
        }
        const userCourseIds = userCourses.map((c) => c.id);
        const userNormalizedCodes = userCourses.map((c) => (c.course_code || c.title || '').toUpperCase().replace(/[^A-Z0-9]/g, '')).filter(Boolean);
        // 3. Query papers strictly belonging to this user's created courses
        const { data, error } = await supabase_1.supabaseAdmin
            .from('past_papers')
            .select('id, title, year, exam_type, status, course_id, course_code, normalized_course_code, institution_id, created_at, courses(id, course_code, title, colour), past_paper_questions(id, question_number, text_content, extracted_topic, marks_available)')
            .or(`course_id.in.(${userCourseIds.join(',')}),user_id.eq.${userId}`)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        const filtered = (data || []).filter((p) => {
            if (p.course_id && userCourseIds.includes(p.course_id))
                return true;
            const pCode = (p.normalized_course_code || p.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            return pCode && userNormalizedCodes.includes(pCode);
        });
        const formatted = filtered.map((p) => {
            const courseJoin = Array.isArray(p.courses) ? p.courses[0] : p.courses;
            const matchingUserCourse = userCourses.find((c) => {
                if (p.course_id && p.course_id === c.id)
                    return true;
                const pCode = (p.normalized_course_code || p.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                const cCode = (c.course_code || c.title || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
                return pCode && cCode && (pCode === cCode || pCode.includes(cCode) || cCode.includes(pCode));
            });
            const resolvedCourse = matchingUserCourse || courseJoin;
            const questions = p.past_paper_questions || [];
            const safeCode = (0, pastPaperTitle_1.resolveDisplayCourseCode)({
                courseCode: p.course_code,
                joinedCourseCode: resolvedCourse?.course_code,
                normalizedCode: p.normalized_course_code,
                paperTitle: p.title,
                courseTitle: resolvedCourse?.title,
                fallback: 'EXAM',
            });
            return {
                id: p.id,
                course_id: resolvedCourse?.id || p.course_id,
                course_code: safeCode,
                normalized_course_code: safeCode.replace(/[^A-Z0-9]/g, ''),
                title: p.title || `${p.year || ''} ${p.exam_type === 'end-semester' ? 'Final Exam' : 'Midterm Exam'}`,
                year: p.year || new Date().getFullYear(),
                exam_type: p.exam_type || 'end-semester',
                status: p.status,
                created_at: p.created_at,
                download_url: `/api/v1/past-questions/download?id=${p.id}`,
                courses: resolvedCourse ? {
                    id: resolvedCourse.id,
                    course_code: safeCode,
                    title: resolvedCourse.title,
                    colour: resolvedCourse.colour
                } : null,
                question_count: questions.length,
                questions: questions.map((q) => ({
                    id: q.id,
                    question: q.text_content,
                    options: ['Option A', 'Option B', 'Option C', 'Option D'],
                    correct_answer: 0,
                    explanation: q.extracted_topic
                }))
            };
        });
        res.json(formatted);
    }
    catch (err) {
        console.error('[Past Papers GET /] Error:', err);
        res.status(500).json({ error: 'Failed to retrieve past papers' });
    }
});
router.get('/download', async (req, res) => {
    try {
        const userId = req.user.id;
        const paperId = req.query.id || req.query.paperId;
        const convert = req.query.convert === 'true';
        if (!paperId) {
            return res.status(400).json({ error: 'Missing past question paper id (?id=...)' });
        }
        // KLOK stream support for official campus past questions
        const isKlokId = paperId.startsWith('L0') || paperId.length > 50 || !paperId.includes('-');
        if (isKlokId) {
            try {
                const KLOK_BASE_URL = process.env.KLOK_BASE_URL || 'https://kloksearch.vercel.app';
                const KLOK_API_KEY = process.env.KLOK_API_KEY || 'klok_live_ddbeef2ccb5ed98dd45873c1d35060c4';
                const klokRes = await fetch(`${KLOK_BASE_URL}/api/v1/past-questions/download?id=${encodeURIComponent(paperId)}&download=1`, {
                    headers: { 'x-klok-api-key': KLOK_API_KEY }
                });
                if (klokRes.ok) {
                    const contentType = klokRes.headers.get('content-type') || 'application/pdf';
                    const buffer = Buffer.from(await klokRes.arrayBuffer());
                    res.setHeader('Content-Type', contentType);
                    res.setHeader('Content-Disposition', `inline; filename="past-question-${encodeURIComponent(paperId)}.pdf"`);
                    return res.send(buffer);
                }
            }
            catch (kErr) {
                console.warn('[download] KLOK fetch error:', kErr.message);
            }
        }
        const { data: paper, error } = await supabase_1.supabaseAdmin
            .from('past_papers')
            .select('*, courses(id, course_code, title, colour), past_paper_questions(*)')
            .eq('id', paperId)
            .eq('user_id', userId)
            .maybeSingle();
        if (error || !paper) {
            return res.status(404).json({ error: 'Past question paper not found or access denied' });
        }
        const questions = Array.isArray(paper.past_paper_questions)
            ? [...paper.past_paper_questions].sort((a, b) => String(a.question_number).localeCompare(String(b.question_number), undefined, { numeric: true }))
            : [];
        if (convert) {
            const formattedText = questions
                .map((q) => `Question ${q.question_number}: ${q.text_content}`)
                .join('\n\n');
            return res.json({
                success: true,
                id: paper.id,
                title: paper.title,
                course_code: paper.course_code,
                year: paper.year,
                exam_type: paper.exam_type,
                text_content: formattedText,
                questions: questions.map((q) => ({
                    id: q.id,
                    question_number: q.question_number,
                    text_content: q.text_content,
                    extracted_topic: q.extracted_topic,
                    marks_available: q.marks_available,
                })),
            });
        }
        if (paper.file_url) {
            try {
                const pdfBuffer = await (0, moodleCrawler_1.downloadMoodleFileWithToken)(paper.file_url, 'd47af8abe6b5d925a0be01c2e64a49e6');
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(paper.title || 'past-question')}.pdf"`);
                return res.send(pdfBuffer);
            }
            catch (dlErr) {
                console.warn('[download] Notice streaming file_url via proxy:', dlErr.message);
            }
        }
        const formattedText = questions
            .map((q) => `Question ${q.question_number}: ${q.text_content}`)
            .join('\n\n');
        return res.json({
            id: paper.id,
            title: paper.title,
            course_code: paper.course_code,
            year: paper.year,
            exam_type: paper.exam_type,
            text_content: formattedText,
            questions,
        });
    }
    catch (err) {
        console.error('[Past Papers GET /download] Error:', err);
        res.status(500).json({ error: 'Failed to download past question' });
    }
});
function extractCourseCodeFromName(name) {
    if (!name)
        return 'EXAM';
    const m = name.match(/([A-Z]{3,4}\s*\d{3})/i);
    return m ? m[1].toUpperCase().replace(/\s+/, ' ') : 'EXAM';
}
function parseYearFromName(val) {
    if (typeof val === 'number')
        return val;
    if (!val)
        return new Date().getFullYear();
    const m = String(val).match(/(\d{4})/);
    return m ? parseInt(m[1], 10) : new Date().getFullYear();
}
router.get('/:id', async (req, res) => {
    try {
        const paperId = req.params.id;
        const userId = req.user.id;
        // 1. If paperId is a base64 encoded KLOK paper ID
        const isKlokId = paperId.startsWith('L0') || paperId.length > 50 || !paperId.includes('-');
        if (isKlokId) {
            try {
                let decodedPath = '';
                try {
                    decodedPath = Buffer.from(paperId, 'base64').toString('utf-8');
                }
                catch (_) {
                    decodedPath = paperId;
                }
                const pathParts = decodedPath.split(/[\/\\]/);
                const filename = pathParts[pathParts.length - 1] || 'Past Examination Paper';
                const cleanTitle = filename.replace(/\.pdf$/i, '').trim();
                const detectedCode = extractCourseCodeFromName(cleanTitle);
                // Fetch user courses to find match
                const { data: userCourses } = await supabase_1.supabaseAdmin
                    .from('courses')
                    .select('id, course_code, title, colour')
                    .eq('user_id', userId);
                const cleanCodeOnly = detectedCode.replace(/\s+/g, '').toUpperCase();
                const matchingCourse = (userCourses || []).find((c) => {
                    const cCodeClean = (c.course_code || '').replace(/\s+/g, '').toUpperCase();
                    return cCodeClean && (cCodeClean === cleanCodeOnly || cleanTitle.toUpperCase().includes(cCodeClean));
                });
                const isMidterm = cleanTitle.toLowerCase().includes('mid') || cleanTitle.toLowerCase().includes('interim');
                const courseCode = matchingCourse?.course_code || detectedCode;
                return res.json({
                    id: paperId,
                    course_id: matchingCourse ? matchingCourse.id : null,
                    course_code: courseCode,
                    normalized_course_code: courseCode.replace(/[^A-Z0-9]/g, ''),
                    title: cleanTitle,
                    year: parseYearFromName(cleanTitle),
                    exam_type: isMidterm ? 'mid-semester' : 'end-semester',
                    status: 'ready',
                    created_at: new Date().toISOString(),
                    download_url: `/api/v1/past-questions/download?id=${encodeURIComponent(paperId)}`,
                    source: 'klok',
                    courses: matchingCourse ? {
                        id: matchingCourse.id,
                        course_code: matchingCourse.course_code,
                        title: matchingCourse.title,
                        colour: matchingCourse.colour || '#00004E',
                    } : {
                        id: 'official',
                        course_code: courseCode,
                        title: cleanTitle,
                        colour: '#00004E',
                    },
                    past_paper_questions: [],
                    questions: [],
                });
            }
            catch (kErr) {
                console.warn('[Past Papers GET /:id] KLOK resolution error:', kErr.message);
            }
        }
        // 2. Query Supabase for custom uploaded past papers
        const { data: paper, error } = await supabase_1.supabaseAdmin
            .from('past_papers')
            .select('*, courses(id, course_code, title, colour), past_paper_questions(*)')
            .eq('id', paperId)
            .eq('user_id', userId)
            .maybeSingle();
        if (error)
            throw error;
        if (!paper) {
            return res.status(404).json({ error: 'Past paper not found' });
        }
        // Sort questions numerically
        if (Array.isArray(paper.past_paper_questions)) {
            paper.past_paper_questions.sort((a, b) => String(a.question_number).localeCompare(String(b.question_number), undefined, { numeric: true }));
        }
        res.json(paper);
    }
    catch (err) {
        console.error('[Past Papers GET /:id] Error:', err);
        res.status(500).json({ error: 'Failed to retrieve past paper details' });
    }
});
router.post('/:id/extract', async (req, res) => {
    try {
        const paperId = req.params.id;
        const { data: existing } = await supabase_1.supabaseAdmin
            .from('past_paper_questions')
            .select('*')
            .eq('past_paper_id', paperId);
        if (existing && existing.length > 0) {
            return res.json({ success: true, cached: true, questions: existing });
        }
        return res.json({ success: true, cached: false, questions: [] });
    }
    catch (err) {
        res.status(500).json({ error: err?.message || 'Failed to extract questions' });
    }
});
router.post('/sync-moodle', async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await (0, moodleCrawler_1.syncRealMoodlePastPapers)(userId, req.body);
        res.json(result);
    }
    catch (err) {
        console.error('[Past Papers POST /sync-moodle] Error:', err);
        res.status(500).json({ error: err?.message || 'Failed to sync with UPSA Virtual Portal' });
    }
});
const multer_1 = __importDefault(require("multer"));
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
async function extractQuestionsFromPdfBuffer(fileBuffer) {
    try {
        const parseFn = typeof pdf_parse_1.default === 'function' ? pdf_parse_1.default : pdf_parse_1.default.default || pdf_parse_1.default;
        let extractedText = '';
        try {
            const data = await parseFn(fileBuffer);
            extractedText = (data && data.text) ? data.text.trim() : '';
        }
        catch (parseErr) {
            console.warn('[Past Papers] pdfParse error (likely scanned/image-based):', parseErr?.message);
        }
        // 1. If digital text is extracted with reasonable length (>= 50 chars), try text completion first
        if (extractedText.length >= 50) {
            try {
                const prompt = `
You are an expert exam analyzer. I am providing you with the extracted raw text from a past exam paper.
Extract all the questions from this exam paper in the EXACT sequential order they appear from top to bottom.
Keep main questions (e.g., Question 1, Question 2, Question 3) grouped together as a SINGLE object. Do NOT split a question into multiple objects for its sub-questions (e.g., do not create separate objects for 1a, 1b). Instead, include the main preamble and all sub-questions beautifully formatted as markdown lists inside the "text_content" of the main question.

CRITICAL INSTRUCTIONS FOR TABLES AND FIGURES:
- If a question contains a table, you MUST convert it into a markdown formatted table within the "text_content".
- If a question contains a figure, image, diagram, or graph, you MUST include a highly detailed descriptive placeholder in the "text_content", for example: "[Figure: A bar chart showing population growth over 10 years]". Do not ignore images!

Return EXACTLY ONE valid JSON object. 
It MUST have a single root key called "questions" which is an array containing objects with the following keys:
- "question_number": (string, the main question number, e.g. "1", "2", "3")
- "question_type": (string, EXACTLY "mcq" for Multiple Choice Questions, or "theory" for Theory/Essay questions)
- "text_content": (string, the full text of the question, including markdown tables and [Figure: ...] descriptions)
- "extracted_topic": (string, a brief 1-3 word topic identifying what the question is about)
- "marks_available": (integer, if stated, otherwise 0)

Raw Extracted Text:
${extractedText}
`;
                const rawJson = await (0, safeGroq_1.chatCompletionWithFallback)({
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' }
                });
                const start = rawJson.indexOf('{');
                const end = rawJson.lastIndexOf('}');
                if (start !== -1 && end !== -1) {
                    const parsed = JSON.parse(rawJson.slice(start, end + 1));
                    if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                        console.log(`[Past Papers] Successfully extracted ${parsed.questions.length} questions via text-based model.`);
                        return parsed.questions;
                    }
                }
            }
            catch (textErr) {
                console.warn('[Past Papers] Text model extraction returned 0 questions or failed, proceeding to vision:', textErr?.message);
            }
        }
        // 2. Scanned or image-based PDF: Use Gemini Multimodal PDF parsing
        console.log(`[Past Papers] Running Multimodal/Vision PDF extraction (text length was ${extractedText.length})...`);
        const base64Pdf = fileBuffer.toString('base64');
        const geminiModels = [...aiModels_1.GEMINI_CANDIDATE_MODELS];
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey) {
            const genAI = new generative_ai_1.GoogleGenerativeAI(geminiKey);
            const visionPrompt = `
You are an expert exam analyzer. I am providing you with the full PDF of a university past exam paper (which may contain scanned pages, handwritten annotations, tables, diagrams, or printed text).
Analyze and extract all questions from this exam paper in the EXACT sequential order they appear from page 1 to the end.
Keep main questions (e.g., Question 1, Question 2, Question 3) grouped together as a SINGLE object. Do NOT split a question into multiple objects for sub-questions (e.g. 1a, 1b). Instead, include all sub-questions and context clearly formatted as markdown lists inside "text_content".

CRITICAL INSTRUCTIONS FOR TABLES AND FIGURES:
- If a question contains a table, transcribe it into a clean markdown table.
- If a question contains a diagram, chart, or figure, describe it concisely in brackets, e.g. [Figure: Circuit diagram with R1 and C1].

Return EXACTLY ONE valid JSON object with a single root key called "questions", an array of objects:
- "question_number": (string, e.g. "1", "2")
- "question_type": ("mcq" or "theory")
- "text_content": (string, full question text and markdown)
- "extracted_topic": (string, 1-3 word topic)
- "marks_available": (integer, default 0)
`;
            for (const modelName of geminiModels) {
                try {
                    const model = genAI.getGenerativeModel({
                        model: modelName,
                        generationConfig: { responseMimeType: 'application/json' }
                    });
                    const result = await model.generateContent([
                        visionPrompt,
                        {
                            inlineData: {
                                data: base64Pdf,
                                mimeType: 'application/pdf'
                            }
                        }
                    ]);
                    const rawResponse = result.response.text();
                    const start = rawResponse.indexOf('{');
                    const end = rawResponse.lastIndexOf('}');
                    if (start !== -1 && end !== -1) {
                        const parsed = JSON.parse(rawResponse.slice(start, end + 1));
                        if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
                            console.log(`[Past Papers] Gemini (${modelName}) successfully extracted ${parsed.questions.length} questions from scanned PDF.`);
                            return parsed.questions;
                        }
                    }
                }
                catch (geminiErr) {
                    console.warn(`[Past Papers] Gemini model ${modelName} failed on PDF:`, geminiErr.message);
                }
            }
        }
    }
    catch (unexpectedErr) {
        console.error('[Past Papers] Unexpected error in extractQuestionsFromPdfBuffer:', unexpectedErr);
    }
    // 3. Fallback: If all else fails, create a default question so the paper remains usable without 500
    console.warn('[Past Papers] Fallback: Could not automatically detect individual questions from PDF. Creating initial document question.');
    return [
        {
            question_number: '1',
            question_type: 'theory',
            text_content: 'Exam Paper (Scanned / Image Document)\n\nThis past paper was uploaded as a scanned or image document. You can review the document and practice answering questions with the AI tutor.',
            extracted_topic: 'GENERAL|Full Exam',
            marks_available: 0
        }
    ];
}
// Upload and OCR extraction
router.post('/upload', upload.single('file'), (0, quotaGuard_1.withAIQuota)('handwriting_scan'), async (req, res) => {
    let createdPaperId = null;
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No PDF file provided" });
        }
        const { courseCode, courseName, year, examType, courseId: incomingCourseId } = req.body;
        let courseId = incomingCourseId || null;
        let resolvedCourseCode = (courseCode || '').trim();
        let resolvedCourseName = (courseName || '').trim();
        // 1. If courseId provided, resolve course details
        if (courseId) {
            const { data: cData } = await supabase_1.supabaseAdmin
                .from('courses')
                .select('id, course_code, title')
                .eq('id', courseId)
                .maybeSingle();
            if (cData) {
                resolvedCourseCode = resolvedCourseCode || cData.course_code;
                resolvedCourseName = resolvedCourseName || cData.title;
            }
        }
        // 2. If no courseId, check if user already has this course by course_code
        if (!courseId) {
            const normalizedCode = (resolvedCourseCode || 'GEN101').toUpperCase();
            const { data: existingCourse } = await supabase_1.supabaseAdmin
                .from('courses')
                .select('id, course_code, title')
                .eq('user_id', req.user.id)
                .ilike('course_code', normalizedCode)
                .maybeSingle();
            if (existingCourse) {
                courseId = existingCourse.id;
                resolvedCourseCode = existingCourse.course_code;
                resolvedCourseName = resolvedCourseName || existingCourse.title;
            }
            else {
                // Create new course for this user in their courses & question bank
                const { data: newCourse, error: cErr } = await supabase_1.supabaseAdmin
                    .from('courses')
                    .insert({
                    course_code: normalizedCode,
                    title: resolvedCourseName || normalizedCode,
                    semester: 1,
                    year: parseInt(year) || new Date().getFullYear(),
                    user_id: req.user.id,
                    colour: '#5B2D8E'
                })
                    .select('id, course_code, title')
                    .single();
                if (cErr)
                    throw cErr;
                courseId = newCourse.id;
                resolvedCourseCode = newCourse.course_code;
                resolvedCourseName = newCourse.title;
            }
        }
        // Normalize exam_type enum: 'mid-semester' | 'end-semester' | 'resit'
        const normalizedExamType = examType === 'mid-semester' || examType === 'Midterm' ? 'mid-semester' :
            examType === 'resit' ? 'resit' : 'end-semester';
        const examTypeLabel = normalizedExamType === 'mid-semester' ? 'Midterm' :
            normalizedExamType === 'resit' ? 'Resit' : 'Final';
        const paperYear = parseInt(year) || new Date().getFullYear();
        const paperTitle = `${resolvedCourseCode} - ${paperYear} ${examTypeLabel} Exam`;
        // 0. Deduplication check: prevent creating duplicate past papers per course
        const normalizedCode = resolvedCourseCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const { data: existingPaper } = await supabase_1.supabaseAdmin
            .from('past_papers')
            .select('id, title')
            .or(`course_id.eq.${courseId},normalized_course_code.eq.${normalizedCode}`)
            .eq('year', paperYear)
            .eq('exam_type', normalizedExamType)
            .maybeSingle();
        if (existingPaper) {
            return res.status(409).json({
                error: `A past paper for ${resolvedCourseCode} (${paperYear} ${examTypeLabel} Exam) already exists in your course bank.`
            });
        }
        // 1. Create the DB record.
        const { data: paper, error: pErr } = await supabase_1.supabaseAdmin
            .from('past_papers')
            .insert({
            user_id: req.user.id,
            course_id: courseId,
            title: paperTitle,
            year: paperYear,
            exam_type: normalizedExamType,
            status: 'ready',
            course_code: resolvedCourseCode,
            normalized_course_code: normalizedCode,
            shared_to_community: false
        })
            .select()
            .single();
        if (pErr)
            throw pErr;
        createdPaperId = paper.id;
        // 2. Real PDF extraction using text + Multimodal Vision fallback
        const extractedQuestions = await extractQuestionsFromPdfBuffer(req.file.buffer);
        // Generate embeddings for the extracted questions (optional)
        let formattedEmbeddings = [];
        try {
            const textsToEmbed = extractedQuestions.map((q) => `Question: ${q.text_content}`);
            const embedReq = {
                task: 'embedding',
                feature: 'search_embedding',
                payload: { texts: textsToEmbed },
                userId: req.user.id,
                priority: 'medium'
            };
            const embedRes = await (0, router_1.routeRequest)(embedReq);
            const rawEmbeddings = embedRes.result;
            if (Array.isArray(rawEmbeddings)) {
                if (rawEmbeddings.length > 0 && typeof rawEmbeddings[0] === 'number') {
                    formattedEmbeddings = [rawEmbeddings];
                }
                else {
                    formattedEmbeddings = rawEmbeddings.map((e) => (Array.isArray(e) && typeof e[0] === 'number') ? e : null);
                }
            }
        }
        catch (embedErr) {
            console.error("Warning: Failed to generate embeddings for past paper questions. Skipping.", embedErr);
        }
        const dbQuestions = extractedQuestions.map((q, i) => {
            const isMcq = q.question_type?.toLowerCase() === 'mcq';
            const emb = formattedEmbeddings[i];
            const hasValidVector = Array.isArray(emb) && emb.length > 0 && typeof emb[0] === 'number';
            return {
                past_paper_id: paper.id,
                question_number: String(q.question_number || (i + 1)),
                text_content: String(q.text_content || 'Unknown Question'),
                extracted_topic: `${isMcq ? 'MCQ' : 'THEORY'}|${String(q.extracted_topic || 'General')}`,
                marks_available: Number(q.marks_available || 0),
                embedding: hasValidVector ? `[${emb.join(',')}]` : null
            };
        });
        const { error: qErr } = await supabase_1.supabaseAdmin
            .from('past_paper_questions')
            .insert(dbQuestions);
        if (qErr)
            throw qErr;
        try {
            await (0, quota_1.consumeUserQuota)(req.user.id, 'handwriting_scan');
        }
        catch (quotaErr) {
            console.warn("Quota deduction skipped or warning:", quotaErr);
        }
        res.json({ success: true, message: "Upload and OCR successful", paper });
    }
    catch (e) {
        console.error("Upload error fully detailed:", e);
        try {
            const fs = require('fs');
            const errDetails = typeof e === 'object'
                ? JSON.stringify(e, Object.getOwnPropertyNames(e), 2)
                : String(e);
            fs.writeFileSync('upload_error.txt', `${new Date().toISOString()}\n${errDetails}`);
        }
        catch (_) { }
        if (createdPaperId) {
            try {
                await supabase_1.supabaseAdmin.from('past_papers').delete().eq('id', createdPaperId);
            }
            catch (delErr) {
                console.error("Failed to cleanup orphaned past paper record:", delErr);
            }
        }
        res.status(500).json({ error: e.message || 'Upload failed', details: process.env.NODE_ENV === 'development' ? (e.stack || e.message) : undefined });
    }
});
// Grade a batch of past paper questions
router.post('/grade-batch', (0, quotaGuard_1.withAIQuota)('past_paper_grading'), async (req, res) => {
    try {
        const { answers, is_ultra, course_id } = req.body;
        if (!answers || !Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({ error: 'Missing or empty answers array' });
        }
        // Pre-fetch contexts for each answer using embeddings
        if (course_id) {
            try {
                const textsToEmbed = answers.map((a) => a.question_content);
                const embedReq = {
                    task: 'embedding',
                    feature: 'search_embedding',
                    payload: { texts: textsToEmbed },
                    userId: req.user.id,
                    priority: 'high'
                };
                const embedRes = await (0, router_1.routeRequest)(embedReq);
                const rawEmbeddings = embedRes.result;
                const embeddings = Array.isArray(rawEmbeddings) ? rawEmbeddings : [];
                for (let i = 0; i < answers.length; i++) {
                    const emb = embeddings[i];
                    const isValidVector = Array.isArray(emb) && emb.length > 0 && typeof emb[0] === 'number';
                    if (isValidVector) {
                        const { data: matches } = await supabase_1.supabaseAdmin.rpc('match_study_content', {
                            query_embedding: `[${emb.join(',')}]`,
                            match_threshold: 0.5,
                            match_count: 3,
                            p_user_id: req.user.id
                        });
                        if (matches) {
                            const relevantSlides = matches.filter((m) => m.content_type === 'slide' && m.course_id === course_id);
                            if (relevantSlides.length > 0) {
                                answers[i].slide_context = relevantSlides.map((s) => `[Slide ${s.slide_number}]: ${s.text_content}`).join('\n\n');
                            }
                        }
                    }
                }
            }
            catch (e) {
                console.error("Failed to fetch context for RAG grading", e);
            }
        }
        // Chunk answers into batches of at most 2 to preserve token headroom,
        // then run targeted single-question repair for any skipped or partial sub-part answers.
        const CHUNK_SIZE = 2;
        const allResults = [];
        for (let i = 0; i < answers.length; i += CHUNK_SIZE) {
            const chunk = answers.slice(i, i + CHUNK_SIZE);
            let rawJsonList = [];
            try {
                const prompt = (0, pastPaperGrader_1.buildPastPaperBatchPrompt)(chunk, Boolean(is_ultra));
                const text = await (0, safeGroq_1.chatCompletionWithFallback)({
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' },
                    temperature: 0.2,
                    max_tokens: 4000
                });
                rawJsonList = (0, pastPaperGrader_1.parsePastPaperJsonResults)(text);
            }
            catch (chunkErr) {
                console.warn('[Past Papers] Chunk grading failed, switching to per-item repair:', chunkErr);
            }
            const { results, incompleteIds } = (0, pastPaperGrader_1.normalizeBatchGradingResults)(chunk, rawJsonList);
            for (const badId of incompleteIds) {
                const sourceItem = chunk.find((c) => c.id === badId);
                if (!sourceItem)
                    continue;
                try {
                    const repairText = await (0, safeGroq_1.chatCompletionWithFallback)({
                        messages: [{ role: 'user', content: (0, pastPaperGrader_1.buildSingleRepairPrompt)(sourceItem, Boolean(is_ultra)) }],
                        response_format: { type: 'json_object' },
                        temperature: 0.2,
                        max_tokens: 3500
                    });
                    const repaired = (0, pastPaperGrader_1.normalizeBatchGradingResults)([sourceItem], (0, pastPaperGrader_1.parsePastPaperJsonResults)(repairText)).results[0];
                    const idxToUpdate = results.findIndex((r) => r.id === badId);
                    if (repaired &&
                        idxToUpdate >= 0 &&
                        (!(0, pastPaperGrader_1.isModelAnswerIncomplete)(sourceItem.question_content, repaired.model_answer) ||
                            repaired.model_answer.length > results[idxToUpdate].model_answer.length)) {
                        results[idxToUpdate] = repaired;
                    }
                }
                catch (repairErr) {
                    console.warn(`[Past Papers] Repair failed for ${badId}:`, repairErr);
                }
            }
            allResults.push(...results);
        }
        await (0, quota_1.consumeUserQuota)(req.user.id, 'past_paper_grading');
        res.json({ success: true, data: allResults });
    }
    catch (err) {
        console.error('Error grading batch:', err);
        res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
});
router.post('/grade', (0, quotaGuard_1.withAIQuota)('past_paper_grading'), async (req, res) => {
    try {
        const { question_content, marks_available, student_answer, is_ultra, course_id } = req.body;
        if (!question_content) {
            return res.status(400).json({ error: 'Missing required question_content' });
        }
        const safeStudentAnswer = typeof student_answer === 'string' && student_answer.trim()
            ? student_answer
            : '[No answer provided]';
        let slide_context = "";
        if (course_id) {
            try {
                const embedReq = {
                    task: 'embedding',
                    feature: 'search_embedding',
                    payload: { texts: [question_content] },
                    userId: req.user.id,
                    priority: 'high'
                };
                const embedRes = await (0, router_1.routeRequest)(embedReq);
                const rawResult = embedRes.result;
                let embeddingVector = null;
                if (Array.isArray(rawResult)) {
                    if (typeof rawResult[0] === 'number') {
                        embeddingVector = rawResult;
                    }
                    else if (Array.isArray(rawResult[0]) && typeof rawResult[0][0] === 'number') {
                        embeddingVector = rawResult[0];
                    }
                }
                if (embeddingVector && embeddingVector.length > 0) {
                    const { data: matches } = await supabase_1.supabaseAdmin.rpc('match_study_content', {
                        query_embedding: `[${embeddingVector.join(',')}]`,
                        match_threshold: 0.5,
                        match_count: 3,
                        p_user_id: req.user.id
                    });
                    if (matches) {
                        const relevantSlides = matches.filter((m) => m.content_type === 'slide' && m.course_id === course_id);
                        if (relevantSlides.length > 0) {
                            slide_context = relevantSlides.map((s) => `[Slide ${s.slide_number}]: ${s.text_content}`).join('\n\n');
                        }
                    }
                }
            }
            catch (e) {
                console.error("Failed to fetch context for RAG single grading", e);
            }
        }
        const singleItem = {
            id: 'single',
            question_content,
            marks_available: Number(marks_available) || 0,
            student_answer: safeStudentAnswer,
            slide_context: slide_context || null,
        };
        const prompt = (0, pastPaperGrader_1.buildSingleRepairPrompt)(singleItem, Boolean(is_ultra));
        let rawResponseText = '';
        try {
            const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            for (const modelName of aiModels_1.GEMINI_CANDIDATE_MODELS) {
                try {
                    const model = genAI.getGenerativeModel({
                        model: modelName,
                        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
                    });
                    const result = await model.generateContent(prompt);
                    const text = result.response.text();
                    if ((0, pastPaperGrader_1.parsePastPaperJsonResults)(text).length > 0) {
                        rawResponseText = text;
                        break;
                    }
                }
                catch (mErr) {
                    console.warn(`Gemini grading model ${modelName} failed:`, mErr.message);
                }
            }
        }
        catch (geminiErr) {
            console.warn('Gemini grading failed, falling back to Groq/OpenRouter:', geminiErr.message);
        }
        if (!rawResponseText) {
            rawResponseText = await (0, safeGroq_1.chatCompletionWithFallback)({
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
                temperature: 0.2,
                max_tokens: 3500
            });
        }
        const parsedList = (0, pastPaperGrader_1.parsePastPaperJsonResults)(rawResponseText);
        if (parsedList.length === 0)
            throw new Error('AI did not return valid JSON');
        const parsedResult = (0, pastPaperGrader_1.normalizeBatchGradingResults)([singleItem], parsedList).results[0];
        await (0, quota_1.consumeUserQuota)(req.user.id, 'past_paper_grading');
        res.json({ success: true, data: parsedResult });
    }
    catch (err) {
        console.error('Error grading:', err);
        res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
});
// Generic chat about a past paper item
router.post('/chat', (0, quotaGuard_1.withAIQuota)('past_paper_question'), async (req, res) => {
    try {
        const { question_content, student_answer, feedback, user_message } = req.body;
        const prompt = `
        You are a tutor discussing a past paper question with a student.
        Question: ${question_content}
        Student's Answer: ${student_answer}
        Feedback given: ${feedback}
        
        The student is now asking: "${user_message}"
        
        Answer their question clearly and concisely.
        `;
        let replyText = "";
        try {
            const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            for (const modelName of aiModels_1.GEMINI_CANDIDATE_MODELS) {
                try {
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt);
                    replyText = result.response.text();
                    if (replyText)
                        break;
                }
                catch (mErr) {
                    console.warn(`Gemini chat model ${modelName} failed:`, mErr.message);
                }
            }
        }
        catch (geminiErr) {
            console.warn('Gemini chat failed, falling back to Groq/OpenRouter:', geminiErr.message);
        }
        if (!replyText) {
            replyText = await (0, safeGroq_1.chatCompletionWithFallback)({
                messages: [{ role: 'user', content: prompt }]
            });
        }
        await (0, quota_1.consumeUserQuota)(req.user.id, 'past_paper_question');
        res.json({ text: replyText });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const paperId = req.params.id;
        // Check ownership
        const { data: paper, error: fetchErr } = await supabase_1.supabaseAdmin
            .from('past_papers')
            .select('id, user_id')
            .eq('id', paperId)
            .maybeSingle();
        if (fetchErr)
            throw fetchErr;
        if (!paper) {
            return res.status(404).json({ error: 'Past paper not found' });
        }
        if (paper.user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized to delete this paper' });
        }
        // Clean up child tables to guarantee zero FK restriction errors
        await Promise.allSettled([
            supabase_1.supabaseAdmin.from('past_paper_questions').delete().eq('past_paper_id', paperId),
            supabase_1.supabaseAdmin.from('past_paper_pages').delete().eq('past_paper_id', paperId),
            supabase_1.supabaseAdmin.from('past_paper_attempts').delete().eq('past_paper_id', paperId),
        ]);
        const { error: delErr } = await supabase_1.supabaseAdmin
            .from('past_papers')
            .delete()
            .eq('id', paperId);
        if (delErr)
            throw delErr;
        res.json({ success: true, message: 'Past paper deleted successfully' });
    }
    catch (err) {
        console.error('Error deleting paper:', err);
        res.status(500).json({ error: err.message || 'Failed to delete past paper', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
});
router.post('/delete-batch', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Missing or empty ids array' });
        }
        // Filter to only papers owned by user (or any if admin)
        let query = supabase_1.supabaseAdmin.from('past_papers').select('id, user_id').in('id', ids);
        if (req.user.role !== 'admin') {
            query = query.eq('user_id', req.user.id);
        }
        const { data: papersToDelete, error: fetchErr } = await query;
        if (fetchErr)
            throw fetchErr;
        if (!papersToDelete || papersToDelete.length === 0) {
            return res.status(404).json({ error: 'No matching papers found to delete' });
        }
        const validIds = papersToDelete.map(p => p.id);
        // Delete child tables
        await Promise.allSettled([
            supabase_1.supabaseAdmin.from('past_paper_questions').delete().in('past_paper_id', validIds),
            supabase_1.supabaseAdmin.from('past_paper_pages').delete().in('past_paper_id', validIds),
            supabase_1.supabaseAdmin.from('past_paper_attempts').delete().in('past_paper_id', validIds),
        ]);
        const { error: delErr } = await supabase_1.supabaseAdmin
            .from('past_papers')
            .delete()
            .in('id', validIds);
        if (delErr)
            throw delErr;
        res.json({ success: true, count: validIds.length });
    }
    catch (err) {
        console.error('Error deleting batch papers:', err);
        res.status(500).json({ error: err.message || 'Failed to delete past papers', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
});
exports.default = router;
