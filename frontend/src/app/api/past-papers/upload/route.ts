import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v2 as cloudinary } from 'cloudinary';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_CANDIDATE_MODELS } from '../../../../../../shared/constants/aiModels';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for PDF processing

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || 'dtauhhlve',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadPdfBufferToCloudinary(buffer: Buffer, publicId: string): Promise<string | null> {
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return null;
  }
  return new Promise((resolve) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'unistudy_past_papers',
        resource_type: 'raw',
        public_id: publicId.replace(/[^a-zA-Z0-9_-]/g, '_'),
        format: 'pdf',
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          console.warn('[uploadPdfBufferToCloudinary] Cloudinary error:', error.message);
          resolve(null);
        } else {
          resolve(result?.secure_url || null);
        }
      }
    );
    stream.end(buffer);
  });
}

async function extractQuestionsWithGemini(pdfBuffer: Buffer, courseCode: string): Promise<any[]> {
  if (!process.env.GEMINI_API_KEY) {
    return [];
  }

  const base64Data = pdfBuffer.toString('base64');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const prompt = `You are an academic exam parser. Read this university past examination paper PDF for course ${courseCode}.
Extract every distinct examination question, including sub-questions (e.g. 1a, 1b, 2, 3), and return strictly valid JSON matching this schema:
[
  {
    "question_number": "1",
    "text_content": "Full question text including any formulas, instructions, or scenarios",
    "extracted_topic": "THEORY|Specific Topic Name",
    "marks_available": 10
  }
]
Constraints:
- Return ONLY the JSON array, with no Markdown ticks, no preamble, and no explanation.
- If there are multiple choice questions, set extracted_topic to "MCQ|Topic Name".
- Extract between 5 and 30 questions based on what is in the paper.`;

  for (const modelName of GEMINI_CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([
        {
          inlineData: {
            data: base64Data,
            mimeType: 'application/pdf',
          },
        },
        { text: prompt },
      ]);

      const text = result.response.text().trim();
      const cleanJson = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (err: any) {
      console.warn(`[extractQuestionsWithGemini] Model ${modelName} warning:`, err.message);
    }
  }

  return [];
}

