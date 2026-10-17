import { Router } from 'express';
import { supabaseAsUser } from '../lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import pdfParse from 'pdf-parse';
import { chatCompletionWithFallback } from '../lib/ai/safeGroq';

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
        const geminiModels = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'];
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
                const embeddings = embedRes.result || [];

                for (let i = 0; i < answers.length; i++) {
                    const emb = embeddings[i];
                    if (emb) {
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

        const personality = is_ultra 
            ? "You are a STRICT and UNFORGIVING university examiner. Do not offer encouragement or praise. Use pure mark-scheme language."
            : "You are a helpful teaching assistant grading an exam. Be encouraging but accurate.";

        const prompt = `
        ${personality}
        Grade the following answers to exam questions.
        
        CRITICAL INSTRUCTION: If "Lecturer's Slide Context" is provided for a question, you MUST strongly base your grading on that context before considering general factual correctness. Accept factually correct answers if the slides are incomplete, but explicitly reference the slides when applicable (e.g., "According to Slide X...").
        
        ${answers.map((ans: any, idx: number) => `
        --- Item ${idx} (ID: ${ans.id}) ---
        Question: ${ans.question_content}
        Total Marks Available: ${ans.marks_available}
        Student's Answer: ${ans.student_answer}
        ${ans.slide_context ? `\nLecturer's Slide Context (PRIORITIZE THIS):\n${ans.slide_context}` : ''}
        `).join('\n')}
        
        Return EXACTLY ONE valid JSON object. 
        It MUST have a single root key called "results" which is an array containing an object for each item graded, IN THE EXACT SAME ORDER.
        Each object MUST have these keys:
        - "id": (string, the exact ID provided in the item)
        - "marks_awarded": (integer)
        - "feedback": (string)
        - "model_answer": (string, showing the ideal answer based heavily on the slides if available)
        `;

        const text = await chatCompletionWithFallback({
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
        });
        const parsed = JSON.parse(text);
        
        await consumeUserQuota(req.user!.id, 'past_paper_grading');
        res.json({ success: true, data: parsed.results || [] });
    } catch (err: any) {
        console.error('Error grading batch:', err);
        res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
});

router.post('/grade', withAIQuota('past_paper_grading'), async (req, res) => {
    try {
        const { question_content, marks_available, student_answer, is_ultra, course_id } = req.body;
        
        if (!question_content || !student_answer) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

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
                const embedding = embedRes.result?.[0];
                if (embedding) {
                    const { data: matches } = await supabaseAdmin.rpc('match_study_content', {
                        query_embedding: `[${embedding.join(',')}]`,
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

        const personality = is_ultra 
            ? "You are a STRICT and UNFORGIVING university examiner. Do not offer encouragement or praise. Use pure mark-scheme language (e.g. 'Candidate correctly identified X [1 mark] but failed to...')."
            : "You are a helpful teaching assistant grading an exam. Be encouraging but accurate.";

        const prompt = `
        ${personality}
        Grade the following answer to this exam question.
        
        CRITICAL INSTRUCTION: If "Lecturer's Slide Context" is provided, you MUST strongly base your grading on that context before considering general factual correctness. Accept factually correct answers if the slides are incomplete, but explicitly reference the slides when applicable (e.g., "According to Slide X...").
        
        Question: ${question_content}
        Total Marks Available: ${marks_available}
        ${slide_context ? `\nLecturer's Slide Context (PRIORITIZE THIS):\n${slide_context}\n` : ''}
        
        Student's Answer:
        ${student_answer}
        
        Return exactly ONE valid JSON object with these keys:
        - "marks_awarded": (integer)
        - "feedback": (string)
        - "model_answer": (string, showing the ideal answer based heavily on the slides if available)
        `;

        let parsedResult: any = null;
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
            for (const modelName of ['gemini-3.5-flash', 'gemini-3.8-flash']) {
                try {
                    const model = genAI.getGenerativeModel({ model: modelName });
                    const result = await model.generateContent(prompt);
                    const text = result.response.text();
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        parsedResult = JSON.parse(jsonMatch[0]);
                        break;
                    }
                } catch (mErr: any) {
                    console.warn(`Gemini grading model ${modelName} failed:`, mErr.message);
                }
            }
        } catch (geminiErr: any) {
            console.warn('Gemini grading failed, falling back to Groq/OpenRouter:', geminiErr.message);
        }

        if (!parsedResult) {
            const fallbackText = await chatCompletionWithFallback({
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            });
            const jsonMatch = fallbackText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("AI did not return valid JSON");
            parsedResult = JSON.parse(jsonMatch[0]);
        }
        
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
            for (const modelName of ['gemini-3.5-flash', 'gemini-3.8-flash']) {
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
            .select('user_id')
            .eq('id', paperId)
            .single();
            
        if (fetchErr) throw fetchErr;
        if (paper.user_id !== req.user!.id) {
            return res.status(403).json({ error: 'Unauthorized to delete this paper' });
        }

        const { error: delErr } = await supabaseAdmin
            .from('past_papers')
            .delete()
            .eq('id', paperId);
            
        if (delErr) throw delErr;
        
        res.json({ success: true });
    } catch (err: any) {
        console.error('Error deleting paper:', err);
        res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
});

export default router;
