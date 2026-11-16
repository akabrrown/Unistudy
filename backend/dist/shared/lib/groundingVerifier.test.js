"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const groundingVerifier_1 = require("./groundingVerifier");
const promptOptimizer_1 = require("../evals/promptOptimizer");
const qaContracts_1 = require("../evals/qaContracts");
(0, node_test_1.default)('verifyResponseGrounding flags phantom citations and contradictory numeric claims', () => {
    const sources = [
        {
            slideNumber: 1,
            text: 'Paris is the capital of France with a population of 67 million.',
        },
    ];
    const badAnswer = 'Paris is the capital of France [Slide 1]. Its population is 69 million [Slide 99].';
    const result = (0, groundingVerifier_1.verifyResponseGrounding)(badAnswer, sources);
    strict_1.default.deepEqual(result.phantomCitations, [99]);
    strict_1.default.ok(result.unsupportedSpans.length >= 1, 'Expected contradictory numeric span to be flagged');
    strict_1.default.ok(result.groundedRatio < 1);
});
(0, node_test_1.default)('verifyResponseGrounding passes fully grounded cited answers and ignores explicit outside-lecture disclaimers', () => {
    const sources = [
        {
            slideNumber: 2,
            text: 'B-Tree indexing achieves O(log n) lookup complexity compared to O(n) sequential scans.',
        },
    ];
    const goodAnswer = 'B-Tree indexing keeps O(log n) lookup complexity instead of O(n) sequential scans [Slide 2].\n\nGeneral background (outside lecture): Databases store B-Tree pages on disk blocks of 8KB.';
    const result = (0, groundingVerifier_1.verifyResponseGrounding)(goodAnswer, sources);
    strict_1.default.deepEqual(result.phantomCitations, []);
    strict_1.default.equal(result.unsupportedSpans.length, 0);
    strict_1.default.equal(result.groundedRatio, 1);
});
(0, node_test_1.default)('promptOptimizer computes valid ELO updates and rankings', () => {
    const exp = (0, promptOptimizer_1.expectedEloScore)(1200, 1200);
    strict_1.default.equal(exp, 0.5);
    const [winElo, loseElo] = (0, promptOptimizer_1.updateEloPair)(1200, 1200, 1);
    strict_1.default.ok(winElo > 1200 && loseElo < 1200);
    const ranked = (0, promptOptimizer_1.rankPromptVariants)([
        { id: 'prompt-a', elo: 1180, wins: 1, losses: 3, ties: 0 },
        { id: 'prompt-b', elo: 1245, wins: 3, losses: 1, ties: 0 },
    ]);
    strict_1.default.equal(ranked[0].id, 'prompt-b');
});
(0, node_test_1.default)('qaContracts enforces non-compensatory safety failures and release gate', () => {
    const receipts = [
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
    strict_1.default.equal((0, qaContracts_1.evaluateSafetyNonCompensatory)(receipts), false);
    const gate = (0, qaContracts_1.computeReleaseGate)(receipts, 0.8);
    strict_1.default.equal(gate.approved, false);
    strict_1.default.equal(gate.reason, 'NON_COMPENSATORY_SAFETY_VIOLATION');
});
