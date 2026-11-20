"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const expensiveGuard_1 = require("../middleware/expensiveGuard");
const supabase_1 = require("../lib/supabase");
const slideProcessor_1 = require("../services/slideProcessor");
const slideDedupe_1 = require("../../../shared/lib/slideDedupe");
const cpuOptimization_1 = require("../../../shared/lib/cpuOptimization");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateUser);
router.use((0, expensiveGuard_1.deduplicateInFlightRequests)({ methods: ['GET'] }));
const slidesCache = new cpuOptimization_1.TTLCache(20_000, 200);
const lectureDetailCache = new cpuOptimization_1.TTLCache(15_000, 300);
const courseLecturesCache = new cpuOptimization_1.TTLCache(15_000, 200);
const LECTURE_COLUMNS = 'id, course_id, title, week, processing, slide_count, file_url, created_at';
const SLIDE_COLUMNS = 'id, lecture_id, slide_number, image_url, raw_text, explanation, gap_filled, created_at, week';
function invalidateLectureCaches(lectureId, courseId) {
    if (lectureId) {
        slidesCache.invalidatePrefix(`${lectureId}:`);
        slidesCache.delete(lectureId);
        lectureDetailCache.invalidatePrefix(`${lectureId}:`);
        lectureDetailCache.delete(lectureId);
    }
    if (courseId) {
        courseLecturesCache.invalidatePrefix(`${courseId}:`);
    }
    else {
        courseLecturesCache.clear();
    }
}
const LectureInsertSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(255).optional(),
    course_id: zod_1.z.string().uuid(),
    week: zod_1.z.number().int().min(1).max(30).optional(),
    file_url: zod_1.z.string().url().optional(),
});
const LectureUpdateSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(255).optional(),
    week: zod_1.z.number().int().min(1).max(30).optional(),
    file_url: zod_1.z.string().url().optional(),
    processing: zod_1.z.boolean().optional(),
}).strict();
router.get('/detail/:lectureId', async (req, res) => {
    const lectureId = String(req.params.lectureId);
    const cacheKey = `${lectureId}:${req.user.id}`;
    const cached = lectureDetailCache.get(cacheKey);
    if (cached) {
        res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
        return res.json(cached);
    }
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase
        .from('lectures')
        .select(`${LECTURE_COLUMNS}, courses(course_code, title)`)
        .eq('id', lectureId)
        .single();
    if (error)
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    if (data && data.title?.startsWith('[FAILED')) {
        return res.status(404).json({ error: 'Lecture not found' });
    }
    // Auto-recovery: Only mark processing complete when slides exist AND all have genuine images
    if (data && data.processing) {
        const { data: slideCheckRows } = await supabase
            .from('slides')
            .select('id, image_url')
            .eq('lecture_id', data.id);
        const rows = slideCheckRows || [];
        const allReady = rows.length > 0 && rows.every((r) => (0, slideDedupe_1.isRenderableSlideImage)(r.image_url));
        if (allReady) {
            data.processing = false;
            data.slide_count = rows.length;
            void supabase.from('lectures').update({ processing: false, slide_count: rows.length }).eq('id', data.id);
        }
        else if (data.file_url && !(0, slideProcessor_1.isLectureProcessingInFlight)(data.id)) {
            // Re-trigger image/slide generation if missing or still placeholders
            void (0, slideProcessor_1.processLectureSlidesInBackground)(data.id, req.user.id, data.file_url);
        }
    }
    if (data && !data.processing) {
        lectureDetailCache.set(cacheKey, data);
        res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
    }
    res.json(data);
});
router.get('/:courseId', async (req, res) => {
    const courseId = String(req.params.courseId);
    const cacheKey = `${courseId}:${req.user.id}`;
    const cached = courseLecturesCache.get(cacheKey);
    if (cached) {
        res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
        return res.json(cached);
    }
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase
        .from('lectures')
        .select(LECTURE_COLUMNS)
        .eq('course_id', courseId)
        .order('week', { ascending: true });
    if (error)
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    const filtered = Array.isArray(data) ? data.filter((l) => !l.title?.startsWith('[FAILED')) : [];
    // Batch check any stuck lectures instead of N+1 per-lecture queries
    const processingIds = filtered.filter((l) => l.processing).map((l) => l.id);
    if (processingIds.length > 0) {
        const { data: slideRows } = await supabase
            .from('slides')
            .select('lecture_id, image_url')
            .in('lecture_id', processingIds);
        const counts = new Map();
        const allReadyMap = new Map();
        for (const row of slideRows || []) {
            counts.set(row.lecture_id, (counts.get(row.lecture_id) || 0) + 1);
            const prevReady = allReadyMap.get(row.lecture_id) ?? true;
            allReadyMap.set(row.lecture_id, prevReady && (0, slideDedupe_1.isRenderableSlideImage)(row.image_url));
        }
        for (const lec of filtered) {
            if (lec.processing) {
                const count = counts.get(lec.id) || 0;
                const allReady = count > 0 && (allReadyMap.get(lec.id) ?? false);
                if (allReady) {
                    lec.processing = false;
                    lec.slide_count = count;
                    void supabase.from('lectures').update({ processing: false, slide_count: count }).eq('id', lec.id);
                }
            }
        }
    }
    const anyStillProcessing = filtered.some((l) => l.processing);
    if (!anyStillProcessing) {
        courseLecturesCache.set(cacheKey, filtered);
        res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
    }
    res.json(filtered);
});
router.post('/', async (req, res) => {
    const parsed = LectureInsertSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() });
    }
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase.from('lectures').insert(parsed.data).select(LECTURE_COLUMNS).single();
    if (error)
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    invalidateLectureCaches(data?.id, parsed.data.course_id);
    // If file_url is provided upfront, immediately dispatch background extraction
    if (data && data.file_url) {
        void (0, slideProcessor_1.processLectureSlidesInBackground)(data.id, req.user.id, data.file_url);
    }
    res.json(data);
});
router.get('/:lectureId/slides', async (req, res) => {
    const lectureId = String(req.params.lectureId);
    const cacheKey = `${lectureId}:${req.user.id}`;
    const cached = slidesCache.get(cacheKey);
    if (cached) {
        res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
        return res.json(cached);
    }
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase
        .from('slides')
        .select(SLIDE_COLUMNS)
        .eq('lecture_id', lectureId)
        .order('slide_number', { ascending: true });
    if (error)
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    const deduped = (0, slideDedupe_1.dedupeSlidesByNumber)(data);
    const allHaveRealImages = deduped.length > 0 && deduped.every((s) => (0, slideDedupe_1.isRenderableSlideImage)(s.image_url));
    if (allHaveRealImages) {
        slidesCache.set(cacheKey, deduped);
        res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
    }
    else {
        slidesCache.delete(cacheKey);
        res.setHeader('Cache-Control', 'no-store');
        if (deduped.length > 0 && !(0, slideProcessor_1.isLectureProcessingInFlight)(lectureId)) {
            void (async () => {
                try {
                    const { data: lec } = await supabase
                        .from('lectures')
                        .select('file_url')
                        .eq('id', lectureId)
                        .maybeSingle();
                    if (lec?.file_url) {
                        void (0, slideProcessor_1.processLectureSlidesInBackground)(lectureId, req.user.id, lec.file_url);
                    }
                }
                catch {
                    // non-blocking auto-heal lookup
                }
            })();
        }
    }
    res.json(deduped);
});
router.get('/:slideId/notes', async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase
        .from('slide_notes')
        .select('content')
        .eq('slide_id', req.params.slideId)
        .eq('user_id', req.user.id)
        .single();
    // Ignore single() not found error
    if (error && error.code !== 'PGRST116')
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    res.json(data || { content: '' });
});
router.patch('/:id', async (req, res) => {
    const parsed = LectureUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() });
    }
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase
        .from('lectures')
        .update(parsed.data)
        .eq('id', req.params.id)
        .select(LECTURE_COLUMNS)
        .single();
    if (error)
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    invalidateLectureCaches(String(req.params.id), data?.course_id);
    // If file_url was updated, immediately initiate background slide extraction without waiting for user to open
    if (data && data.file_url && !(0, slideProcessor_1.isLectureProcessingInFlight)(data.id)) {
        void (0, slideProcessor_1.processLectureSlidesInBackground)(data.id, req.user.id, data.file_url);
    }
    res.json(data);
});
router.post('/:id/convert', async (req, res) => {
    try {
        const lectureId = String(req.params.id);
        const userId = req.user.id;
        let fileUrl = req.body?.file_url;
        // If file_url was not supplied in body, look it up from the lecture record
        if (!fileUrl) {
            const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
            const { data: lec } = await supabase.from('lectures').select('file_url').eq('id', lectureId).single();
            fileUrl = lec?.file_url;
        }
        if (!fileUrl) {
            return res.status(400).json({ error: 'Lecture has no associated file_url to convert.' });
        }
        invalidateLectureCaches(lectureId);
        // Immediately kick off background processing without blocking the client
        void (0, slideProcessor_1.processLectureSlidesInBackground)(lectureId, userId, fileUrl);
        // Return instant success so the upload dialog and UI never hang
        res.json({
            status: 'processing started',
            lecture_id: lectureId,
            message: 'Slide processing initiated in background'
        });
    }
    catch (error) {
        console.error('Lecture conversion dispatch error:', error);
        res.status(500).json({ error: error.message || 'Failed to dispatch conversion' });
    }
});
router.post('/:slideId/notes', async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { content } = req.body;
    const { error } = await supabase
        .from('slide_notes')
        .upsert({
        user_id: req.user.id,
        slide_id: req.params.slideId,
        content
    }, { onConflict: 'user_id, slide_id' });
    if (error)
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    res.json({ success: true });
});
router.post('/bulk-delete', async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { lectureIds } = req.body;
    if (!Array.isArray(lectureIds) || lectureIds.length === 0) {
        return res.status(400).json({ error: 'lectureIds must be a non-empty array' });
    }
    const { error } = await supabase.from('lectures').delete().in('id', lectureIds);
    if (error)
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    for (const id of lectureIds) {
        invalidateLectureCaches(String(id));
    }
    res.json({ success: true });
});
router.delete('/:id', async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { error } = await supabase.from('lectures').delete().eq('id', req.params.id);
    if (error)
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    invalidateLectureCaches(String(req.params.id));
    res.json({ success: true });
});
exports.default = router;
