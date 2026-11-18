import axios from 'axios';
import pdfParse from 'pdf-parse';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { supabaseAdmin } from '../lib/supabase';
import { env } from '../config/env';
import { isRenderableSlideImage } from '../../../shared/lib/slideDedupe';

const activeLectures = new Set<string>();

export function isLectureProcessingInFlight(lectureId: string): boolean {
  return activeLectures.has(lectureId);
}

/**
 * Cloudinary dynamic transformation:
 * Renders any PDF page on-demand as a crisp, fast-loading, cached CDN image.
 */
function getCloudinaryPdfSlideUrl(fileUrl: string, pageNumber: number): string {
  if (fileUrl.includes('res.cloudinary.com') && fileUrl.toLowerCase().includes('.pdf')) {
    // Cloudinary PDF page rendering requires resource_type 'image' instead of 'raw'
    const imageUrl = fileUrl.replace('/raw/upload/', '/image/upload/');
    return imageUrl
      .replace(/\/upload\/(?:v\d+\/)?/, `/upload/pg_${pageNumber},w_1280,f_auto,q_auto/`)
      .replace(/\.pdf$/i, '.jpg');
  }
  return 'https://example.com/placeholder.png';
}

/**
 * Fast helper to extract PPTX slides via lightweight Python XML extractor.
 */
async function extractPptxSlidesFast(buffer: Buffer): Promise<Array<{ slide_number: number; raw_text: string }>> {
  const tmpPath = path.join(os.tmpdir(), `pptx_${Date.now()}_${Math.random().toString(36).substring(7)}.pptx`);
  await fs.promises.writeFile(tmpPath, buffer);

  const scriptPath = path.join(__dirname, '../scripts/extract_pptx.py');

  return new Promise((resolve, reject) => {
    execFile('python', [scriptPath, tmpPath], { timeout: 35000 }, (err, stdout, stderr) => {
      fs.promises.unlink(tmpPath).catch(() => {});

      if (err) {
        return reject(new Error(`PPTX extraction failed: ${err.message}. Stderr: ${stderr}`));
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        if (!parsed.success) {
          return reject(new Error(parsed.error || 'Failed to extract PPTX slides'));
        }
        resolve(parsed.slides || []);
      } catch {
        reject(new Error(`Invalid output from PPTX extractor: ${stdout}`));
      }
    });
  });
}

async function dispatchToRemoteConverter(
  lectureId: string,
  userId: string,
  fileUrl: string
): Promise<boolean> {
  const converterBase = (env.CONVERTER_URL || '').trim().replace(/\/+$/, '');
  if (!converterBase) return false;

  const secret = (env.CONVERTER_SECRET || '').trim();
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const formData = new FormData();
      formData.append('lecture_id', String(lectureId));
      formData.append('user_id', String(userId));
      formData.append('file_url', String(fileUrl));

      const headers: Record<string, string> = {};
      if (secret) {
        headers['X-Converter-Secret'] = secret;
      }

      const convertRes = await fetch(`${converterBase}/convert`, {
        method: 'POST',
        headers,
        body: formData,
        signal: AbortSignal.timeout(45_000),
      });

      if (convertRes.ok) {
        console.log(`[SlideProcessor] Dispatched lecture ${lectureId} to remote converter on attempt ${attempt}`);
        return true;
      }

      const isTransientStatus = convertRes.status === 502 || convertRes.status === 503 || convertRes.status === 504;
      console.warn(`[SlideProcessor] Converter attempt ${attempt} returned HTTP ${convertRes.status}`);
      if (!isTransientStatus) {
        return false;
      }
    } catch (err: any) {
      console.warn(`[SlideProcessor] Converter attempt ${attempt} failed: ${err?.message || err}`);
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  return false;
}

function runWindowsPowerPointFallback(lectureId: string): Promise<void> {
  const scriptPath = path.join(__dirname, '../scripts/process_and_upload_slides.py');
  return new Promise((resolve) => {
    execFile('python', [scriptPath, lectureId], { timeout: 180_000 }, (err) => {
      if (err) {
        console.warn(`[SlideProcessor] PowerPoint slide image fallback warning for ${lectureId}: ${err.message}`);
      } else {
        console.log(`[SlideProcessor] PowerPoint slide images successfully generated and uploaded for ${lectureId}`);
      }
      resolve();
    });
  });
}

function scheduleConverterUnstickFallback(lectureId: string): void {
  const timer = setTimeout(async () => {
    try {
      const { count } = await supabaseAdmin
        .from('slides')
        .select('id', { count: 'exact', head: true })
        .eq('lecture_id', lectureId);

      await supabaseAdmin
        .from('lectures')
        .update({
          processing: false,
          slide_count: typeof count === 'number' ? count : undefined,
        })
        .eq('id', lectureId);
    } catch {
      // ignore fallback unstick errors
    } finally {
      activeLectures.delete(lectureId);
    }
  }, 120_000);
  timer.unref?.();
}

/**
 * Multi-tier slide processing & image generation engine:
 * 1. Returns early only when slides already exist AND all have renderable non-placeholder images.
 * 2. Extracts initial slide text/records quickly if missing.
 * 3. Renders genuine PPTX slide images via Tier 1 (remote Python + LibreOffice converter)
 *    and falls back to Tier 2 (Windows PowerPoint COM script) when running locally on Windows.
 */
