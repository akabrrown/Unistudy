"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const supabase_1 = require("../lib/supabase");
const router = (0, express_1.Router)();
const redis_1 = require("../lib/redis");
const quotes_1 = require("../lib/constants/quotes");
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const generative_ai_1 = require("@google/generative-ai");
let memoryCachedQuote = null;
// Public route: Daily Quote (no auth required)
router.get('/daily-quote', async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `daily_quote:${today}`;
    // 1. Check in-memory process cache
    if (memoryCachedQuote && memoryCachedQuote.date === today) {
        return res.json({ quote: memoryCachedQuote.quote, author: memoryCachedQuote.author, date: today });
    }
    // 2. Check Redis / NodeCache fallback
    if (redis_1.redis) {
        try {
            const cached = await redis_1.redis.get(cacheKey);
            if (cached && typeof cached === 'object' && cached.quote) {
                memoryCachedQuote = { date: today, quote: cached.quote, author: cached.author };
                return res.json({ quote: memoryCachedQuote.quote, author: memoryCachedQuote.author, date: today });
            }
        }
        catch (e) {
            // Redis fallback handles gracefully
        }
    }
    // 3. Fallback quote is deterministic by day-of-year so every day has a different quote
    const defaultQuote = (0, quotes_1.getCuratedDailyQuote)(today);
    let quote = defaultQuote.quote;
    let author = defaultQuote.author;
    // 4. Try generating a fresh, unique quote with modern Groq or Gemini
    try {
        if (process.env.GROQ_API_KEY) {
            const groq = new groq_sdk_1.default({ apiKey: process.env.GROQ_API_KEY });
            const completion = await groq.chat.completions.create({
                messages: [{
                        role: 'user',
                        content: `Generate a single inspiring, memorable motivational quote specifically for university students studying for exams, mastering difficult skills, or persisting.
Format your response strictly as: "Quote text" - Author Name
Do not include any greeting, explanation, or extra characters.`
                    }],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.8,
                max_tokens: 120
            });
            const text = completion.choices[0]?.message?.content?.trim() || '';
            const match = text.match(/^["“]?(.*?)["”]?\s*[-–—]\s*(.*)$/);
            if (match && match[1].trim().length > 10) {
                quote = match[1].trim();
                author = match[2].trim().replace(/\.$/, '') || 'Unknown';
            }
        }
        else if (process.env.GEMINI_API_KEY) {
            const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
            const resAI = await model.generateContent('Generate a single inspiring motivational quote for university students. Format strictly as: "Quote text" - Author Name');
            const text = resAI.response.text().trim();
            const match = text.match(/^["“]?(.*?)["”]?\s*[-–—]\s*(.*)$/);
            if (match && match[1].trim().length > 10) {
                quote = match[1].trim();
                author = match[2].trim().replace(/\.$/, '') || 'Unknown';
            }
        }
    }
    catch (error) {
        console.warn('[Daily Quote] AI quote generation failed, using rotating curated quote for today:', error);
    }
    // 5. Cache for the entire day (24 hours = 86400 seconds)
    memoryCachedQuote = { date: today, quote, author };
    if (redis_1.redis) {
        try {
            await redis_1.redis.set(cacheKey, { quote, author }, { ex: 86400 });
        }
        catch (e) {
            // safe
        }
    }
    return res.json({ quote, author, date: today });
});
const defaultSettings = {
    theme: 'light',
    font_family: 'inter',
    text_size: 'normal',
    line_spacing: 'normal',
    color_blind_mode: null,
    high_contrast: false,
    ai_tutor_name: 'Uni',
    ai_personality: 'neutral',
    ai_reading_level: 'intermediate',
    ai_tone: 'academic',
    learning_style: null,
    language: 'en',
    region: 'north-america',
    low_bandwidth: false,
    simplified_mode: false,
};
// GET /api/settings/accessibility - Graceful for both authenticated users and public visitors
router.get('/accessibility', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.json({ settings: defaultSettings });
        }
        const token = authHeader.split(' ')[1];
        const { data: authData, error: authError } = await supabase_1.supabaseAdmin.auth.getUser(token);
        if (authError || !authData?.user) {
            return res.json({ settings: defaultSettings });
        }
        const userId = authData.user.id;
        const supabase = (0, supabase_1.supabaseAsUser)(token);
        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .single();
        if (error && error.code !== 'PGRST116') {
            console.warn('Error fetching settings, returning defaults:', error);
            return res.json({ settings: defaultSettings });
        }
        if (!data) {
            // Create default settings if not exists
            const { data: newData, error: insertError } = await supabase
                .from('user_settings')
                .insert({ user_id: userId })
                .select('*')
                .single();
            if (insertError) {
                return res.json({ settings: defaultSettings });
            }
            return res.json({ settings: newData });
        }
        res.json({ settings: data });
    }
    catch (err) {
        res.json({ settings: defaultSettings });
    }
});
router.use(auth_1.authenticateUser);
// PATCH /api/settings/accessibility
router.patch('/accessibility', async (req, res) => {
    try {
        const updates = req.body;
        // Ensure we don't update user_id or other protected fields
        delete updates.user_id;
        delete updates.created_at;
        delete updates.id;
        delete updates.updated_at;
        const supabase = (0, supabase_1.supabaseAsUser)(req.user.jwt);
        const { data, error } = await supabase
            .from('user_settings')
            .update(updates)
            .eq('user_id', req.user.id)
            .select('*')
            .single();
        if (error) {
            console.error('Error updating settings:', error);
            return res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
        }
        res.json({ settings: data });
    }
    catch (err) {
        res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
});
exports.default = router;
