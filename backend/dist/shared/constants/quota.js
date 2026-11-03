"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CREDIT_BUNDLES = exports.FREE_DAILY_ALLOWANCES = exports.MODEL_MULTIPLIERS = exports.FEATURE_COSTS = exports.FEATURE_PROVIDER_MAP = exports.PROVIDER_CONFIG = void 0;
exports.PROVIDER_CONFIG = {
    gemini: { pool_type: 'credit_funded', has_user_quota: true, user_quota_column: 'gemini' },
    groq_70b: { pool_type: 'credit_funded', has_user_quota: true, user_quota_column: 'groq70' },
    groq_8b: { pool_type: 'credit_funded', has_user_quota: true, user_quota_column: 'groq8' },
    huggingface: { pool_type: 'free_rate_limit', has_user_quota: false },
    mistral: { pool_type: 'credit_funded', has_user_quota: false }, // fallback
    cohere: { pool_type: 'credit_funded', has_user_quota: true, user_quota_column: 'cohere' },
    openrouter: { pool_type: 'free_rate_limit', has_user_quota: false }, // fallback
    cloudflare: { pool_type: 'free_daily', has_user_quota: false }, // fallback
    youtube: { pool_type: 'credit_funded', has_user_quota: true, user_quota_column: 'youtube' }
};
exports.FEATURE_PROVIDER_MAP = {
    slide_explanation: 'gemini',
    flashcard_generation: 'gemini',
    quiz_generation: 'gemini',
    past_paper_grading: 'gemini',
    past_paper_question: 'gemini',
    lecture_tagging: 'gemini',
    difficulty_rating: 'gemini',
    topic_summary: 'gemini',
    trend_analysis: 'gemini',
    weakness_drill: 'gemini',
    gap_filler: 'gemini',
    semester_narrative: 'gemini',
    handwriting_scan: 'gemini',
    answer_improver: 'gemini',
    calculator: 'groq_70b',
    chat_message: 'groq_70b',
    debate_mode: 'groq_70b',
    oral_exam: 'groq_70b',
    daily_brief: 'groq_8b',
    motivational_quote: 'groq_8b',
    break_suggestion: 'groq_8b',
    slide_embedding: 'huggingface',
    search_embedding: 'huggingface',
    flashcard_embedding: 'huggingface',
    semantic_search_rerank: 'cohere',
    youtube_search: 'youtube',
    revision_song: 'groq_70b',
    study_poster: 'gemini',
    cheat_sheet: 'gemini',
    generate_mnemonics: 'gemini'
};
exports.FEATURE_COSTS = {
    slide_explanation: 200,
    flashcard_generation: 200,
    quiz_generation: 200,
    past_paper_grading: 200,
    past_paper_question: 200,
    lecture_tagging: 200,
    difficulty_rating: 200,
    topic_summary: 200,
    trend_analysis: 200,
    weakness_drill: 200,
    gap_filler: 200,
    semester_narrative: 200,
    handwriting_scan: 200,
    answer_improver: 200,
    study_poster: 200,
    cheat_sheet: 200,
    generate_mnemonics: 200,
    calculator: 100,
    chat_message: 100,
    debate_mode: 100,
    oral_exam: 100,
    revision_song: 100,
    daily_brief: 100,
    motivational_quote: 100,
    break_suggestion: 100,
    slide_embedding: 0,
    search_embedding: 0,
    flashcard_embedding: 0,
    semantic_search_rerank: 100,
    youtube_search: 100
};
exports.MODEL_MULTIPLIERS = {
    'fast': 0.5, // e.g. Gemini Flash, Groq 8B
    'smart': 2.0, // e.g. Gemini Pro, Groq 70B
    'default': 1.0
};
// Every user gets these daily allowances for free, resets at midnight.
exports.FREE_DAILY_ALLOWANCES = {
    gemini: 5000,
    groq70: 1000,
    groq8: 2000,
    cohere: 0, // Cohere has no free daily allowance, strictly uses credits or fallback if needed
    youtube: 300
};
exports.CREDIT_BUNDLES = {
    starter: { price: 10, credits: 10000 },
    standard: { price: 25, credits: 30000 },
    value: { price: 50, credits: 70000 },
    bulk: { price: 100, credits: 160000 }
};
