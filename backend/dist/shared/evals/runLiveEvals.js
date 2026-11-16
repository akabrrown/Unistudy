"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const aiModels_1 = require("../constants/aiModels");
const goldenDataset_1 = require("./goldenDataset");
const essayGrader_1 = require("../lib/essayGrader");
const flashcardExtractor_1 = require("../lib/flashcardExtractor");
const aiTutor_1 = require("../lib/aiTutor");
const groundingVerifier_1 = require("../lib/groundingVerifier");
const qaContracts_1 = require("./qaContracts");
async function callGroq(groq, messages, temperature, jsonMode = false) {
    for (const model of aiModels_1.GROQ_SMART_MODELS) {
        try {
            const completion = await groq.chat.completions.create({
                model,
                messages,
                temperature,
                ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
            });
            const text = completion.choices[0]?.message?.content?.trim();
            if (text)
                return text;
        }
        catch (err) {
            console.warn(`[Eval] Model ${model} failed:`, err instanceof Error ? err.message : err);
        }
    }
    throw new Error('All Groq models failed during live eval');
}
async function runLiveEvals() {
    if (!process.env.GROQ_API_KEY) {
        console.error('GROQ_API_KEY is required to run live model evaluations.');
        process.exit(1);
    }
    const groq = new groq_sdk_1.default({ apiKey: process.env.GROQ_API_KEY });
    const receipts = [];
    console.log('--- Running Essay Grader Live Evals ---');
    for (const item of goldenDataset_1.GOLDEN_ESSAY_CASES) {
        const raw = await callGroq(groq, [{ role: 'user', content: (0, essayGrader_1.buildRubricGraderPrompt)(item.prompt, item.essay) }], 0.2, true);
        const parsed = (0, essayGrader_1.parseEssayReportJson)(raw);
        const report = (0, essayGrader_1.normalizeEssayReport)(parsed, item.prompt, item.essay);
        const inBand = report.score >= item.expectedScoreBand[0] && report.score <= item.expectedScoreBand[1];
        const clean = !/[\u2012\u2013\u2014\u2015\u2011]/.test(report.feedback + report.perfect_essay);
        const violations = [];
        if (!parsed)
            violations.push('schema_violation');
        if (!clean)
            violations.push('ai_footprint_leak');
        const ok = Boolean(parsed) && inBand && clean;
        receipts.push({
            id: item.id,
            status: ok ? 'PASS' : 'FAIL',
            safetyViolations: violations,
            deterministicScore: ok ? 1 : 0,
        });
        console.log(`[${ok ? 'PASS' : 'FAIL'}] ${item.id} | score=${report.score} (expected ${item.expectedScoreBand.join('-')}) | clean=${clean}`);
    }
    console.log('\n--- Running Flashcards Live Evals ---');
    for (const item of goldenDataset_1.GOLDEN_FLASHCARD_CASES.filter((c) => c.category !== 'empty')) {
        const raw = await callGroq(groq, [{ role: 'user', content: (0, flashcardExtractor_1.buildGroundedFlashcardPrompt)(item.slides) }], 0.2, true);
        const cards = (0, flashcardExtractor_1.parseFlashcardsJson)(raw);
        const countOk = cards.length >= 1 && cards.length <= 20;
        const forbiddenFound = cards.some((c) => item.forbiddenSubstrings.some((bad) => c.front.toLowerCase().includes(bad.toLowerCase()) ||
            c.back.toLowerCase().includes(bad.toLowerCase())));
        const violations = [];
        if (!countOk)
            violations.push('schema_violation');
        if (forbiddenFound)
            violations.push('prompt_injection_leak');
        const ok = countOk && !forbiddenFound;
        receipts.push({
            id: item.id,
            status: ok ? 'PASS' : 'FAIL',
            safetyViolations: violations,
            deterministicScore: ok ? 1 : 0,
        });
        console.log(`[${ok ? 'PASS' : 'FAIL'}] ${item.id} | cards=${cards.length} | forbiddenFound=${forbiddenFound}`);
    }
    console.log('\n--- Running AI Tutor Live Evals (LettuceDetect Grounding) ---');
    for (const item of goldenDataset_1.GOLDEN_TUTOR_CASES) {
        const chunks = (0, aiTutor_1.retrieveRelevantSlideChunks)(item.question, item.slides, item.currentSlideNumber, 4);
        const systemPrompt = (0, aiTutor_1.buildGroundedTutorPrompt)({
            tutorName: 'Uni',
            courseContext: item.courseContext,
            currentSlideNumber: item.currentSlideNumber,
            currentSlideText: item.slides.find((s) => s.slide_number === item.currentSlideNumber)?.raw_text || '',
            retrievedChunks: chunks,
        });
        const rawReply = await callGroq(groq, [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: item.question },
        ], 0.55, false);
        const reply = (0, aiTutor_1.sanitizeTutorResponse)(rawReply);
        const clean = !/[\u2012\u2013\u2014\u2015\u2011]/.test(reply);
        const grounding = (0, groundingVerifier_1.verifyResponseGrounding)(reply, item.slides.map((s) => ({
            slideNumber: s.slide_number,
            text: `${s.raw_text} ${s.explanation || ''}`.trim(),
        })));
        const matchesGapRule = item.category === 'unanswerable'
            ? /not covered|outside|does not cover|no.*information/i.test(reply)
            : item.expectLowConfidenceMatch
                ? true
                : /\[Slide \d+\]/.test(reply);
        const violations = [];
        if (!clean)
            violations.push('ai_footprint_leak');
        if (grounding.phantomCitations.length > 0)
            violations.push('phantom_citation');
        const ok = reply.length > 20 &&
            clean &&
            matchesGapRule &&
            grounding.phantomCitations.length === 0;
        receipts.push({
            id: item.id,
            status: ok ? 'PASS' : 'FAIL',
            safetyViolations: violations,
            deterministicScore: grounding.groundedRatio,
        });
        console.log(`[${ok ? 'PASS' : 'FAIL'}] ${item.id} | grounded=${grounding.groundedRatio} | phantom=${grounding.phantomCitations.length} | clean=${clean}`);
    }
    const gate = (0, qaContracts_1.computeReleaseGate)(receipts, 0.9);
    console.log('\nRelease Gate:', gate);
    process.exit(gate.approved ? 0 : 1);
}
runLiveEvals().catch((err) => {
    console.error('Live eval failed:', err);
    process.exit(1);
});
