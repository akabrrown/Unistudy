import 'dotenv/config';
import Groq from 'groq-sdk';
import { GROQ_SMART_MODELS } from '../constants/aiModels';
import {
  GOLDEN_ESSAY_CASES,
  GOLDEN_FLASHCARD_CASES,
  GOLDEN_TUTOR_CASES,
} from './goldenDataset';
import {
  buildRubricGraderPrompt,
  normalizeEssayReport,
  parseEssayReportJson,
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
import { verifyResponseGrounding } from '../lib/groundingVerifier';
import { computeReleaseGate, type EvalReceipt } from './qaContracts';

async function callGroq(
  groq: Groq,
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  temperature: number,
  jsonMode = false
): Promise<string> {
  for (const model of GROQ_SMART_MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages,
        temperature,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (text) return text;
    } catch (err) {
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

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const receipts: EvalReceipt[] = [];

  console.log('--- Running Essay Grader Live Evals ---');
  for (const item of GOLDEN_ESSAY_CASES) {
    const raw = await callGroq(
      groq,
      [{ role: 'user', content: buildRubricGraderPrompt(item.prompt, item.essay) }],
      0.2,
      true
    );
    const parsed = parseEssayReportJson(raw);
    const report = normalizeEssayReport(parsed, item.prompt, item.essay);
    const inBand =
      report.score >= item.expectedScoreBand[0] && report.score <= item.expectedScoreBand[1];
    const clean =
      !/[\u2012\u2013\u2014\u2015\u2011]/.test(report.feedback + report.perfect_essay);

    const violations: EvalReceipt['safetyViolations'] = [];
    if (!parsed) violations.push('schema_violation');
    if (!clean) violations.push('ai_footprint_leak');
    const ok = Boolean(parsed) && inBand && clean;
    receipts.push({
      id: item.id,
      status: ok ? 'PASS' : 'FAIL',
      safetyViolations: violations,
      deterministicScore: ok ? 1 : 0,
    });
    console.log(
      `[${ok ? 'PASS' : 'FAIL'}] ${item.id} | score=${report.score} (expected ${item.expectedScoreBand.join('-')}) | clean=${clean}`
    );
  }

  console.log('\n--- Running Flashcards Live Evals ---');
  for (const item of GOLDEN_FLASHCARD_CASES.filter((c) => c.category !== 'empty')) {
    const raw = await callGroq(
      groq,
      [{ role: 'user', content: buildGroundedFlashcardPrompt(item.slides) }],
      0.2,
      true
    );
    const cards = parseFlashcardsJson(raw);
    const countOk = cards.length >= 1 && cards.length <= 20;
    const forbiddenFound = cards.some((c) =>
      item.forbiddenSubstrings.some(
        (bad) =>
          c.front.toLowerCase().includes(bad.toLowerCase()) ||
          c.back.toLowerCase().includes(bad.toLowerCase())
      )
    );
    const violations: EvalReceipt['safetyViolations'] = [];
    if (!countOk) violations.push('schema_violation');
    if (forbiddenFound) violations.push('prompt_injection_leak');
    const ok = countOk && !forbiddenFound;
    receipts.push({
      id: item.id,
      status: ok ? 'PASS' : 'FAIL',
      safetyViolations: violations,
      deterministicScore: ok ? 1 : 0,
    });
    console.log(
      `[${ok ? 'PASS' : 'FAIL'}] ${item.id} | cards=${cards.length} | forbiddenFound=${forbiddenFound}`
    );
  }

  console.log('\n--- Running AI Tutor Live Evals (LettuceDetect Grounding) ---');
  for (const item of GOLDEN_TUTOR_CASES) {
    const chunks = retrieveRelevantSlideChunks(
      item.question,
      item.slides,
      item.currentSlideNumber,
      4
    );
    const systemPrompt = buildGroundedTutorPrompt({
      tutorName: 'Uni',
      courseContext: item.courseContext,
      currentSlideNumber: item.currentSlideNumber,
      currentSlideText:
        item.slides.find((s) => s.slide_number === item.currentSlideNumber)?.raw_text || '',
      retrievedChunks: chunks,
    });

    const rawReply = await callGroq(
      groq,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: item.question },
      ],
      0.55,
      false
    );
    const reply = sanitizeTutorResponse(rawReply);
    const clean = !/[\u2012\u2013\u2014\u2015\u2011]/.test(reply);
    const grounding = verifyResponseGrounding(
      reply,
      item.slides.map((s) => ({
        slideNumber: s.slide_number,
        text: `${s.raw_text} ${s.explanation || ''}`.trim(),
      }))
    );
    const matchesGapRule =
      item.category === 'unanswerable'
        ? /not covered|outside|does not cover|no.*information/i.test(reply)
        : item.expectLowConfidenceMatch
          ? true
          : /\[Slide \d+\]/.test(reply);

    const violations: EvalReceipt['safetyViolations'] = [];
    if (!clean) violations.push('ai_footprint_leak');
    if (grounding.phantomCitations.length > 0) violations.push('phantom_citation');
    const ok =
      reply.length > 20 &&
      clean &&
      matchesGapRule &&
      grounding.phantomCitations.length === 0;

    receipts.push({
      id: item.id,
      status: ok ? 'PASS' : 'FAIL',
      safetyViolations: violations,
      deterministicScore: grounding.groundedRatio,
    });
    console.log(
      `[${ok ? 'PASS' : 'FAIL'}] ${item.id} | grounded=${grounding.groundedRatio} | phantom=${grounding.phantomCitations.length} | clean=${clean}`
    );
  }

  const gate = computeReleaseGate(receipts, 0.9);
  console.log('\nRelease Gate:', gate);
  process.exit(gate.approved ? 0 : 1);
}

runLiveEvals().catch((err) => {
  console.error('Live eval failed:', err);
  process.exit(1);
});

