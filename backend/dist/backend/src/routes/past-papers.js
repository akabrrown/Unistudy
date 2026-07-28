"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const generative_ai_1 = require("@google/generative-ai");
const router = (0, express_1.Router)();
const auth_1 = require("../middleware/auth");
const router_1 = require("../lib/ai/router");
router.use(auth_1.authenticateUser);
const multer_1 = __importDefault(require("multer"));
const supabase_1 = require("../lib/supabase");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Upload and mock OCR extraction
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const { courseCode, courseName, year, examType } = req.body;
        // Lookup or create course to satisfy NOT NULL constraint
        let courseId = null;
        const { data: existingCourse } = await supabase_1.supabaseAdmin
            .from('courses')
            .select('id')
            .eq('course_code', courseCode || 'TEST101')
            .maybeSingle();
        if (existingCourse) {
            courseId = existingCourse.id;
        }
        else {
            const { data: newCourse, error: cErr } = await supabase_1.supabaseAdmin
                .from('courses')
                .insert({
                course_code: courseCode || 'TEST101',
                title: courseName || 'Test Course',
                semester: 1,
                year: parseInt(year) || new Date().getFullYear(),
                user_id: req.user.id
            })
                .select('id')
                .single();
            if (cErr)
                throw cErr;
            courseId = newCourse.id;
        }
        // 1. In reality, upload req.file.buffer to Supabase Storage.
        // For MVP, we just create the DB record.
        const { data: paper, error: pErr } = await supabase_1.supabaseAdmin
            .from('past_papers')
            .insert({
            user_id: req.user.id,
            course_id: courseId, // Satisfy NOT NULL constraint
            title: `${courseCode} - ${year} ${examType}`,
            year: parseInt(year) || new Date().getFullYear(),
            exam_type: examType || 'Final',
            status: 'ready', // Immediately ready for demo
            shared_to_community: false
        })
            .select()
            .single();
        if (pErr)
            throw pErr;
        if (!req.file)
            throw new Error("No PDF file provided");
        // 2. Real PDF extraction using Gemini
        const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
        const prompt = `
You are an expert exam analyzer. I am providing you with a past exam paper in PDF format.
Extract all the questions from this exam paper in the EXACT sequential order they appear from top to bottom.
Do not skip any questions and do not reorder them. Preserve the exact hierarchical numbering (e.g. "1a", "1b", "2").

CRITICAL INSTRUCTIONS FOR TABLES AND FIGURES:
- If a question contains a table, you MUST convert it into a markdown formatted table within the "text_content".
- If a question contains a figure, image, diagram, or graph, you MUST include a highly detailed descriptive placeholder in the "text_content", for example: "[Figure: A bar chart showing population growth over 10 years]". Do not ignore images!

Return EXACTLY ONE valid JSON array. Do not include any other text, markdown formatting, or code blocks.
The array must contain objects with the following keys:
- "question_number": (string, e.g. "1a", "2", "3.1")
- "text_content": (string, the full text of the question, including markdown tables and [Figure: ...] descriptions)
- "extracted_topic": (string, a brief 1-3 word topic identifying what the question is about)
- "marks_available": (integer, if stated, otherwise 0)
`;
        const aiResult = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: req.file.buffer.toString("base64"),
                    mimeType: "application/pdf"
                }
            }
        ]);
        const text = aiResult.response.text();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch)
            throw new Error("AI did not return valid JSON array");
        const extractedQuestions = JSON.parse(jsonMatch[0]);
        // Generate embeddings for the extracted questions
        const textsToEmbed = extractedQuestions.map((q) => `Question: ${q.text_content}`);
        const embedReq = {
            task: 'embedding',
            feature: 'search_embedding',
            payload: { texts: textsToEmbed },
            userId: req.user.id,
            priority: 'medium'
        };
        const embedRes = await (0, router_1.routeRequest)(embedReq);
        const embeddings = embedRes.result || [];
        const dbQuestions = extractedQuestions.map((q, i) => ({
            past_paper_id: paper.id,
            question_number: String(q.question_number || '1'),
            text_content: String(q.text_content || 'Unknown Question'),
            extracted_topic: String(q.extracted_topic || 'General'),
            marks_available: Number(q.marks_available || 0),
            embedding: embeddings[i] ? `[${embeddings[i].join(',')}]` : null
        }));
        const { error: qErr } = await supabase_1.supabaseAdmin
            .from('past_paper_questions')
            .insert(dbQuestions);
        if (qErr)
            throw qErr;
        res.json({ success: true, message: "Upload and OCR successful", paper });
    }
    catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/grade', async (req, res) => {
    try {
        const { question_content, marks_available, student_answer, is_ultra } = req.body;
        if (!question_content || !student_answer) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const personality = is_ultra
            ? "You are a STRICT and UNFORGIVING university examiner. Do not offer encouragement or praise. Use pure mark-scheme language (e.g. 'Candidate correctly identified X [1 mark] but failed to...')."
            : "You are a helpful teaching assistant grading an exam. Be encouraging but accurate.";
        const prompt = `
        ${personality}
        Grade the following answer to this exam question.
        
        Question: ${question_content}
        Total Marks Available: ${marks_available}
        
        Student's Answer:
        ${student_answer}
        
        Return exactly ONE valid JSON object with these keys:
        - "marks_awarded": (integer)
        - "feedback": (string)
        - "model_answer": (string, showing the ideal answer)
        `;
        const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            throw new Error("AI did not return valid JSON");
        res.json({ success: true, data: JSON.parse(jsonMatch[0]) });
    }
    catch (err) {
        console.error('Error grading:', err);
        res.status(500).json({ error: err.message });
    }
});
router.post('/chat', async (req, res) => {
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
        const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        res.json({ text: result.response.text() });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const paperId = req.params.id;
        // Check ownership
        const { data: paper, error: fetchErr } = await supabase_1.supabaseAdmin
            .from('past_papers')
            .select('user_id')
            .eq('id', paperId)
            .single();
        if (fetchErr)
            throw fetchErr;
        if (paper.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized to delete this paper' });
        }
        const { error: delErr } = await supabase_1.supabaseAdmin
            .from('past_papers')
            .delete()
            .eq('id', paperId);
        if (delErr)
            throw delErr;
        res.json({ success: true });
    }
    catch (err) {
        console.error('Error deleting paper:', err);
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
