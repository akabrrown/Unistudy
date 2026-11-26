import { v2 as cloudinary } from 'cloudinary';
import { createClient } from '@supabase/supabase-js';
import { normalizePastPaperTitle, extractCourseCode } from '@/lib/past-papers/titleNormalizer';

const KLOK_BASE_URL = process.env.KLOK_BASE_URL || 'https://kloksearch.vercel.app';
const KLOK_API_KEY = process.env.KLOK_API_KEY || 'klok_live_ddbeef2ccb5ed98dd45873c1d35060c4';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || 'dtauhhlve',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export function getServiceSupabase() {
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

const klokCache = new Map<string, { data: any[]; expiresAt: number }>();
const KLOK_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

/**
 * Fetches paper metadata from KLOK external gateway with in-memory caching
 */
export async function fetchKlokPapers(query?: string): Promise<any[]> {
  const cacheKey = (query || '').toLowerCase().trim();
  const cached = klokCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  try {
    const url = new URL('/api/v1/past-questions', KLOK_BASE_URL);
    if (query) {
      url.searchParams.set('q', query);
    }
    const res = await fetch(url.toString(), {
      headers: {
        'x-klok-api-key': KLOK_API_KEY,
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = data.items || (Array.isArray(data) ? data : []);

    klokCache.set(cacheKey, {
      data: items,
      expiresAt: Date.now() + KLOK_CACHE_TTL_MS,
    });
    return items;
  } catch (err: any) {
    console.warn(`[fetchKlokPapers] failed for query "${query}":`, err.message);
    return cached ? cached.data : [];
  }
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

    return new Promise((resolve) => {
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
  course: { id?: string | null; course_code: string; title?: string },
  userId?: string | null
): Promise<{ id: string; file_url: string | null }> {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return { id: paperItem.id, file_url: null };
  }

  const rawName = paperItem.name || paperItem.filename || paperItem.title || paperItem.id || 'Past Examination Paper';
  const cleanTitle = normalizePastPaperTitle(rawName);
  const year = parseYear(paperItem.year || cleanTitle);
  const isMidterm = cleanTitle.toLowerCase().includes('mid') || cleanTitle.toLowerCase().includes('interim');
  const normalizedCode = (course.course_code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  try {
    // 1. Check if paper already exists in database for this course code and year
    const cleanSearchTitle = cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
    let checkQuery = supabase
      .from('past_papers')
      .select('id, title, course_id, past_paper_pages(id, image_url)')
      .eq('year', year)
      .eq('exam_type', isMidterm ? 'mid-semester' : 'end-semester');

    if (course.id && normalizedCode) {
      checkQuery = checkQuery.or(`course_id.eq.${course.id},normalized_course_code.eq.${normalizedCode}`);
    } else if (normalizedCode) {
      checkQuery = checkQuery.eq('normalized_course_code', normalizedCode);
    } else if (course.id) {
      checkQuery = checkQuery.eq('course_id', course.id);
    }

    const { data: existingList } = await checkQuery;

    if (Array.isArray(existingList) && existingList.length > 0) {
      // Find closest match or reuse first existing paper
      const exact = existingList.find((p) => {
        const pClean = (p.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return pClean === cleanSearchTitle || pClean.includes(cleanSearchTitle) || cleanSearchTitle.includes(pClean);
      }) || existingList[0];

      if (exact?.id) {
        // If course.id is provided and the existing record has course_id null, link it!
        if (course.id && !exact.course_id) {
          void supabase.from('past_papers').update({ course_id: course.id }).eq('id', exact.id);
        }

        const existingPages = (exact as any).past_paper_pages;
        const existingUrl = Array.isArray(existingPages) && existingPages.length > 0 ? existingPages[0]?.image_url : null;
        return { id: exact.id, file_url: existingUrl };
      }
    }

    // 2. Upload PDF to Cloudinary bucket
    const publicId = `${normalizedCode || 'EXAM'}_${year}_${isMidterm ? 'midterm' : 'final'}_${Date.now()}`;
    const cloudinaryUrl = await uploadPaperPdfToCloudinary(paperItem.id, publicId);

    // 3. Insert record into past_papers table
    const { data: newPaper, error: insertErr } = await supabase
      .from('past_papers')
      .insert({
        course_id: course.id || null,
        user_id: userId || null,
        title: cleanTitle,
        year,
        exam_type: isMidterm ? 'mid-semester' : 'end-semester',
        status: 'ready',
        course_code: course.course_code || 'EXAM',
        normalized_course_code: normalizedCode || null,
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

/**
 * Non-blocking background worker to sync past papers for a specific course code from KLOK into Central Bank
 */
export async function syncCoursePapersFromKlok(
  courseCode: string,
  courseId?: string | null,
  userId?: string | null
): Promise<{ totalFound: number; newlyIngested: number }> {
  const cleanCode = (courseCode || '').toUpperCase().trim();
  const normalizedCode = cleanCode.replace(/[^A-Z0-9]/g, '');
  if (!normalizedCode) return { totalFound: 0, newlyIngested: 0 };

  try {
    // Search by both space-separated and normalized code
    const queries = Array.from(new Set([cleanCode, normalizedCode]));
    const results = await Promise.all(queries.map((q) => fetchKlokPapers(q)));
    const allItems: any[] = [];
    const seenIds = new Set<string>();

    for (const list of results) {
      for (const item of list) {
        if (item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          allItems.push(item);
        }
      }
    }

    if (allItems.length === 0) return { totalFound: 0, newlyIngested: 0 };

    let newlyIngested = 0;
    for (const item of allItems) {
      const rawName = item.name || item.filename || item.title || item.id || '';
      const cleanTitle = normalizePastPaperTitle(rawName);
      const detectedCode = extractCourseCode(cleanTitle);

      // Verify the paper actually pertains to this course
      const cleanDetect = (detectedCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const cleanTitleNorm = cleanTitle.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const matches =
        cleanDetect === normalizedCode ||
        cleanTitleNorm.includes(normalizedCode) ||
        (cleanDetect.length >= 4 && normalizedCode.includes(cleanDetect));

      if (matches) {
        const res = await ensurePaperIngested(
          item,
          { id: courseId || null, course_code: cleanCode, title: cleanTitle },
          userId || null
        );
        if (res.file_url) {
          newlyIngested++;
        }
      }
    }

    return { totalFound: allItems.length, newlyIngested };
  } catch (err: any) {
    console.warn(`[syncCoursePapersFromKlok] Sync error for ${cleanCode}:`, err.message);
    return { totalFound: 0, newlyIngested: 0 };
  }
}

/**
 * Global Bank Sync Worker: cross-checks active course codes across UniStudy against KLOK
 */
export async function syncAllBankPapers(): Promise<{
  checkedCodes: string[];
  totalFound: number;
  newlyIngested: number;
}> {
  const supabase = getServiceSupabase();
  if (!supabase) return { checkedCodes: [], totalFound: 0, newlyIngested: 0 };

  try {
    // 1. Fetch distinct course codes from courses table
    const { data: courses } = await supabase
      .from('courses')
      .select('course_code')
      .not('course_code', 'is', null);

    const codeSet = new Set<string>();
    // Standard UPSA courses to always keep synced in the central bank
    const coreUpsaCodes = [
      'BCPC201', 'BCPC203', 'BCPC205', 'BCPC207', 'BCPC209', 'BCPC211',
      'BCPC101', 'BCPC103', 'BCPC105', 'BCPC107',
      'BINF201', 'BINF203', 'BINF205', 'BINF207',
      'BBA201', 'BBA203', 'BBA205', 'BBA207',
      'BPRM201', 'BPRM203', 'BACT201', 'BACT203',
      'BCPC301', 'BCPC303', 'BCPC305', 'BCPC307',
    ];

    for (const c of coreUpsaCodes) {
      codeSet.add(c);
    }

    if (courses) {
      for (const row of courses) {
        if (row.course_code) {
          const norm = row.course_code.toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (norm.length >= 4) {
            codeSet.add(norm);
          }
        }
      }
    }

    const uniqueCodes = Array.from(codeSet);
    let totalFound = 0;
    let newlyIngested = 0;

    for (const code of uniqueCodes) {
      const res = await syncCoursePapersFromKlok(code);
      totalFound += res.totalFound;
      newlyIngested += res.newlyIngested;
    }

    return { checkedCodes: uniqueCodes, totalFound, newlyIngested };
  } catch (err: any) {
    console.error('[syncAllBankPapers] Fatal error:', err);
    return { checkedCodes: [], totalFound: 0, newlyIngested: 0 };
  }
}

