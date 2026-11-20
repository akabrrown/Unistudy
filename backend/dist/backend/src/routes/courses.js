"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const expensiveGuard_1 = require("../middleware/expensiveGuard");
const supabase_1 = require("../lib/supabase");
const cpuOptimization_1 = require("../../../shared/lib/cpuOptimization");
const router = (0, express_1.Router)();
const coursesListCache = new cpuOptimization_1.TTLCache(15_000, 300);
const courseDetailCache = new cpuOptimization_1.TTLCache(15_000, 300);
function invalidateCourseCaches(userId, courseId) {
    coursesListCache.delete(userId);
    if (courseId) {
        courseDetailCache.delete(`${userId}:${courseId}`);
    }
    else {
        courseDetailCache.invalidatePrefix(`${userId}:`);
    }
}
const CourseInsertSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(255),
    course_code: zod_1.z.string().max(50).optional(),
    semester: zod_1.z.number().int().min(1).max(12).optional(),
    year: zod_1.z.number().int().min(2020).max(2100).optional(),
    colour: zod_1.z.string().max(50).optional(),
    programme_id: zod_1.z.string().uuid().optional(),
    archived: zod_1.z.boolean().optional(),
}).strict();
const CourseUpdateSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(255).optional(),
    course_code: zod_1.z.string().max(50).optional(),
    semester: zod_1.z.number().int().min(1).max(12).optional(),
    year: zod_1.z.number().int().min(2020).max(2100).optional(),
    colour: zod_1.z.string().max(50).optional(),
    programme_id: zod_1.z.string().uuid().optional(),
    archived: zod_1.z.boolean().optional(),
}).strict();
router.use(auth_1.authenticateUser);
router.use((0, expensiveGuard_1.deduplicateInFlightRequests)({ methods: ['GET'] }));
router.get('/', async (req, res) => {
    const userId = req.user.id;
    const cached = coursesListCache.get(userId);
    if (cached) {
        res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
        return res.json(cached);
    }
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    let { data, error } = await supabase
        .from('courses')
        .select('*, lectures(id, title, week, slide_count, created_at, processing), past_papers(id, title, year, exam_type, status)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) {
        console.warn('[Courses] Join query failed, falling back to direct select:', error.message);
        const fallback = await supabase
            .from('courses')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (fallback.error) {
            console.error('[Courses] Direct fetch failed:', fallback.error.message);
            return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? fallback.error.message : undefined });
        }
        data = fallback.data || [];
    }
    if (data) {
        data.forEach((c) => {
            if (Array.isArray(c.lectures)) {
                c.lectures = c.lectures
                    .filter((l) => !l.title?.startsWith('[FAILED'))
                    .map((l) => {
                    if (l.processing && typeof l.slide_count === 'number' && l.slide_count > 0) {
                        return { ...l, processing: false };
                    }
                    return l;
                });
            }
            else {
                c.lectures = [];
            }
            if (!Array.isArray(c.past_papers)) {
                c.past_papers = [];
            }
        });
        // Arrange courses in ascending alphanumeric order by course code and title
        data.sort((a, b) => {
            const codeA = (a.course_code || a.title || '').trim();
            const codeB = (b.course_code || b.title || '').trim();
            return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
        });
        // Fetch cover thumbnails: first slide image_url per lecture
        const allLectureIds = data.flatMap((c) => c.lectures.map((l) => l.id));
        if (allLectureIds.length > 0) {
            const { data: covers } = await supabase_1.supabaseAdmin
                .from('slides')
                .select('lecture_id, image_url, slide_number')
                .in('lecture_id', allLectureIds)
                .in('slide_number', [0, 1])
                .order('slide_number', { ascending: true });
            if (covers && covers.length > 0) {
                const coverMap = new Map();
                for (const row of covers) {
                    if (row.lecture_id && row.image_url && !coverMap.has(row.lecture_id)) {
                        coverMap.set(row.lecture_id, row.image_url);
                    }
                }
                for (const c of data) {
                    for (const lec of c.lectures) {
                        lec.cover_image_url = coverMap.get(lec.id) || null;
                    }
                }
            }
        }
    }
    const result = data || [];
    const anyProcessing = result.some((c) => (c.lectures || []).some((l) => l.processing));
    if (!anyProcessing) {
        coursesListCache.set(userId, result);
        res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
    }
    res.json(result);
});
router.get('/calendar-events', auth_1.authenticateUser, async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', req.user.id)
        .order('date', { ascending: true });
    if (error)
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    res.json(data);
});
router.post('/calendar-events', auth_1.authenticateUser, async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { title, date, time, type } = req.body;
    const { data, error } = await supabase
        .from('calendar_events')
        .insert({
        user_id: req.user.id,
        title,
        date,
        time,
        type
    })
        .select()
        .single();
    if (error)
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    res.json(data);
});
router.post('/', auth_1.authenticateUser, async (req, res) => {
    const parsed = CourseInsertSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() });
    }
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase.from('courses').insert({ ...parsed.data, user_id: req.user.id }).select('*, lectures(id)').single();
    if (error)
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    invalidateCourseCaches(req.user.id, data?.id);
    res.json(data);
});
router.delete('/:id', auth_1.authenticateUser, async (req, res) => {
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { error } = await supabase.from('courses').delete().eq('id', req.params.id).eq('user_id', req.user.id);
    if (error)
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    invalidateCourseCaches(req.user.id, String(req.params.id));
    res.json({ success: true });
});
router.get('/:id', auth_1.authenticateUser, async (req, res) => {
    const userId = req.user.id;
    const courseId = String(req.params.id);
    const cacheKey = `${userId}:${courseId}`;
    const cached = courseDetailCache.get(cacheKey);
    if (cached) {
        res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
        return res.json(cached);
    }
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    const { data, error } = await supabase
        .from('courses')
        .select('*, lectures(id, title, file_url, week, slide_count, created_at, processing)')
        .eq('id', courseId)
        .eq('user_id', userId)
        .maybeSingle();
    if (error)
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    if (!data)
        return res.status(404).json({ error: 'Course not found' });
    if (Array.isArray(data.lectures)) {
        data.lectures = data.lectures
            .filter((l) => !l.title?.startsWith('[FAILED'))
            .sort((a, b) => {
            const wA = typeof a.week === 'number' && a.week > 0 ? a.week : 9999;
            const wB = typeof b.week === 'number' && b.week > 0 ? b.week : 9999;
            if (wA !== wB)
                return wA - wB;
            return (a.title || '').localeCompare(b.title || '', undefined, { numeric: true });
        });
    }
    const anyProcessing = Array.isArray(data.lectures) && data.lectures.some((l) => l.processing);
    if (!anyProcessing) {
        courseDetailCache.set(cacheKey, data);
        res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
    }
    res.json(data);
});
router.patch('/:id', auth_1.authenticateUser, async (req, res) => {
    const parsed = CourseUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid payload', details: parsed.error.format() });
    }
    const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
    // ensure user only updates their own course
    const { data: existing, error: existError } = await supabase
        .from('courses')
        .select('id')
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .single();
    if (existError || !existing)
        return res.status(404).json({ error: 'Course not found' });
    const { data, error } = await supabase
        .from('courses')
        .update(parsed.data)
        .eq('id', req.params.id)
        .eq('user_id', req.user.id)
        .select('*, lectures(id)')
        .single();
    if (error)
        return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
    invalidateCourseCaches(req.user.id, String(req.params.id));
    res.json(data);
});
exports.default = router;