export async function POST(req: NextRequest) {
  let createdPaperId: string | null = null;
  const supabase = await createClient();

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const incomingCourseCode = (formData.get('courseCode') as string || '').trim();
    const incomingCourseName = (formData.get('courseName') as string || '').trim();
    const yearStr = (formData.get('year') as string || '').trim();
    const examType = (formData.get('examType') as string || 'end-semester').trim();
    const incomingCourseId = formData.get('courseId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No examination PDF file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    let courseId = incomingCourseId && incomingCourseId !== 'new' ? incomingCourseId : null;
    let resolvedCourseCode = incomingCourseCode;
    let resolvedCourseName = incomingCourseName;

    // 1. Resolve or verify existing course
    if (courseId) {
      const { data: cData } = await supabase
        .from('courses')
        .select('id, course_code, title')
        .eq('id', courseId)
        .maybeSingle();

      if (cData) {
        resolvedCourseCode = resolvedCourseCode || cData.course_code || 'EXAM';
        resolvedCourseName = resolvedCourseName || cData.title;
      }
    }

    // 2. If no course ID, search user courses by code or create new course
    if (!courseId) {
      const normalizedCode = (resolvedCourseCode || 'GEN101').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const { data: existingCourse } = await supabase
        .from('courses')
        .select('id, course_code, title')
        .eq('user_id', user.id)
        .ilike('course_code', resolvedCourseCode || normalizedCode)
        .maybeSingle();

      if (existingCourse) {
        courseId = existingCourse.id;
        resolvedCourseCode = existingCourse.course_code;
        resolvedCourseName = resolvedCourseName || existingCourse.title;
      } else {
        const { data: newCourse, error: cErr } = await supabase
          .from('courses')
          .insert({
            course_code: resolvedCourseCode || normalizedCode,
            title: resolvedCourseName || resolvedCourseCode || normalizedCode,
            semester: 1,
            year: parseInt(yearStr, 10) || new Date().getFullYear(),
            user_id: user.id,
            colour: '#00004E',
          })
          .select('id, course_code, title')
          .single();

        if (cErr) throw cErr;
        courseId = newCourse.id;
        resolvedCourseCode = newCourse.course_code;
        resolvedCourseName = newCourse.title;
      }
    }

    // 3. Normalize Exam Details
    const normalizedExamType =
      examType === 'mid-semester' || examType === 'Midterm'
        ? 'mid-semester'
        : examType === 'resit'
        ? 'resit'
        : 'end-semester';

    const examTypeLabel =
      normalizedExamType === 'mid-semester' ? 'Midterm' : normalizedExamType === 'resit' ? 'Resit' : 'Final';

    const paperYear = parseInt(yearStr, 10) || new Date().getFullYear();
    const normalizedCode = (resolvedCourseCode || 'EXAM').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const paperTitle = `${resolvedCourseCode} - ${paperYear} ${examTypeLabel} Exam`;

    // 4. Deduplication Check
    const { data: existingPaper } = await supabase
      .from('past_papers')
      .select('id, title')
      .or(`course_id.eq.${courseId},normalized_course_code.eq.${normalizedCode}`)
      .eq('year', paperYear)
      .eq('exam_type', normalizedExamType)
      .maybeSingle();

    if (existingPaper) {
      return NextResponse.json(
        {
          error: `A past paper for ${resolvedCourseCode} (${paperYear} ${examTypeLabel} Exam) already exists in your course bank.`,
          paperId: existingPaper.id,
        },
        { status: 409 }
      );
    }

    // 5. Upload PDF file to Cloudinary in background / parallel
    const publicId = `paper_${user.id}_${normalizedCode}_${paperYear}_${normalizedExamType}_${Date.now()}`;
    const fileUrl = await uploadPdfBufferToCloudinary(pdfBuffer, publicId);

    // 6. Create DB record in past_papers
    const { data: paper, error: pErr } = await supabase
      .from('past_papers')
      .insert({
        user_id: user.id,
        course_id: courseId,
        title: paperTitle,
        year: paperYear,
        exam_type: normalizedExamType,
        status: 'ready',
        course_code: resolvedCourseCode,
        normalized_course_code: normalizedCode,
        shared_to_community: false,
      })
      .select()
      .single();

    if (pErr) throw pErr;
    createdPaperId = paper.id;

    // Save Cloudinary PDF URL in past_paper_pages table
    if (fileUrl) {
      await supabase.from('past_paper_pages').insert({
        past_paper_id: paper.id,
        paper_id: paper.id,
        page_number: 1,
        image_url: fileUrl,
      });
    }

    // 7. Extract Questions using Gemini Multimodal Vision / PDF Reading
    let extractedQuestions = await extractQuestionsWithGemini(pdfBuffer, resolvedCourseCode);

    if (extractedQuestions.length === 0) {
      // Fallback default questions so student can immediately practice and drill with AI
      extractedQuestions = [
        {
          question_number: '1',
          text_content: `General Examination Questions (${paperTitle})\n\nThis paper was uploaded as a PDF document. You can practice with the AI Tutor on the core syllabus concepts for ${resolvedCourseCode}.`,
          extracted_topic: 'THEORY|General Course Concepts',
          marks_available: 20,
        },
      ];
    }

    // 8. Insert extracted questions into past_paper_questions
    const dbQuestions = extractedQuestions.map((q: any, i: number) => ({
      past_paper_id: paper.id,
      question_number: String(q.question_number || i + 1),
      text_content: String(q.text_content || 'Examination Question'),
      extracted_topic: String(q.extracted_topic || 'THEORY|Core Concepts'),
      marks_available: Number(q.marks_available || 10),
    }));

    const { error: qErr } = await supabase.from('past_paper_questions').insert(dbQuestions);
    if (qErr) {
      console.warn('[POST /api/past-papers/upload] Questions insert notice:', qErr.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Past examination paper uploaded and indexed successfully!',
      paper,
    });
  } catch (err: any) {
    console.error('[POST /api/past-papers/upload] Error:', err);
    if (createdPaperId) {
      try {
        await supabase.from('past_papers').delete().eq('id', createdPaperId);
      } catch {
        // cleanup notice
      }
    }
    return NextResponse.json(
      { error: err.message || 'Failed to upload and process past paper' },
      { status: 500 }
    );
  }
}
