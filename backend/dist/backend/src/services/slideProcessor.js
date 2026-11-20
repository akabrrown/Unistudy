"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLectureProcessingInFlight = isLectureProcessingInFlight;
exports.processLectureSlidesInBackground = processLectureSlidesInBackground;
const axios_1 = __importDefault(require("axios"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const supabase_1 = require("../lib/supabase");
const env_1 = require("../config/env");
const slideDedupe_1 = require("../../../shared/lib/slideDedupe");
const pptxFallbackRenderer_1 = require("./pptxFallbackRenderer");
const activeLectures = new Set();
const DEFAULT_CONVERTER_SECRET = 'zT9xK2mP7vL4wQ8rN5bH1jC6dF3gY0';
function isLectureProcessingInFlight(lectureId) {
    return activeLectures.has(lectureId);
}
/**
 * Cloudinary dynamic transformation:
 * Renders any PDF page on-demand as a crisp, fast-loading, cached CDN image.
 */
function getCloudinaryPdfSlideUrl(fileUrl, pageNumber) {
    if (fileUrl.includes('res.cloudinary.com') && fileUrl.toLowerCase().includes('.pdf')) {
        // Cloudinary PDF page rendering requires resource_type 'image' instead of 'raw'
        const imageUrl = fileUrl.replace('/raw/upload/', '/image/upload/');
        return imageUrl
            .replace(/\/upload\/(?:v\d+\/)?/, `/upload/pg_${pageNumber},w_1280,f_auto,q_auto/`)
            .replace(/\.pdf$/i, '.jpg');
    }
    return 'https://example.com/placeholder.png';
}
function runPythonExtractPptx(bin, scriptPath, tmpPath) {
    return new Promise((resolve, reject) => {
        (0, child_process_1.execFile)(bin, [scriptPath, tmpPath], { timeout: 35000 }, (err, stdout, stderr) => {
            if (err) {
                return reject(new Error(`PPTX extraction (${bin}) failed: ${err.message}. Stderr: ${stderr}`));
            }
            try {
                const parsed = JSON.parse(stdout.trim());
                if (!parsed.success) {
                    return reject(new Error(parsed.error || 'Failed to extract PPTX slides'));
                }
                resolve(parsed.slides || []);
            }
            catch {
                reject(new Error(`Invalid output from PPTX extractor: ${stdout}`));
            }
        });
    });
}
/**
 * Fast helper to extract PPTX slides in-process using Node ZIP/XML parsing,
 * falling back to Python XML extractor if needed.
 */
async function extractPptxSlidesFast(buffer) {
    try {
        const nodeParsed = (0, pptxFallbackRenderer_1.extractPptxSlidesFromBuffer)(buffer);
        if (nodeParsed.length > 0) {
            return nodeParsed.map((s) => ({
                slide_number: s.slide_number,
                raw_text: s.raw_text,
            }));
        }
    }
    catch (nodeErr) {
        console.warn(`[SlideProcessor] Node PPTX parser fallback notice: ${nodeErr?.message || nodeErr}`);
    }
    const tmpPath = path_1.default.join(os_1.default.tmpdir(), `pptx_${Date.now()}_${Math.random().toString(36).substring(7)}.pptx`);
    await fs_1.default.promises.writeFile(tmpPath, buffer);
    const scriptPath = path_1.default.join(__dirname, '../scripts/extract_pptx.py');
    try {
        for (const bin of process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python']) {
            try {
                return await runPythonExtractPptx(bin, scriptPath, tmpPath);
            }
            catch {
                // Try next python executable name
            }
        }
        throw new Error('Both Node ZIP parser and Python extract_pptx failed');
    }
    finally {
        fs_1.default.promises.unlink(tmpPath).catch(() => { });
    }
}
async function dispatchToRemoteConverter(lectureId, userId, fileUrl) {
    const converterBase = (env_1.env.CONVERTER_URL || '').trim().replace(/\/+$/, '');
    if (!converterBase)
        return false;
    if (env_1.env.NODE_ENV === 'production' &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(converterBase)) {
        console.warn(`[SlideProcessor] Skipping localhost CONVERTER_URL (${converterBase}) in production.`);
        return false;
    }
    const secret = (env_1.env.CONVERTER_SECRET || DEFAULT_CONVERTER_SECRET)
        .trim()
        .replace(/^["']|["']$/g, '');
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const formData = new FormData();
            formData.append('lecture_id', String(lectureId));
            formData.append('user_id', String(userId));
            formData.append('file_url', String(fileUrl));
            const headers = {};
            if (secret) {
                headers['X-Converter-Secret'] = secret;
            }
            const convertRes = await fetch(`${converterBase}/convert`, {
                method: 'POST',
                headers,
                body: formData,
                signal: AbortSignal.timeout(65_000),
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
        }
        catch (err) {
            console.warn(`[SlideProcessor] Converter attempt ${attempt} failed: ${err?.message || err}`);
        }
        if (attempt < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
    }
    return false;
}
function runWindowsPowerPointFallback(lectureId) {
    const scriptPath = path_1.default.join(__dirname, '../scripts/process_and_upload_slides.py');
    return new Promise((resolve) => {
        (0, child_process_1.execFile)('python', [scriptPath, lectureId], { timeout: 180_000 }, (err) => {
            if (err) {
                console.warn(`[SlideProcessor] PowerPoint slide image fallback warning for ${lectureId}: ${err.message}`);
            }
            else {
                console.log(`[SlideProcessor] PowerPoint slide images successfully generated and uploaded for ${lectureId}`);
            }
            resolve();
        });
    });
}
async function runNodeCloudinaryFallback(lectureId, fileUrl, existingBuffer) {
    const { data: slides } = await supabase_1.supabaseAdmin
        .from('slides')
        .select('id, image_url')
        .eq('lecture_id', lectureId);
    const hasPlaceholders = (slides || []).some((s) => !(0, slideDedupe_1.isRenderableSlideImage)(s.image_url));
    if (!hasPlaceholders)
        return;
    let buffer = existingBuffer;
    if (!buffer && fileUrl) {
        try {
            const resp = await axios_1.default.get(fileUrl, {
                responseType: 'arraybuffer',
                timeout: 45_000,
            });
            buffer = Buffer.from(resp.data);
        }
        catch (dlErr) {
            console.warn(`[SlideProcessor] Could not download file for Node fallback (${lectureId}): ${dlErr?.message || dlErr}`);
        }
    }
    const healed = await (0, pptxFallbackRenderer_1.renderAndUploadMissingSlideImages)(lectureId, fileUrl, buffer);
    if (healed > 0) {
        console.log(`[SlideProcessor] Node Cloudinary fallback generated ${healed} slide images for ${lectureId}`);
    }
}
function scheduleConverterUnstickFallback(lectureId, fileUrl) {
    const timer = setTimeout(async () => {
        try {
            const { data: slideRows } = await supabase_1.supabaseAdmin
                .from('slides')
                .select('id, image_url')
                .eq('lecture_id', lectureId);
            const hasPlaceholders = !slideRows ||
                slideRows.length === 0 ||
                slideRows.some((s) => !(0, slideDedupe_1.isRenderableSlideImage)(s.image_url));
            if (hasPlaceholders && fileUrl) {
                await runNodeCloudinaryFallback(lectureId, fileUrl);
            }
            const { count } = await supabase_1.supabaseAdmin
                .from('slides')
                .select('id', { count: 'exact', head: true })
                .eq('lecture_id', lectureId);
            await supabase_1.supabaseAdmin
                .from('lectures')
                .update({
                processing: false,
                slide_count: typeof count === 'number' ? count : undefined,
            })
                .eq('id', lectureId);
        }
        catch {
            // ignore fallback unstick errors
        }
        finally {
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
async function processLectureSlidesInBackground(lectureId, userId, fileUrl) {
    if (activeLectures.has(lectureId)) {
        console.log(`[SlideProcessor] Lecture ${lectureId} already has processing in flight; skipping duplicate run.`);
        return;
    }
    activeLectures.add(lectureId);
    console.log(`[SlideProcessor] Starting slide processing for lecture ${lectureId}`);
    let handedOffToRemoteConverter = false;
    let downloadedBuffer;
    try {
        // 1. Check existing slides first
        const { data: existingSlides } = await supabase_1.supabaseAdmin
            .from('slides')
            .select('id, slide_number, image_url')
            .eq('lecture_id', lectureId);
        const existingCount = existingSlides?.length ?? 0;
        const allHaveRealImages = existingCount > 0 &&
            existingSlides.every((s) => (0, slideDedupe_1.isRenderableSlideImage)(s.image_url));
        if (allHaveRealImages) {
            console.log(`[SlideProcessor] Lecture ${lectureId} already has ${existingCount} rendered slide images. Marking done.`);
            await supabase_1.supabaseAdmin
                .from('lectures')
                .update({ processing: false, slide_count: existingCount })
                .eq('id', lectureId);
            return;
        }
        if (!fileUrl) {
            console.warn(`[SlideProcessor] Lecture ${lectureId} has no fileUrl.`);
            await supabase_1.supabaseAdmin.from('lectures').update({ processing: false }).eq('id', lectureId);
            return;
        }
        await supabase_1.supabaseAdmin
            .from('lectures')
            .update({ processing: true })
            .eq('id', lectureId);
        const isPptx = fileUrl.toLowerCase().includes('.pptx');
        // 2. If no slides exist yet, extract initial slide text/metadata rapidly
        if (existingCount === 0) {
            console.log(`[SlideProcessor] Downloading file for lecture ${lectureId} (${isPptx ? 'PPTX' : 'PDF'})`);
            const fileResponse = await axios_1.default.get(fileUrl, {
                responseType: 'arraybuffer',
                timeout: 45_000,
            });
            downloadedBuffer = Buffer.from(fileResponse.data);
            let slideRows = [];
            if (isPptx) {
                console.log(`[SlideProcessor] Extracting PPTX slide text for lecture ${lectureId}...`);
                const extractedPptx = await extractPptxSlidesFast(downloadedBuffer);
                slideRows = extractedPptx.map((s) => ({
                    lecture_id: lectureId,
                    slide_number: s.slide_number,
                    raw_text: s.raw_text || `Slide ${s.slide_number}`,
                    explanation: '',
                    image_url: 'https://example.com/placeholder.png',
                }));
            }
            else {
                console.log(`[SlideProcessor] Extracting PDF slides for lecture ${lectureId}...`);
                const pdfData = await (0, pdf_parse_1.default)(downloadedBuffer);
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
                const { error: insertErr } = await supabase_1.supabaseAdmin.from('slides').insert(chunk);
                if (insertErr) {
                    console.error(`[SlideProcessor] Error inserting slide chunk [${c}-${c + chunk.length}] for lecture ${lectureId}:`, insertErr);
                }
            }
            const anyInsertedPlaceholder = slideRows.some((s) => !(0, slideDedupe_1.isRenderableSlideImage)(s.image_url));
            await supabase_1.supabaseAdmin
                .from('lectures')
                .update({
                slide_count: slideRows.length,
                processing: isPptx || anyInsertedPlaceholder,
            })
                .eq('id', lectureId);
        }
        // 3. Render genuine slide pictures whenever PPTX or any slide still lacks a real image
        const needsImageRendering = isPptx ||
            existingSlides?.some((s) => !(0, slideDedupe_1.isRenderableSlideImage)(s.image_url)) ||
            false;
        if (needsImageRendering) {
            // Tier 1: Dispatch to remote/Docker Python converter (LibreOffice / PyMuPDF -> Cloudinary WebP)
            handedOffToRemoteConverter = await dispatchToRemoteConverter(lectureId, userId, fileUrl);
            if (handedOffToRemoteConverter) {
                scheduleConverterUnstickFallback(lectureId, fileUrl);
                return;
            }
            // Tier 2: Local Windows PowerPoint COM fallback when running locally on Windows
            if (isPptx && process.platform === 'win32') {
                await runWindowsPowerPointFallback(lectureId);
            }
            // Tier 3: Cross-platform Node.js SVG-to-Cloudinary WebP slide renderer fallback
            await runNodeCloudinaryFallback(lectureId, fileUrl, downloadedBuffer);
        }
    }
    catch (err) {
        console.error(`[SlideProcessor] Unexpected error processing lecture ${lectureId}:`, err);
    }
    finally {
        if (!handedOffToRemoteConverter) {
            try {
                const { count: finalCount } = await supabase_1.supabaseAdmin
                    .from('slides')
                    .select('id', { count: 'exact', head: true })
                    .eq('lecture_id', lectureId);
                await supabase_1.supabaseAdmin
                    .from('lectures')
                    .update({
                    processing: false,
                    slide_count: typeof finalCount === 'number' ? finalCount : undefined,
                })
                    .eq('id', lectureId);
            }
            catch {
                // quiet fallback
            }
            finally {
                activeLectures.delete(lectureId);
            }
        }
    }
}