export async function processLectureSlidesInBackground(
  lectureId: string,
  userId: string,
  fileUrl: string
): Promise<void> {
  if (activeLectures.has(lectureId)) {
    console.log(`[SlideProcessor] Lecture ${lectureId} already has processing in flight; skipping duplicate run.`);
    return;
  }
  activeLectures.add(lectureId);
  console.log(`[SlideProcessor] Starting slide processing for lecture ${lectureId}`);

  let handedOffToRemoteConverter = false;

  try {
    // 1. Check existing slides first
    const { data: existingSlides } = await supabaseAdmin
      .from('slides')
      .select('id, slide_number, image_url')
      .eq('lecture_id', lectureId);

    const existingCount = existingSlides?.length ?? 0;
    const allHaveRealImages =
      existingCount > 0 &&
      existingSlides!.every((s) => isRenderableSlideImage(s.image_url));

    if (allHaveRealImages) {
      console.log(`[SlideProcessor] Lecture ${lectureId} already has ${existingCount} rendered slide images. Marking done.`);
      await supabaseAdmin
        .from('lectures')
        .update({ processing: false, slide_count: existingCount })
        .eq('id', lectureId);
      return;
    }

    if (!fileUrl) {
      console.warn(`[SlideProcessor] Lecture ${lectureId} has no fileUrl.`);
      await supabaseAdmin.from('lectures').update({ processing: false }).eq('id', lectureId);
      return;
    }

    await supabaseAdmin
      .from('lectures')
      .update({ processing: true })
      .eq('id', lectureId);

    const isPptx = fileUrl.toLowerCase().includes('.pptx');

    // 2. If no slides exist yet, extract initial slide text/metadata rapidly
    if (existingCount === 0) {
      console.log(`[SlideProcessor] Downloading file for lecture ${lectureId} (${isPptx ? 'PPTX' : 'PDF'})`);
      const fileResponse = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
        timeout: 40_000,
      });
      const buffer = Buffer.from(fileResponse.data);

      let slideRows: Array<{
        lecture_id: string;
        slide_number: number;
        raw_text: string;
        explanation: string;
        image_url: string;
      }> = [];

      if (isPptx) {
        console.log(`[SlideProcessor] Extracting PPTX slide text for lecture ${lectureId}...`);
        const extractedPptx = await extractPptxSlidesFast(buffer);
        slideRows = extractedPptx.map((s) => ({
          lecture_id: lectureId,
          slide_number: s.slide_number,
          raw_text: s.raw_text || `Slide ${s.slide_number}`,
          explanation: '',
          image_url: 'https://example.com/placeholder.png',
        }));
      } else {
        console.log(`[SlideProcessor] Extracting PDF slides for lecture ${lectureId}...`);
        const pdfData = await pdfParse(buffer);
        const rawPages = (pdfData.text || '').split('\f');
        const cleanPages = rawPages.map((p) => p.trim());
        const totalPages = Math.max(pdfData.numpages || 1, cleanPages.length || 1);

        for (let i = 1; i <= totalPages; i++) {
          const pageText = cleanPages[i - 1] || `Slide ${i}`;
          const imgUrl = getCloudinaryPdfSlideUrl(fileUrl, i);
          slideRows.push({
            lecture_id: lectureId,
            slide_number: i,
            raw_text: pageText,
            explanation: '',
            image_url: imgUrl,
          });
        }
      }

      if (slideRows.length === 0) {
        slideRows.push({
          lecture_id: lectureId,
          slide_number: 1,
          raw_text: 'Slide 1 Content',
          explanation: '',
          image_url: 'https://example.com/placeholder.png',
        });
      }

      const CHUNK_SIZE = 50;
      for (let c = 0; c < slideRows.length; c += CHUNK_SIZE) {
        const chunk = slideRows.slice(c, c + CHUNK_SIZE);
        const { error: insertErr } = await supabaseAdmin.from('slides').insert(chunk);
        if (insertErr) {
          console.error(`[SlideProcessor] Error inserting slide chunk [${c}-${c + chunk.length}] for lecture ${lectureId}:`, insertErr);
        }
      }

      await supabaseAdmin
        .from('lectures')
        .update({
          slide_count: slideRows.length,
          processing: isPptx,
        })
        .eq('id', lectureId);
    }

    // 3. Render genuine slide pictures whenever PPTX or any slide still lacks a real image
    const needsImageRendering =
      isPptx ||
      existingSlides?.some((s) => !isRenderableSlideImage(s.image_url)) ||
      false;

    if (needsImageRendering) {
      // Tier 1: Dispatch to remote/Docker Python converter (LibreOffice + PyMuPDF -> Cloudinary WebP)
      handedOffToRemoteConverter = await dispatchToRemoteConverter(lectureId, userId, fileUrl);

      if (handedOffToRemoteConverter) {
        scheduleConverterUnstickFallback(lectureId);
        return;
      }

      // Tier 2: Local Windows PowerPoint COM fallback when running locally on Windows
      if (isPptx && process.platform === 'win32') {
        await runWindowsPowerPointFallback(lectureId);
      }
    }
  } catch (err: any) {
    console.error(`[SlideProcessor] Unexpected error processing lecture ${lectureId}:`, err);
  } finally {
    if (!handedOffToRemoteConverter) {
      try {
        const { count: finalCount } = await supabaseAdmin
          .from('slides')
          .select('id', { count: 'exact', head: true })
          .eq('lecture_id', lectureId);

        await supabaseAdmin
          .from('lectures')
          .update({
            processing: false,
            slide_count: typeof finalCount === 'number' ? finalCount : undefined,
          })
          .eq('id', lectureId);
      } catch {
        // quiet fallback
      } finally {
        activeLectures.delete(lectureId);
      }
    }
  }
}
