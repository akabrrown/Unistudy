"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processLectureSlidesInBackground = processLectureSlidesInBackground;
const axios_1 = __importDefault(require("axios"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const supabase_1 = require("../lib/supabase");
/**
 * Cloudinary dynamic transformation:
 * Renders any PDF page on-demand as a crisp, fast-loading, cached CDN image.
 */
function getCloudinaryPdfSlideUrl(fileUrl, pageNumber) {
    if (fileUrl.includes('res.cloudinary.com') && fileUrl.toLowerCase().includes('.pdf')) {
        return fileUrl
            .replace(/\/upload\/(?:[^/]+\/)?/, `/upload/pg_${pageNumber},w_1400,f_auto,q_auto/`)
            .replace(/\.pdf$/i, '.jpg');
    }
    return 'https://res.cloudinary.com/dwyxspqbe/image/upload/v1721820468/slide_placeholder.webp';
}
/**
 * Fast helper to extract PPTX slides via lightweight Python XML extractor.
 * Runs in ~1 second with zero LibreOffice dependency and zero token consumption.
 */
async function extractPptxSlidesFast(buffer) {
    const tmpPath = path_1.default.join(os_1.default.tmpdir(), `pptx_${Date.now()}_${Math.random().toString(36).substring(7)}.pptx`);
    await fs_1.default.promises.writeFile(tmpPath, buffer);
    const scriptPath = path_1.default.join(__dirname, '../scripts/extract_pptx.py');
    return new Promise((resolve, reject) => {
        (0, child_process_1.execFile)('python', [scriptPath, tmpPath], { timeout: 35000 }, (err, stdout, stderr) => {
            // Clean up tmp file
            fs_1.default.promises.unlink(tmpPath).catch(() => { });
            if (err) {
                return reject(new Error(`PPTX extraction failed: ${err.message}. Stderr: ${stderr}`));
            }
            try {
                const parsed = JSON.parse(stdout.trim());
                if (!parsed.success) {
                    return reject(new Error(parsed.error || 'Failed to extract PPTX slides'));
                }
                resolve(parsed.slides || []);
            }
            catch (parseErr) {
                reject(new Error(`Invalid output from PPTX extractor: ${stdout}`));
            }
        });
    });
}
/**
 * Real-time slide extraction engine:
 * 1. Checks if slides already exist.
 * 2. Processes PDF or PPTX directly in seconds.
 * 3. Populates slides table and sets processing: false immediately.
 */
async function processLectureSlidesInBackground(lectureId, userId, fileUrl) {
    console.log(`[SlideProcessor] Starting real-time slide extraction for lecture ${lectureId}`);
    try {
        // 1. Mark lecture as actively processing
        await supabase_1.supabaseAdmin
            .from('lectures')
            .update({ processing: true })
            .eq('id', lectureId);
        // 2. Check if slides were already populated
        const { count: existingCount } = await supabase_1.supabaseAdmin
            .from('slides')
            .select('id', { count: 'exact', head: true })
            .eq('lecture_id', lectureId);
        if (existingCount && existingCount > 0) {
            console.log(`[SlideProcessor] Lecture ${lectureId} already has ${existingCount} slides. Marking done.`);
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
        const isPptx = fileUrl.toLowerCase().includes('.pptx');
        // 3. Download the document buffer (timeout 40s)
        console.log(`[SlideProcessor] Downloading file for lecture ${lectureId} (${isPptx ? 'PPTX' : 'PDF'})`);
        const fileResponse = await axios_1.default.get(fileUrl, {
            responseType: 'arraybuffer',
            timeout: 40000,
        });
        const buffer = Buffer.from(fileResponse.data);
        let slideRows = [];
        if (isPptx) {
            console.log(`[SlideProcessor] Extracting PPTX slides for lecture ${lectureId}...`);
            const extractedPptx = await extractPptxSlidesFast(buffer);
            slideRows = extractedPptx.map((s) => ({
                lecture_id: lectureId,
                slide_number: s.slide_number,
                raw_text: s.raw_text || `Slide ${s.slide_number}`,
                explanation: '',
                image_url: 'https://res.cloudinary.com/dwyxspqbe/image/upload/v1721820468/slide_placeholder.webp',
            }));
        }
        else {
            console.log(`[SlideProcessor] Extracting PDF slides for lecture ${lectureId}...`);
            const pdfData = await (0, pdf_parse_1.default)(buffer);
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
                image_url: 'https://res.cloudinary.com/dwyxspqbe/image/upload/v1721820468/slide_placeholder.webp',
            });
        }
        // 4. Batch insert slides in chunks of 50 to avoid payload limits
        const CHUNK_SIZE = 50;
        for (let c = 0; c < slideRows.length; c += CHUNK_SIZE) {
            const chunk = slideRows.slice(c, c + CHUNK_SIZE);
            const { error: insertErr } = await supabase_1.supabaseAdmin.from('slides').insert(chunk);
            if (insertErr) {
                console.error(`[SlideProcessor] Error inserting slide chunk [${c}-${c + chunk.length}] for lecture ${lectureId}:`, insertErr);
            }
        }
        // 5. Mark lecture completed with correct count
        await supabase_1.supabaseAdmin
            .from('lectures')
            .update({ processing: false, slide_count: slideRows.length })
            .eq('id', lectureId);
        console.log(`[SlideProcessor] Successfully processed ${slideRows.length} slides for lecture ${lectureId} in real time!`);
    }
    catch (err) {
        console.error(`[SlideProcessor] Unexpected error processing lecture ${lectureId}:`, err);
    }
    finally {
        // Guarantees lecture NEVER remains stuck in processing state
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
    }
}
