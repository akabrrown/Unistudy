import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GOLDEN_ESSAY_CASES,
  GOLDEN_FLASHCARD_CASES,
  GOLDEN_TUTOR_CASES,
} from './goldenDataset';
import {
  buildDeterministicEssayReport,
  humanizeEssayText,
  normalizeEssayReport,
} from '../lib/essayGrader';
import {
  buildGroundedFlashcardPrompt,
  parseFlashcardsJson,
} from '../lib/flashcardExtractor';
import {
  buildGroundedTutorPrompt,
  retrieveRelevantSlideChunks,
  sanitizeTutorResponse,
} from '../lib/aiTutor';

test('Golden Dataset coverage: at least 24 curated cases across Essay, Flashcard, and Tutor', () => {
  const total =
    GOLDEN_ESSAY_CASES.length + GOLDEN_FLASHCARD_CASES.length + GOLDEN_TUTOR_CASES.length;
  assert.ok(total >= 24, `Expected >= 24 golden cases, got ${total}`);
});

test('Essay Grader golden cases enforce bounded scores and zero AI footprints', () => {
  for (const item of GOLDEN_ESSAY_CASES) {
    const report = item.rawModelReport
      ? normalizeEssayReport(item.rawModelReport, item.prompt, item.essay)
      : buildDeterministicEssayReport(item.prompt, item.essay);

    assert.ok(
      report.score >= item.expectedScoreBand[0] && report.score <= item.expectedScoreBand[1],
      `${item.id}: score ${report.score} outside expected band ${item.expectedScoreBand.join('-')}`
    );
    assert.ok(report.perfect_essay.length >= 40, `${item.id}: missing perfect_essay`);

    if (item.mustNotContainFootprints) {
      assert.equal(/[\u2012\u2013\u2014\u2015\u2011]/.test(report.perfect_essay), false, `${item.id}: dash leaked`);
      assert.equal(
        /\b(delve|tapestry|pivotal|paramount|underscore|testament|seamless|myriad|plethora)\b/i.test(
          report.perfect_essay
        ),
        false,
        `${item.id}: AI buzzword leaked in ${item.id}`
      );
      assert.equal(/[\u2012\u2013\u2014\u2015]/.test(report.feedback), false, `${item.id}: dash in feedback`);
    }
  }

  // Ensure direct humanizer preserves compound hyphens cleanly
  assert.equal(
    humanizeEssayText('Well-known long-term strategies avoid em-dashes—completely.'),
    'Well-known long-term strategies avoid em-dashes, completely.'
  );
});

test('Flashcard golden cases enforce Zod schema, noise filtering, deduplication, and prompt delimiters', () => {
  for (const item of GOLDEN_FLASHCARD_CASES) {
    const prompt = buildGroundedFlashcardPrompt(item.slides);
    assert.ok(prompt.includes('<lecture_slides>'), `${item.id}: prompt missing untrusted-data delimiter`);
    assert.ok(prompt.includes('[Slide '), `${item.id}: prompt missing slide citation tags`);

    const cards = item.mockModelOutput
      ? parseFlashcardsJson(item.mockModelOutput)
      : [];

    if (item.mockModelOutput) {
      assert.ok(
        cards.length >= item.minCards && cards.length <= item.maxCards,
        `${item.id}: expected ${item.minCards}-${item.maxCards} cards, got ${cards.length}`
      );
    }

    for (const card of cards) {
      assert.ok(card.front.length >= 4 && card.back.length >= 10, `${item.id}: card violates min lengths`);
      for (const bad of item.forbiddenSubstrings) {
        assert.equal(
          card.front.includes(bad) || card.back.toLowerCase().includes(bad.toLowerCase()),
          false,
          `${item.id}: forbidden substring "${bad}" appeared in card`
        );
      }
      if (item.requireCitations) {
        assert.match(card.back, /\[Slide \d+\]/, `${item.id}: expected [Slide N] citation in back`);
      }
    }
  }
});

test('AI Tutor golden cases enforce slide RAG ranking, unanswerable detection, delimiters, and safe sanitization', () => {
  for (const item of GOLDEN_TUTOR_CASES) {
    const chunks = retrieveRelevantSlideChunks(
      item.question,
      item.slides,
      item.currentSlideNumber,
      4
    );

    if (item.expectLowConfidenceMatch) {
      assert.equal(chunks.length, 0, `${item.id}: expected 0 relevant chunks for out-of-scope/empty query`);
    } else {
      assert.ok(chunks.length >= 1, `${item.id}: expected >= 1 retrieved chunk`);
      if (item.expectedTopSlideNumber !== null) {
        assert.equal(
          chunks[0].slideNumber,
          item.expectedTopSlideNumber,
          `${item.id}: expected top slide ${item.expectedTopSlideNumber}, got ${chunks[0].slideNumber}`
        );
      }
    }

    const prompt = buildGroundedTutorPrompt({
      tutorName: 'Uni',
      courseContext: item.courseContext,
      currentSlideNumber: item.currentSlideNumber,
      currentSlideText: item.slides.find((s) => s.slide_number === item.currentSlideNumber)?.raw_text || '',
      retrievedChunks: chunks,
    });

    assert.ok(prompt.includes('<current_slide>'), `${item.id}: missing <current_slide> delimiter`);
    assert.ok(prompt.includes('[Slide '), `${item.id}: prompt missing citation instructions`);
    assert.match(prompt, /not covered|does not cover/i, `${item.id}: missing honest no-answer directive`);

    if (item.mockModelReply) {
      const sanitized = sanitizeTutorResponse(item.mockModelReply);
      for (const keep of item.expectedReplyMustPreserve || []) {
        assert.ok(sanitized.includes(keep), `${item.id}: sanitizer corrupted "${keep}"`);
      }
      for (const bad of item.forbiddenSubstrings || []) {
        assert.equal(
          sanitized.toLowerCase().includes(bad.toLowerCase()),
          false,
          `${item.id}: sanitizer left forbidden substring "${bad}"`
        );
      }
    }
  }
});
