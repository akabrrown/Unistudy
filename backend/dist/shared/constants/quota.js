"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FREE_DAILY_ALLOWANCES = exports.FEATURE_COSTS = exports.FEATURE_PROVIDER_MAP = exports.PROVIDER_CONFIG = void 0;
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
    slide_explanation: 2,
    flashcard_generation: 2,
    quiz_generation: 2,
    past_paper_grading: 2,
    past_paper_question: 2,
    lecture_tagging: 2,
    difficulty_rating: 2,
    topic_summary: 2,
    trend_analysis: 2,
    weakness_drill: 2,
    gap_filler: 2,
    semester_narrative: 2,
    handwriting_scan: 2,
    answer_improver: 2,
    study_poster: 2,
    cheat_sheet: 2,
    generate_mnemonics: 2,
    calculator: 1,
    chat_message: 1,
    debate_mode: 1,
    oral_exam: 1,
    revision_song: 1,
    daily_brief: 1,
    motivational_quote: 1,
    break_suggestion: 1,
    slide_embedding: 0,
    search_embedding: 0,
    flashcard_embedding: 0,
    semantic_search_rerank: 1,
    youtube_search: 1
};
// Every user gets these daily allowances for free, resets at midnight.
exports.FREE_DAILY_ALLOWANCES = {
    gemini: 50,
    groq70: 10,
    groq8: 20,
    cohere: 0, // Cohere has no free daily allowance, strictly uses credits or fallback if needed
    youtube: 3
};
