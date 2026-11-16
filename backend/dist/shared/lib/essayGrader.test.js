"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const essayGrader_1 = require("./essayGrader");
(0, node_test_1.default)('buildEssayGraderPrompt delimits untrusted prompt and essay and requests perfect_essay', () => {
    const prompt = 'Analyze the economic drivers of the Industrial Revolution.';
    const essay = 'The Industrial Revolution began in Britain in the eighteenth century and transformed agrarian economies into mechanized industrial hubs.';
    const fullPrompt = (0, essayGrader_1.buildEssayGraderPrompt)(prompt, essay);
    strict_1.default.match(fullPrompt, /<essay_prompt>[\s\S]*Analyze the economic drivers/);
    strict_1.default.match(fullPrompt, /<student_essay>[\s\S]*agrarian economies/);
    strict_1.default.match(fullPrompt, /perfect_essay/);
    strict_1.default.match(fullPrompt, /100\/100/);
});
(0, node_test_1.default)('parseEssayReportJson strips markdown fences and parses JSON payload with perfect_essay', () => {
    const raw = '```json\n{\n  "score": 84,\n  "grade": "A-",\n  "thesis_score": 85,\n  "evidence_score": 80,\n  "structure_score": 86,\n  "grammar_score": 88,\n  "feedback": "Strong thesis and clear progression.",\n  "strengths": ["Focused thesis"],\n  "weaknesses": ["Needs quantitative citations"],\n  "grammar": "Formal academic register.",\n  "perfect_essay": "Introduction paragraph.\\n\\nBody paragraph one with evidence.\\n\\nConclusion synthesizing the argument."\n}\n```';
    const parsed = (0, essayGrader_1.parseEssayReportJson)(raw);
    strict_1.default.ok(parsed);
    strict_1.default.equal(parsed.score, 84);
    strict_1.default.match(String(parsed.perfect_essay), /Body paragraph one/);
});
(0, node_test_1.default)('normalizeEssayReport clamps scores and guarantees non-empty perfect_essay even when omitted by LLM', () => {
    const partialReport = {
        score: 108,
        grade: 'A+',
        feedback: 'Outstanding essay.',
        strengths: ['Clear claim'],
        weaknesses: ['Deepen counterargument'],
    };
    const normalized = (0, essayGrader_1.normalizeEssayReport)(partialReport, 'Evaluate the impact of renewable energy grids on grid stability.', 'Renewable energy sources like solar and wind introduce intermittency challenges, yet grid-scale battery storage and smart inverters allow utilities to balance frequency reliably.');
    strict_1.default.equal(normalized.score, 100);
    strict_1.default.equal(normalized.overall_score, 100);
    strict_1.default.equal(normalized.thesis_score, 100);
    strict_1.default.ok(normalized.perfect_essay.length >= 200);
    strict_1.default.match(normalized.perfect_essay, /\n\n/);
    strict_1.default.deepEqual(normalized.improvements, normalized.weaknesses);
});
(0, node_test_1.default)('buildDeterministicEssayReport returns complete rubric and multi-paragraph 100/100 essay', () => {
    const prompt = 'Discuss how asymmetric encryption secures modern web communication.';
    const essay = 'Public key cryptography uses pairs of keys. Anyone can encrypt a message with the public key, while only the holder of the matching private key can decrypt it, enabling TLS handshakes across untrusted networks.';
    const report = (0, essayGrader_1.buildDeterministicEssayReport)(prompt, essay);
    strict_1.default.ok(report.score >= 60 && report.score <= 100);
    strict_1.default.ok(report.strengths.length >= 2);
    strict_1.default.ok(report.weaknesses.length >= 2);
    strict_1.default.ok(report.perfect_essay.length >= 250);
    strict_1.default.match(report.perfect_essay, /\n\n/);
});
(0, node_test_1.default)('buildRubricGraderPrompt delimits input and requests fast rubric JSON without embedded essay rewrite', () => {
    const rubricPrompt = (0, essayGrader_1.buildRubricGraderPrompt)('Analyze zero-trust architecture in cloud networks.', 'Zero trust verifies every request regardless of network perimeter and requires least privilege controls across microservices.');
    strict_1.default.match(rubricPrompt, /<essay_prompt>/);
    strict_1.default.match(rubricPrompt, /<student_essay>/);
    strict_1.default.match(rubricPrompt, /thesis_score/);
    strict_1.default.match(rubricPrompt, /weaknesses/);
});
(0, node_test_1.default)('analyzeEssayDraftMetrics computes live word, sentence, paragraph, and readability telemetry', () => {
    const metrics = (0, essayGrader_1.analyzeEssayDraftMetrics)('First paragraph sentence one. Sentence two is clear.\n\nSecond paragraph develops evidence and analysis with concrete facts.\n\nThird paragraph synthesizes conclusions effectively.');
    strict_1.default.equal(metrics.paragraphs, 3);
    strict_1.default.equal(metrics.sentences, 4);
    strict_1.default.ok(metrics.words >= 20);
    strict_1.default.ok(metrics.avgWordsPerSentence >= 4);
    strict_1.default.equal(metrics.hasMultiParagraphStructure, true);
});
(0, node_test_1.default)('humanizeEssayText removes em-dashes, en-dashes, non-breaking hyphens, AI buzzwords, and markdown while keeping real hyphens', () => {
    const aiText = '## Model Essay\n\nIn today’s fast-paced world, we must **delve into** the multifaceted tapestry of urban policy — especially transit — because well‑known bottlenecks play a pivotal role in long-term growth.\n\nFurthermore, this is a testament to robust planning -- cities that leverage data succeed.';
    const cleaned = (0, essayGrader_1.humanizeEssayText)(aiText);
    strict_1.default.equal(/[\u2011\u2012\u2013\u2014\u2015]/.test(cleaned), false);
    strict_1.default.equal(/ -- /.test(cleaned), false);
    strict_1.default.equal(/delve into|tapestry|pivotal|multifaceted|testament to|fast-paced world|\*\*|##/i.test(cleaned), false);
    strict_1.default.match(cleaned, /well-known/);
    strict_1.default.match(cleaned, /long-term/);
});
(0, node_test_1.default)('buildPerfectEssayRewritePrompt embeds specific weaknesses and anti-AI-footprint rules', () => {
    const rewritePrompt = (0, essayGrader_1.buildPerfectEssayRewritePrompt)('Analyze supply chain resilience after global disruptions.', 'Supply chains broke down when single suppliers failed.', ['Add concrete historical examples', 'Address cost vs redundancy trade-offs'], 'Avoid repetitive passive voice.');
    strict_1.default.match(rewritePrompt, /Add concrete historical examples/);
    strict_1.default.match(rewritePrompt, /Address cost vs redundancy trade-offs/);
    strict_1.default.match(rewritePrompt, /Avoid repetitive passive voice/);
    strict_1.default.match(rewritePrompt, /em-?dash/i);
});
