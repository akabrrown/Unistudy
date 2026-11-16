import axios from 'axios';
import pdfParse from 'pdf-parse';
import { supabaseAdmin } from '../lib/supabase';
import { env } from '../config/env';

/**
 * Processes lecture slides in the background immediately upon upload.
 * Attempts FastAPI / PyMuPDF converter first; falls back seamlessly to
 * Node.js PDF extraction so users never get blocked by cold-starts.
 */
export async function processLectureSlidesInBackground(
  lectureId: string,
  userId: string,
  fileUrl: string
): Promise<void> {
  console.log(`[SlideProcessor] Starting background slide extraction for lecture ${lectureId}`);

  try {
    // 1. Mark lecture as actively processing
    await supabaseAdmin
      .from('lectures')
      .update({ processing: true })
      .eq('id', lectureId);

    const converterBase = (env.CONVERTER_URL || 'http://localhost:8000').trim().replace(/\/+$/, '');
    const secret = (env.CONVERTER_SECRET || 'zT9xK2mP7vL4wQ8rN5bH1jC6dF3gY0').trim();

    let converterStarted = false;

    // 2. Try external Python converter first (PyMuPDF high-res webp slides)
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const formData = new FormData();
        formData.append('lecture_id', String(lectureId));
        formData.append('user_id', String(userId));
        formData.append('file_url', String(fileUrl));

        const convertRes = await fetch(`${converterBase}/convert`, {
          method: 'POST',
          headers: {
            'X-Converter-Secret': secret,
          },
          body: formData,
          signal: AbortSignal.timeout(12000), // 12s per check
        });

        if (convertRes.ok) {
          console.log(`[SlideProcessor] Dispatched lecture ${lectureId} to Python converter on attempt ${attempt}`);
          converterStarted = true;
          break;
        }
      } catch (connErr: any) {
        console.warn(`[SlideProcessor] Python converter attempt ${attempt} unavailable: ${connErr?.message}`);
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    // If external converter accepted the background task, it will handle slide records and set processing: false
    if (converterStarted) {
      return;
    }

    // 3. Fallback: Direct Node.js PDF parsing & slide ingestion
    console.log(`[SlideProcessor] Using in-process Node.js PDF extraction for lecture ${lectureId}`);

    const pdfResponse = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      timeout: 35000,
    });
    const buffer = Buffer.from(pdfResponse.data);

    const pdfData = await pdfParse(buffer);
    const rawPages = (pdfData.text || '').split('\f');
    const cleanPages = rawPages.map((p) => p.trim()).filter(Boolean);
    const totalPages = cleanPages.length > 0 ? cleanPages.length : (pdfData.numpages || 1);

    // Update lecture slide_count
    await supabaseAdmin
      .from('lectures')
      .update({ slide_count: totalPages })
      .eq('id', lectureId);

    // Check if slides were already populated by another worker
    const { data: existingSlides } = await supabaseAdmin
      .from('slides')
      .select('id')
      .eq('lecture_id', lectureId)
      .limit(1);

    if (existingSlides && existingSlides.length > 0) {
      await supabaseAdmin
        .from('lectures')
        .update({ processing: false })
        .eq('id', lectureId);
      return;
    }

    const placeholderImage = 'https://res.cloudinary.com/dwyxspqbe/image/upload/v1721820468/slide_placeholder.webp';
    const pagesToInsert = cleanPages.length > 0 ? cleanPages : [pdfData.text || 'Slide Content'];

    const slideRows = pagesToInsert.map((pageText, idx) => ({
      lecture_id: lectureId,
      slide_number: idx + 1,
      raw_text: pageText || `Slide ${idx + 1}`,
      explanation: `Summary and key concepts for Slide ${idx + 1}.`,
      image_url: placeholderImage,
    }));

    const { error: insertErr } = await supabaseAdmin.from('slides').insert(slideRows);
    if (insertErr) {
      console.error('[SlideProcessor] Error inserting fallback slides:', insertErr);
    } else {
      console.log(`[SlideProcessor] Successfully created ${slideRows.length} slides for lecture ${lectureId}`);
    }

    // Mark processing completed
    await supabaseAdmin
      .from('lectures')
      .update({ processing: false, slide_count: slideRows.length })
      .eq('id', lectureId);
  } catch (err: any) {
    console.error(`[SlideProcessor] Unexpected error processing lecture ${lectureId}:`, err);
    // Never leave lecture stuck in processing state
    try {
      await supabaseAdmin
        .from('lectures')
        .update({ processing: false })
        .eq('id', lectureId);
    } catch {
      // quiet fallback
    }
  }
}
