import { v2 as cloudinary } from 'cloudinary';
import { createClient } from '@supabase/supabase-js';

const KLOK_BASE_URL = process.env.KLOK_BASE_URL || 'https://kloksearch.vercel.app';
const KLOK_API_KEY = process.env.KLOK_API_KEY || 'klok_live_ddbeef2ccb5ed98dd45873c1d35060c4';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || 'dtauhhlve',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function parseYear(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return new Date().getFullYear();
  const m = String(val).match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : new Date().getFullYear();
}

/**
 * Downloads a paper PDF from the external gateway and uploads it directly to Cloudinary
 */
export async function uploadPaperPdfToCloudinary(paperId: string, publicId: string): Promise<string | null> {
  try {
    const downloadUrl = `${KLOK_BASE_URL}/api/v1/past-questions/download?id=${encodeURIComponent(paperId)}&download=1`;
    const res = await fetch(downloadUrl, {
      headers: { 'x-klok-api-key': KLOK_API_KEY },
    });

    if (!res.ok) {
      console.warn(`[uploadPaperPdfToCloudinary] Failed to download paper ${paperId}: status ${res.status}`);
      return null;
    }

    const arrayBuf = await res.arrayBuffer();
    const buf = Buffer.from(arrayBuf);

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'unistudy_past_papers',
          resource_type: 'image',
          public_id: publicId.replace(/[^a-zA-Z0-9_-]/g, '_'),
          format: 'pdf',
          overwrite: true,
        },
        (error, result) => {
          if (error) {
            console.warn('[uploadPaperPdfToCloudinary] Cloudinary upload error:', error.message);
            resolve(null);
          } else {
            resolve(result?.secure_url || null);
          }
        }
      );
      stream.end(buf);
    });
  } catch (err: any) {
    console.warn('[uploadPaperPdfToCloudinary] Exception:', err.message);
    return null;
  }
}

/**
 * Ingests a discovered external paper into Supabase + Cloudinary if not already present
 */
export async function ensurePaperIngested(
  paperItem: any,
  course: { id: string; course_code: string; title: string },
  userId: string
): Promise<{ id: string; file_url: string | null }> {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return { id: paperItem.id, file_url: null };
  }

  const rawName = paperItem.name || paperItem.filename || 'Past Examination Paper';
  const cleanTitle = rawName.replace(/\.pdf$/i, '').trim();
  const year = parseYear(paperItem.year || cleanTitle);
  const isMidterm = cleanTitle.toLowerCase().includes('mid') || cleanTitle.toLowerCase().includes('interim');
  const normalizedCode = (course.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  try {
    // 1. Check if paper already exists in database for this course and year
    const { data: existing } = await supabase
      .from('past_papers')
      .select('id, title, past_paper_pages(id, image_url)')
      .eq('course_id', course.id)
      .eq('normalized_course_code', normalizedCode)
      .eq('year', year)
      .eq('exam_type', isMidterm ? 'mid-semester' : 'end-semester')
      .maybeSingle();

    if (existing?.id) {
      const existingPages = (existing as any).past_paper_pages;
      const existingUrl = Array.isArray(existingPages) && existingPages.length > 0 ? existingPages[0]?.image_url : null;
      return { id: existing.id, file_url: existingUrl };
    }

    // 2. Upload PDF to Cloudinary bucket
    const publicId = `${normalizedCode}_${year}_${isMidterm ? 'midterm' : 'final'}`;
    const cloudinaryUrl = await uploadPaperPdfToCloudinary(paperItem.id, publicId);

    // 3. Insert record into past_papers table
    const { data: newPaper, error: insertErr } = await supabase
      .from('past_papers')
      .insert({
        course_id: course.id,
        user_id: userId,
        title: cleanTitle,
        year,
        exam_type: isMidterm ? 'mid-semester' : 'end-semester',
        status: 'ready',
        course_code: course.course_code,
        normalized_course_code: normalizedCode,
        shared_to_community: true,
      })
      .select('id')
      .single();

    if (insertErr || !newPaper) {
      console.warn('[ensurePaperIngested] Insert past_paper warning:', insertErr?.message);
      return { id: paperItem.id, file_url: cloudinaryUrl };
    }

    // 4. Save Cloudinary URL in past_paper_pages table
    if (cloudinaryUrl) {
      await supabase.from('past_paper_pages').insert({
        past_paper_id: newPaper.id,
        page_number: 1,
        image_url: cloudinaryUrl,
      });
    }

    return { id: newPaper.id, file_url: cloudinaryUrl };
  } catch (err: any) {
    console.warn('[ensurePaperIngested] Ingest exception:', err.message);
    return { id: paperItem.id, file_url: null };
  }
}
