"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const goldenDataset_1 = require("./goldenDataset");
const examFocus_1 = require("../lib/examFocus");
const essayGrader_1 = require("../lib/essayGrader");
const flashcardExtractor_1 = require("../lib/flashcardExtractor");
const aiTutor_1 = require("../lib/aiTutor");
(0, node_test_1.default)('Golden Dataset coverage: at least 28 curated cases across Essay, Flashcard, Tutor, and Exam Focus', () => {
    const total = goldenDataset_1.GOLDEN_ESSAY_CASES.length +
        goldenDataset_1.GOLDEN_FLASHCARD_CASES.length +
        goldenDataset_1.GOLDEN_TUTOR_CASES.length +
        goldenDataset_1.GOLDEN_EXAM_FOCUS_CASES.length;
    strict_1.default.ok(total >= 28, `Expected >= 28 golden cases, got ${total}`);
});
(0, node_test_1.default)('Essay Grader golden cases enforce bounded scores and zero AI footprints', () => {
    for (const item of goldenDataset_1.GOLDEN_ESSAY_CASES) {
        const report = item.rawModelReport
            ? (0, essayGrader_1.normalizeEssayReport)(item.rawModelReport, item.prompt, item.essay)
            : (0, essayGrader_1.buildDeterministicEssayReport)(item.prompt, item.essay);
        strict_1.default.ok(report.score >= item.expectedScoreBand[0] && report.score <= item.expectedScoreBand[1], `${item.id}: score ${report.score} outside expected band ${item.expectedScoreBand.join('-')}`);
        strict_1.default.ok(report.perfect_essay.length >= 40, `${item.id}: missing perfect_essay`);
        if (item.mustNotContainFootprints) {
            strict_1.default.equal(/[\u2012\u2013\u2014\u2015\u2011]/.test(report.perfect_essay), false, `${item.id}: dash leaked`);
            strict_1.default.equal(/\b(delve|tapestry|pivotal|paramount|underscore|testament|seamless|myriad|plethora)\b/i.test(report.perfect_essay), false, `${item.id}: AI buzzword leaked in ${item.id}`);
            strict_1.default.equal(/[\u2012\u2013\u2014\u2015]/.test(report.feedback), false, `${item.id}: dash in feedback`);
        }
    }
    // Ensure direct humanizer preserves compound hyphens cleanly
    strict_1.default.equal((0, essayGrader_1.humanizeEssayText)('Well-known long-term strategies avoid em-dashes—completely.'), 'Well-known long-term strategies avoid em-dashes, completely.');
});
(0, node_test_1.default)('Flashcard golden cases enforce Zod schema, noise filtering, deduplication, and prompt delimiters', () => {
    for (const item of goldenDataset_1.GOLDEN_FLASHCARD_CASES) {
        const prompt = (0, flashcardExtractor_1.buildGroundedFlashcardPrompt)(item.slides);
        strict_1.default.ok(prompt.includes('<lecture_slides>'), `${item.id}: prompt missing untrusted-data delimiter`);
        strict_1.default.ok(prompt.includes('[Slide '), `${item.id}: prompt missing slide citation tags`);
        const cards = item.mockModelOutput
            ? (0, flashcardExtractor_1.parseFlashcardsJson)(item.mockModelOutput)
            : [];
        if (item.mockModelOutput) {
            strict_1.default.ok(cards.length >= item.minCards && cards.length <= item.maxCards, `${item.id}: expected ${item.minCards}-${item.maxCards} cards, got ${cards.length}`);
        }
        for (const card of cards) {
            strict_1.default.ok(card.front.length >= 4 && card.back.length >= 10, `${item.id}: card violates min lengths`);
            for (const bad of item.forbiddenSubstrings) {
                strict_1.default.equal(card.front.includes(bad) || card.back.toLowerCase().includes(bad.toLowerCase()), false, `${item.id}: forbidden substring "${bad}" appeared in card`);
            }
            if (item.requireCitations) {
                strict_1.default.match(card.back, /\[Slide \d+\]/, `${item.id}: expected [Slide N] citation in back`);
            }
        }
    }
});
(0, node_test_1.default)('AI Tutor golden cases enforce slide RAG ranking, unanswerable detection, delimiters, and safe sanitization', () => {
    for (const item of goldenDataset_1.GOLDEN_TUTOR_CASES) {
        const chunks = (0, aiTutor_1.retrieveRelevantSlideChunks)(item.question, item.slides, item.currentSlideNumber, 4);
        if (item.expectLowConfidenceMatch) {
            strict_1.default.equal(chunks.length, 0, `${item.id}: expected 0 relevant chunks for out-of-scope/empty query`);
        }
        else {
            strict_1.default.ok(chunks.length >= 1, `${item.id}: expected >= 1 retrieved chunk`);
            if (item.expectedTopSlideNumber !== null) {
                strict_1.default.equal(chunks[0].slideNumber, item.expectedTopSlideNumber, `${item.id}: expected top slide ${item.expectedTopSlideNumber}, got ${chunks[0].slideNumber}`);
            }
        }
        const prompt = (0, aiTutor_1.buildGroundedTutorPrompt)({
            tutorName: 'Uni',
            courseContext: item.courseContext,
            currentSlideNumber: item.currentSlideNumber,
            currentSlideText: item.slides.find((s) => s.slide_number === item.currentSlideNumber)?.raw_text || '',
            retrievedChunks: chunks,
        });
        strict_1.default.ok(prompt.includes('<current_slide>'), `${item.id}: missing <current_slide> delimiter`);
        strict_1.default.ok(prompt.includes('[Slide '), `${item.id}: prompt missing citation instructions`);
        strict_1.default.match(prompt, /not covered|does not cover/i, `${item.id}: missing honest no-answer directive`);
        if (item.mockModelReply) {
            const sanitized = (0, aiTutor_1.sanitizeTutorResponse)(item.mockModelReply);
            for (const keep of item.expectedReplyMustPreserve || []) {
                strict_1.default.ok(sanitized.includes(keep), `${item.id}: sanitizer corrupted "${keep}"`);
            }
            for (const bad of item.forbiddenSubstrings || []) {
                strict_1.default.equal(sanitized.toLowerCase().includes(bad.toLowerCase()), false, `${item.id}: sanitizer left forbidden substring "${bad}"`);
            }
        }
    }
});
(0, node_test_1.default)('Exam Focus golden cases enforce retrieval accuracy, coverage gap honesty, XML delimiters, and zero phantom/AI footprints', () => {
    for (const item of goldenDataset_1.GOLDEN_EXAM_FOCUS_CASES) {
        const areas = (0, examFocus_1.parseLecturerAreasInput)(item.rawAreasInput);
        const matched = (0, examFocus_1.matchSlidesAndQuestionsToAreas)({
            areas,
            slides: item.slides,
            questions: item.questions,
        });
        strict_1.default.equal(matched.matchedSlides.length, item.expectedMatchedSlideCount, `${item.id}: expected ${item.expectedMatchedSlideCount} slides, got ${matched.matchedSlides.length}`);
        strict_1.default.equal(matched.matchedQuestions.length, item.expectedMatchedQuestionCount, `${item.id}: expected ${item.expectedMatchedQuestionCount} questions, got ${matched.matchedQuestions.length}`);
        if (item.expectedGapMissingQuestions) {
            strict_1.default.ok(matched.coverageGaps.some((g) => g.missing_questions), `${item.id}: expected missing_questions gap flag`);
        }
        const prompt = (0, examFocus_1.buildExamFocusSynthesisPrompt)({
            courseCode: item.courseCode,
            courseTitle: item.courseTitle,
            areas,
            matchedSlides: matched.matchedSlides,
            matchedQuestions: matched.matchedQuestions,
            coverageGaps: matched.coverageGaps,
        });
        strict_1.default.ok(prompt.includes('<lecturer_areas>'), `${item.id}: missing <lecturer_areas>`);
        strict_1.default.ok(prompt.includes('<matched_slides>'), `${item.id}: missing <matched_slides>`);
        strict_1.default.ok(prompt.includes('<matched_past_questions>'), `${item.id}: missing <matched_past_questions>`);
        if (item.mockSynthesisOutput) {
            const summaries = (0, examFocus_1.parseExamFocusSynthesisJson)(item.mockSynthesisOutput, {
                areas,
                matchedSlides: matched.matchedSlides,
                matchedQuestions: matched.matchedQuestions,
                coverageGaps: matched.coverageGaps,
            });
            const serialized = JSON.stringify(summaries);
            for (const bad of item.forbiddenSubstrings || []) {
                strict_1.default.equal(serialized.toLowerCase().includes(bad.toLowerCase()), false, `${item.id}: leaked forbidden substring "${bad}"`);
            }
        }
    }
});
