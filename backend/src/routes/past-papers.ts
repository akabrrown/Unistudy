import { Router } from 'express';
import { supabaseAsUser } from '../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import pdfParse from 'pdf-parse';
import { chatCompletionWithFallback } from '../lib/ai/safeGroq';
import { GEMINI_CANDIDATE_MODELS } from '../../../shared/constants/aiModels';
import {
    buildPastPaperBatchPrompt,
    buildSingleRepairPrompt,
    isModelAnswerIncomplete,
    normalizeBatchGradingResults,
    parsePastPaperJsonResults,
    type PastPaperAnswerInput,
    type PastPaperGradeItem,
} from '../../../shared/lib/pastPaperGrader';

const router = Router();

import { authenticateUser } from '../middleware/auth';
import { withAIQuota } from '../middleware/quotaGuard';
import { consumeUserQuota } from '../lib/ai/quota';
import { AIRequest, routeRequest } from '../lib/ai/router';
router.use(authenticateUser);

import multer from 'multer';
import { supabaseAdmin } from '../lib/supabase';

const upload = multer({ storage: multer.memoryStorage() });

async function extractQuestionsFromPdfBuffer(fileBuffer: Buffer): Promise<any[]> {
    try {
        const parseFn = typeof pdfParse === 'function' ? pdfParse : (pdfParse as any).default || pdfParse;
        let extractedText = '';
        try {
            const data = await parseFn(fileBuffer);
            extractedText = (data && data.text) ? data.text.trim() : '';
        } catch (parseErr: any) {
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
                const rawJson = await chatCompletionWithFallback({
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
            } catch (textErr: any) {
                console.warn('[Past Papers] Text model extraction returned 0 questions or failed, proceeding to vision:', textErr?.message);
            }
        }

        // 2. Scanned or image-based PDF: Use Gemini Multimodal PDF parsing
        console.log(`[Past Papers] Running Multimodal/Vision PDF extraction (text length was ${extractedText.length})...`);
        const base64Pdf = fileBuffer.toString('base64');
        const geminiModels = [...GEMINI_CANDIDATE_MODELS];
        const geminiKey = process.env.GEMINI_API_KEY;

        if (geminiKey) {
            const genAI = new GoogleGenerativeAI(geminiKey);
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
                } catch (geminiErr: any) {
                    console.warn(`[Past Papers] Gemini model ${modelName} failed on PDF:`, geminiErr.message);
                }
            }
        }
    } catch (unexpectedErr: any) {
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
router.post('/upload', upload.single('file'), withAIQuota('handwriting_scan'), async (req: any, res) => {
    let createdPaperId: string | null = null;
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
            const { data: cData } = await supabaseAdmin
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
            const { data: existingCourse } = await supabaseAdmin
                .from('courses')
                .select('id, course_code, title')
                .eq('user_id', req.user!.id)
                .ilike('course_code', normalizedCode)
                .maybeSingle();

            if (existingCourse) {
                courseId = existingCourse.id;
                resolvedCourseCode = existingCourse.course_code;
                resolvedCourseName = resolvedCourseName || existingCourse.title;
            } else {
                // Create new course for this user in their courses & question bank
                const { data: newCourse, error: cErr } = await supabaseAdmin
                    .from('courses')
                    .insert({
                        course_code: normalizedCode,
                        title: resolvedCourseName || normalizedCode,
                        semester: 1,
                        year: parseInt(year) || new Date().getFullYear(),
                        user_id: req.user!.id,
                        colour: '#5B2D8E'
                    })
                    .select('id, course_code, title')
                    .single();
                if (cErr) throw cErr;
                courseId = newCourse.id;
                resolvedCourseCode = newCourse.course_code;
                resolvedCourseName = newCourse.title;
            }
        }

        // Normalize exam_type enum: 'mid-semester' | 'end-semester' | 'resit'
        const normalizedExamType = 
            examType === 'mid-semester' || examType === 'Midterm' ? 'mid-semester' :
            examType === 'resit' ? 'resit' : 'end-semester';
        
        const examTypeLabel = 
            normalizedExamType === 'mid-semester' ? 'Midterm' :
            normalizedExamType === 'resit' ? 'Resit' : 'Final';

        const paperYear = parseInt(year) || new Date().getFullYear();
        const paperTitle = `${resolvedCourseCode} - ${paperYear} ${examTypeLabel} Exam`;

        // 1. Create the DB record.
        const { data: paper, error: pErr } = await supabaseAdmin
            .from('past_papers')
            .insert({
                user_id: req.user!.id,
                course_id: courseId,
                title: paperTitle,
                year: paperYear,
                exam_type: normalizedExamType,
                status: 'ready',
                shared_to_community: false
            })
            .select()
            .single();
            
        if (pErr) throw pErr;
        createdPaperId = paper.id;

        // 2. Real PDF extraction using text + Multimodal Vision fallback
        const extractedQuestions = await extractQuestionsFromPdfBuffer(req.file.buffer);

        // Generate embeddings for the extracted questions (optional)
        let formattedEmbeddings: (number[] | null)[] = [];
        try {
            const textsToEmbed = extractedQuestions.map((q: any) => `Question: ${q.text_content}`);
            const embedReq: AIRequest = {
                task: 'embedding',
                feature: 'search_embedding',
                payload: { texts: textsToEmbed },
                userId: req.user!.id,
                priority: 'medium'
            };
            const embedRes = await routeRequest(embedReq);
            const rawEmbeddings = embedRes.result;
            if (Array.isArray(rawEmbeddings)) {
                if (rawEmbeddings.length > 0 && typeof rawEmbeddings[0] === 'number') {
                    formattedEmbeddings = [rawEmbeddings as number[]];
                } else {
                    formattedEmbeddings = rawEmbeddings.map((e: any) => (Array.isArray(e) && typeof e[0] === 'number') ? e : null);
                }
            }
        } catch (embedErr) {
            console.error("Warning: Failed to generate embeddings for past paper questions. Skipping.", embedErr);
        }

        const dbQuestions = extractedQuestions.map((q: any, i: number) => {
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

        const { error: qErr } = await supabaseAdmin
            .from('past_paper_questions')
            .insert(dbQuestions);
            
        if (qErr) throw qErr;

        try {
            await consumeUserQuota(req.user!.id, 'handwriting_scan');
        } catch (quotaErr) {
            console.warn("Quota deduction skipped or warning:", quotaErr);
        }

        res.json({ success: true, message: "Upload and OCR successful", paper });
    } catch (e: any) {
        console.error("Upload error fully detailed:", e);
        try {
            const fs = require('fs');
            const errDetails = typeof e === 'object'
                ? JSON.stringify(e, Object.getOwnPropertyNames(e), 2)
                : String(e);
            fs.writeFileSync('upload_error.txt', `${new Date().toISOString()}\n${errDetails}`);
        } catch (_) {}
        if (createdPaperId) {
            try {
                await supabaseAdmin.from('past_papers').delete().eq('id', createdPaperId);
            } catch (delErr) {
                console.error("Failed to cleanup orphaned past paper record:", delErr);
            }
        }
        res.status(500).json({ error: e.message || 'Upload failed', details: process.env.NODE_ENV === 'development' ? (e.stack || e.message) : undefined });
    }
});

// Grade a batch of past paper questions
router.post('/grade-batch', withAIQuota('past_paper_grading'), async (req, res) => {
    try {
        const { answers, is_ultra, course_id } = req.body;
        
        if (!answers || !Array.isArray(answers) || answers.length === 0) {
            return res.status(400).json({ error: 'Missing or empty answers array' });
        }

        // Pre-fetch contexts for each answer using embeddings
        if (course_id) {
            try {
                const textsToEmbed = answers.map((a: any) => a.question_content);
                const embedReq: AIRequest = {
                    task: 'embedding',
                    feature: 'search_embedding',
                    payload: { texts: textsToEmbed },
                    userId: req.user!.id,
                    priority: 'high'
                };
                const embedRes = await routeRequest(embedReq);
                const rawEmbeddings = embedRes.result;
                const embeddings = Array.isArray(rawEmbeddings) ? rawEmbeddings : [];

                for (let i = 0; i < answers.length; i++) {
                    const emb = embeddings[i];
                    const isValidVector = Array.isArray(emb) && emb.length > 0 && typeof emb[0] === 'number';
                    if (isValidVector) {
                        const { data: matches } = await supabaseAdmin.rpc('match_study_content', {
                            query_embedding: `[${emb.join(',')}]`,
                            match_threshold: 0.5,
                            match_count: 3,
                            p_user_id: req.user!.id
                        });
                        if (matches) {
                            const relevantSlides = matches.filter((m: any) => m.content_type === 'slide' && m.course_id === course_id);
                            if (relevantSlides.length > 0) {
                                answers[i].slide_context = relevantSlides.map((s: any) => `[Slide ${s.slide_number}]: ${s.text_content}`).join('\n\n');
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch context for RAG grading", e);
            }
        }

        // Chunk answers into batches of at most 2 to preserve token headroom,
        // then run targeted single-question repair for any skipped or partial sub-part answers.
        const CHUNK_SIZE = 2;
        const allResults: PastPaperGradeItem[] = [];

        for (let i = 0; i < answers.length; i += CHUNK_SIZE) {
            const chunk: PastPaperAnswerInput[] = answers.slice(i, i + CHUNK_SIZE);
            let rawJsonList: Record<string, unknown>[] = [];
            try {
                const prompt = buildPastPaperBatchPrompt(chunk, Boolean(is_ultra));
                const text = await chatCompletionWithFallback({
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' },
                    temperature: 0.2,
                    max_tokens: 4000
                });
                rawJsonList = parsePastPaperJsonResults(text);
            } catch (chunkErr) {
                console.warn('[Past Papers] Chunk grading failed, switching to per-item repair:', chunkErr);
            }

            const { results, incompleteIds } = normalizeBatchGradingResults(chunk, rawJsonList);

            for (const badId of incompleteIds) {
                const sourceItem = chunk.find((c) => c.id === badId);
                if (!sourceItem) continue;
                try {
                    const repairText = await chatCompletionWithFallback({
                        messages: [{ role: 'user', content: buildSingleRepairPrompt(sourceItem, Boolean(is_ultra)) }],
                        response_format: { type: 'json_object' },
                        temperature: 0.2,
                        max_tokens: 3500
                    });
                    const repaired = normalizeBatchGradingResults(
                        [sourceItem],
                        parsePastPaperJsonResults(repairText)
                    ).results[0];
                    const idxToUpdate = results.findIndex((r) => r.id === badId);
                    if (
                        repaired &&
                        idxToUpdate >= 0 &&
                        (!isModelAnswerIncomplete(sourceItem.question_content, repaired.model_answer) ||
                            repaired.model_answer.length > results[idxToUpdate].model_answer.length)
                    ) {
                        results[idxToUpdate] = repaired;
                    }
                } catch (repairErr) {
                    console.warn(`[Past Papers] Repair failed for ${badId}:`, repairErr);
                }
            }

            allResults.push(...results);
        }
        
        await consumeUserQuota(req.user!.id, 'past_paper_grading');
        res.json({ success: true, data: allResults });
    } catch (err: any) {
        console.error('Error grading batch:', err);
        res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
});

router.post('/grade', withAIQuota('past_paper_grading'), async (req, res) => {
    try {
        const { question_content, marks_available, student_answer, is_ultra, course_id } = req.body;
        
        if (!question_content) {
            return res.status(400).json({ error: 'Missing required question_content' });
        }
        const safeStudentAnswer =
            typeof student_answer === 'string' && student_answer.trim()
                ? student_answer
                : '[No answer provided]';

        let slide_context = "";
        if (course_id) {
            try {
                const embedReq: AIRequest = {
                    task: 'embedding',
                    feature: 'search_embedding',
                    payload: { texts: [question_content] },
                    userId: req.user!.id,
                    priority: 'high'
                };
                const embedRes = await routeRequest(embedReq);
                const rawResult = embedRes.result;
                let embeddingVector: number[] | null = null;
                if (Array.isArray(rawResult)) {
                    if (typeof rawResult[0] === 'number') {
                        embeddingVector = rawResult as number[];
                    } else if (Array.isArray(rawResult[0]) && typeof rawResult[0][0] === 'number') {
                        embeddingVector = rawResult[0] as number[];
                    }
                }
                if (embeddingVector && embeddingVector.length > 0) {
                    const { data: matches } = await supabaseAdmin.rpc('match_study_content', {
                        query_embedding: `[${embeddingVector.join(',')}]`,
                        match_threshold: 0.5,
                        match_count: 3,
                        p_user_id: req.user!.id
                    });
                    if (matches) {
                        const relevantSlides = matches.filter((m: any) => m.content_type === 'slide' && m.course_id === course_id);
                        if (relevantSlides.length > 0) {
                            slide_context = relevantSlides.map((s: any) => `[Slide ${s.slide_number}]: ${s.text_content}`).join('\n\n');
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to fetch context for RAG single grading", e);
            }
        }

        const singleItem: PastPaperAnswerInput = {
            id: 'single',
            question_content,
            marks_available: Number(marks_available) || 0,
            student_answer: safeStudentAnswer,
            slide_context: slide_context || null,
        };
        const prompt = buildSingleRepairPrompt(singleItem, Boolean(is_ultra));

        let rawResponseText = '';
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
            for (const modelName of GEMINI_CANDIDATE_MODELS) {
                try {
                    const model = genAI.getGenerativeModel({
                        model: modelName,
                        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
                    });
                    const result = await model.generateContent(prompt);
                    const text = result.response.text();
                    if (parsePastPaperJsonResults(text).length > 0) {
                        rawResponseText = text;
                        break;
                    }
                } catch (mErr: any) {
                    console.warn(`Gemini grading model ${modelName} failed:`, mErr.message);
                }
            }
        } catch (geminiErr: any) {
            console.warn('Gemini grading failed, falling back to Groq/OpenRouter:', geminiErr.message);
        }

        if (!rawResponseText) {
            rawResponseText = await chatCompletionWithFallback({
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' },
                temperature: 0.2,
                max_tokens: 3500
            });
        }

        const parsedList = parsePastPaperJsonResults(rawResponseText);
        if (parsedList.length === 0) throw new Error('AI did not return valid JSON');
        const parsedResult = normalizeBatchGradingResults([singleItem], parsedList).results[0];
        
        await consumeUserQuota(req.user!.id, 'past_paper_grading');
        res.json({ success: true, data: parsedResult });
    } catch (err: any) {
        console.error('Error grading:', err);
        res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
});

// Generic chat about a past paper item
router.post('/chat', withAIQuota('past_paper_question'), async (req, res) => {
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
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
            for (const modelName of GEMINI_CANDIDATE_MODELS) {
                try {
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt);
                    replyText = result.response.text();
                    if (replyText) break;
                } catch (mErr: any) {
                    console.warn(`Gemini chat model ${modelName} failed:`, mErr.message);
                }
            }
        } catch (geminiErr: any) {
            console.warn('Gemini chat failed, falling back to Groq/OpenRouter:', geminiErr.message);
        }

        if (!replyText) {
            replyText = await chatCompletionWithFallback({
                messages: [{ role: 'user', content: prompt }]
            });
        }
        
        await consumeUserQuota(req.user!.id, 'past_paper_question');
        res.json({ text: replyText });
    } catch (err: any) {
        res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const paperId = req.params.id;
        
        // Check ownership
        const { data: paper, error: fetchErr } = await supabaseAdmin
            .from('past_papers')
            .select('id, user_id')
            .eq('id', paperId)
            .maybeSingle();
            
        if (fetchErr) throw fetchErr;
        if (!paper) {
            return res.status(404).json({ error: 'Past paper not found' });
        }
        if (paper.user_id !== req.user!.id && req.user!.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized to delete this paper' });
        }

        // Clean up child tables to guarantee zero FK restriction errors
        await Promise.allSettled([
            supabaseAdmin.from('past_paper_questions').delete().eq('past_paper_id', paperId),
            supabaseAdmin.from('past_paper_pages').delete().eq('past_paper_id', paperId),
            supabaseAdmin.from('past_paper_attempts').delete().eq('past_paper_id', paperId),
        ]);

        const { error: delErr } = await supabaseAdmin
            .from('past_papers')
            .delete()
            .eq('id', paperId);
            
        if (delErr) throw delErr;
        
        res.json({ success: true, message: 'Past paper deleted successfully' });
    } catch (err: any) {
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
        let query = supabaseAdmin.from('past_papers').select('id, user_id').in('id', ids);
        if (req.user!.role !== 'admin') {
            query = query.eq('user_id', req.user!.id);
        }
        const { data: papersToDelete, error: fetchErr } = await query;
        if (fetchErr) throw fetchErr;

        if (!papersToDelete || papersToDelete.length === 0) {
            return res.status(404).json({ error: 'No matching papers found to delete' });
        }

        const validIds = papersToDelete.map(p => p.id);

        // Delete child tables
        await Promise.allSettled([
            supabaseAdmin.from('past_paper_questions').delete().in('past_paper_id', validIds),
            supabaseAdmin.from('past_paper_pages').delete().in('past_paper_id', validIds),
            supabaseAdmin.from('past_paper_attempts').delete().in('past_paper_id', validIds),
        ]);

        const { error: delErr } = await supabaseAdmin
            .from('past_papers')
            .delete()
            .in('id', validIds);

        if (delErr) throw delErr;

        res.json({ success: true, count: validIds.length });
    } catch (err: any) {
        console.error('Error deleting batch papers:', err);
        res.status(500).json({ error: err.message || 'Failed to delete past papers', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
});

export default router;
