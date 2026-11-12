import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyResponseGrounding } from './groundingVerifier';
import {
  expectedEloScore,
  updateEloPair,
  rankPromptVariants,
} from '../evals/promptOptimizer';
import {
  evaluateSafetyNonCompensatory,
  computeReleaseGate,
  type EvalReceipt,
} from '../evals/qaContracts';

test('verifyResponseGrounding flags phantom citations and contradictory numeric claims', () => {
  const sources = [
    {
      slideNumber: 1,
      text: 'Paris is the capital of France with a population of 67 million.',
    },
  ];

  const badAnswer =
    'Paris is the capital of France [Slide 1]. Its population is 69 million [Slide 99].';
  const result = verifyResponseGrounding(badAnswer, sources);

  assert.deepEqual(result.phantomCitations, [99]);
  assert.ok(result.unsupportedSpans.length >= 1, 'Expected contradictory numeric span to be flagged');
  assert.ok(result.groundedRatio < 1);
});

test('verifyResponseGrounding passes fully grounded cited answers and ignores explicit outside-lecture disclaimers', () => {
  const sources = [
    {
      slideNumber: 2,
      text: 'B-Tree indexing achieves O(log n) lookup complexity compared to O(n) sequential scans.',
    },
  ];

  const goodAnswer =
    'B-Tree indexing keeps O(log n) lookup complexity instead of O(n) sequential scans [Slide 2].\n\nGeneral background (outside lecture): Databases store B-Tree pages on disk blocks of 8KB.';
  const result = verifyResponseGrounding(goodAnswer, sources);

  assert.deepEqual(result.phantomCitations, []);
  assert.equal(result.unsupportedSpans.length, 0);
  assert.equal(result.groundedRatio, 1);
});

test('promptOptimizer computes valid ELO updates and rankings', () => {
  const exp = expectedEloScore(1200, 1200);
  assert.equal(exp, 0.5);

  const [winElo, loseElo] = updateEloPair(1200, 1200, 1);
  assert.ok(winElo > 1200 && loseElo < 1200);

  const ranked = rankPromptVariants([
    { id: 'prompt-a', elo: 1180, wins: 1, losses: 3, ties: 0 },
    { id: 'prompt-b', elo: 1245, wins: 3, losses: 1, ties: 0 },
  ]);
  assert.equal(ranked[0].id, 'prompt-b');
});

test('qaContracts enforces non-compensatory safety failures and release gate', () => {
  const receipts: EvalReceipt[] = [
    {
      id: 'case-1',
      status: 'PASS',
      safetyViolations: [],
      deterministicScore: 1,
    },
    {
      id: 'case-2',
      status: 'FAIL',
      safetyViolations: ['prompt_injection_leak'],
      deterministicScore: 0.95,
    },
  ];

  assert.equal(evaluateSafetyNonCompensatory(receipts), false);
  const gate = computeReleaseGate(receipts, 0.8);
  assert.equal(gate.approved, false);
  assert.equal(gate.reason, 'NON_COMPENSATORY_SAFETY_VIOLATION');
});

