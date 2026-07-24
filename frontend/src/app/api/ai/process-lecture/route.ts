import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/security/adminGuard';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { highCostRatelimit } from '@/lib/ratelimit';

const ProcessLectureSchema = z.object({
  lectureId: z.string().uuid(),
  fileUrl: z.string().url()
});

// Initialize Supabase service client to bypass RLS for inserting slides on the backend
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const authResult = await requireAuth();
    if (!authResult?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authResult.user.id;

    // 2. Rate Limiting (High Cost API)
    // Fallback to IP if we want, but userId is safer for logged-in endpoints
    const { success } = await highCostRatelimit.limit(userId);
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
    }

    // 3. Input Validation
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parseResult = ProcessLectureSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parseResult.error.format() }, { status: 400 });
    }

    const { lectureId, fileUrl } = parseResult.data;

    console.log(`[Process-Lecture] Starting processing for lecture ${lectureId}`);

    // -------------------------------------------------
    // 1️⃣ Ensure the lecture record exists
    // -------------------------------------------------
    // We update the processing status without overwriting the title
    // which contains the original file name.
    const { data: lectureData, error: lectureError } = await supabaseAdmin
      .from('lectures')
      .update({ processing: true })
      .eq('id', lectureId)
      .select()
      .single();

    if (lectureError) {
      console.error('[Process-Lecture] Lecture upsert error:', lectureError);
      throw lectureError;
    }


    // 1. Download the file from Cloudinary
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      throw new Error(`Failed to download file from ${fileUrl}`);
    }
    
    const arrayBuffer = await fileRes.arrayBuffer();
    const base64pdf = Buffer.from(arrayBuffer).toString('base64');
    
    // Default to application/pdf, but allow other types if needed
    const mimeType = fileUrl.toLowerCase().includes('.pptx') 
      ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' 
      : 'application/pdf';

    // 2. Call FastAPI vision endpoint for slide extraction
    // userId was obtained earlier (or 'anonymous')
    const visionPayload = {
      user_id: userId,
      prompt: 'Extract slide text',
      mime_type: fileUrl.toLowerCase().includes('.pptx')
        ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        : 'application/pdf',
      base64pdf,
    };

    const fastapiBase = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
    const visionRes = await fetch(`${fastapiBase}/vision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(visionPayload),
    });
    if (!visionRes.ok) {
      const err = await visionRes.json();
      throw new Error(err.error || 'Failed to extract slides via AI service');
    }
    const visionResult = await visionRes.json();
    // Expect response format { response: string|any, usage: {...} }
    console.log('[Process-Lecture] Vision result raw:', visionResult);
    let slidesJSON;
    const resp = visionResult.response ?? visionResult;
    if (typeof resp === 'string') {
      try {
        let cleanResp = resp.trim();
        if (cleanResp.startsWith('```json')) cleanResp = cleanResp.substring(7);
        if (cleanResp.startsWith('```')) cleanResp = cleanResp.substring(3);
        if (cleanResp.endsWith('```')) cleanResp = cleanResp.substring(0, cleanResp.length - 3);
        slidesJSON = JSON.parse(cleanResp.trim());
      } catch (e) {
        console.error('Failed to parse JSON string from vision response:', e);
        throw new Error('AI service returned invalid JSON for slides');
      }
    } else if (Array.isArray(resp)) {
      // Already an array of slides
      slidesJSON = resp;
    } else if (resp && typeof resp === 'object') {
      // Assume it's already the correct structure
      slidesJSON = resp;
    } else {
      console.error('Unexpected vision response format:', resp);
      throw new Error('AI service returned invalid JSON for slides');
    }
    
    if (!Array.isArray(slidesJSON) || slidesJSON.length === 0) {
      throw new Error('No slides extracted by AI model.');
    }
    console.log(`[Process-Lecture] Extracted ${slidesJSON.length} slides.`);

    // 4. Insert into Supabase 'slides' table
    const placeholderImage = 'https://example.com/placeholder.png'; // default image URL to satisfy NOT NULL constraint
    const slidesToInsert = slidesJSON.map((slide: any) => ({
      lecture_id: lectureId,
      slide_number: slide.slide_number,
      raw_text: slide.raw_text,
      image_url: placeholderImage,
    }));

    const { error: dbError } = await supabaseAdmin
      .from('slides')
      .insert(slidesToInsert);

    if (dbError) {
      console.error('[Process-Lecture] Supabase Insert Error:', dbError);
      throw dbError;
    }

    console.log(`[Process-Lecture] Processing complete for lecture ${lectureId}`);
    return NextResponse.json({ success: true, count: slidesToInsert.length });
  } catch (err: any) {
    console.error('Process Lecture Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
