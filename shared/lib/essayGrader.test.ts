import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildEssayGraderPrompt,
  buildRubricGraderPrompt,
  buildPerfectEssayRewritePrompt,
  analyzeEssayDraftMetrics,
  humanizeEssayText,
  parseEssayReportJson,
  normalizeEssayReport,
  buildDeterministicEssayReport,
  type EssayGradingReport,
} from './essayGrader';

test('buildEssayGraderPrompt delimits untrusted prompt and essay and requests perfect_essay', () => {
  const prompt = 'Analyze the economic drivers of the Industrial Revolution.';
  const essay = 'The Industrial Revolution began in Britain in the eighteenth century and transformed agrarian economies into mechanized industrial hubs.';

  const fullPrompt = buildEssayGraderPrompt(prompt, essay);

  assert.match(fullPrompt, /<essay_prompt>[\s\S]*Analyze the economic drivers/);
  assert.match(fullPrompt, /<student_essay>[\s\S]*agrarian economies/);
  assert.match(fullPrompt, /perfect_essay/);
  assert.match(fullPrompt, /100\/100/);
});

test('parseEssayReportJson strips markdown fences and parses JSON payload with perfect_essay', () => {
  const raw = '```json\n{\n  "score": 84,\n  "grade": "A-",\n  "thesis_score": 85,\n  "evidence_score": 80,\n  "structure_score": 86,\n  "grammar_score": 88,\n  "feedback": "Strong thesis and clear progression.",\n  "strengths": ["Focused thesis"],\n  "weaknesses": ["Needs quantitative citations"],\n  "grammar": "Formal academic register.",\n  "perfect_essay": "Introduction paragraph.\\n\\nBody paragraph one with evidence.\\n\\nConclusion synthesizing the argument."\n}\n```';

  const parsed = parseEssayReportJson(raw);
  assert.ok(parsed);
  assert.equal(parsed.score, 84);
  assert.match(String(parsed.perfect_essay), /Body paragraph one/);
});

test('normalizeEssayReport clamps scores and guarantees non-empty perfect_essay even when omitted by LLM', () => {
  const partialReport = {
    score: 108,
    grade: 'A+',
    feedback: 'Outstanding essay.',
    strengths: ['Clear claim'],
    weaknesses: ['Deepen counterargument'],
  };

  const normalized: EssayGradingReport = normalizeEssayReport(
    partialReport,
    'Evaluate the impact of renewable energy grids on grid stability.',
    'Renewable energy sources like solar and wind introduce intermittency challenges, yet grid-scale battery storage and smart inverters allow utilities to balance frequency reliably.'
  );

  assert.equal(normalized.score, 100);
  assert.equal(normalized.overall_score, 100);
  assert.equal(normalized.thesis_score, 100);
  assert.ok(normalized.perfect_essay.length >= 200);
  assert.match(normalized.perfect_essay, /\n\n/);
  assert.deepEqual(normalized.improvements, normalized.weaknesses);
});

test('buildDeterministicEssayReport returns complete rubric and multi-paragraph 100/100 essay', () => {
  const prompt = 'Discuss how asymmetric encryption secures modern web communication.';
  const essay = 'Public key cryptography uses pairs of keys. Anyone can encrypt a message with the public key, while only the holder of the matching private key can decrypt it, enabling TLS handshakes across untrusted networks.';

  const report = buildDeterministicEssayReport(prompt, essay);

  assert.ok(report.score >= 60 && report.score <= 100);
  assert.ok(report.strengths.length >= 2);
  assert.ok(report.weaknesses.length >= 2);
  assert.ok(report.perfect_essay.length >= 250);
  assert.match(report.perfect_essay, /\n\n/);
});

test('buildRubricGraderPrompt delimits input and requests fast rubric JSON without embedded essay rewrite', () => {
  const rubricPrompt = buildRubricGraderPrompt(
    'Analyze zero-trust architecture in cloud networks.',
    'Zero trust verifies every request regardless of network perimeter and requires least privilege controls across microservices.'
  );

  assert.match(rubricPrompt, /<essay_prompt>/);
  assert.match(rubricPrompt, /<student_essay>/);
  assert.match(rubricPrompt, /thesis_score/);
  assert.match(rubricPrompt, /weaknesses/);
});

test('analyzeEssayDraftMetrics computes live word, sentence, paragraph, and readability telemetry', () => {
  const metrics = analyzeEssayDraftMetrics(
    'First paragraph sentence one. Sentence two is clear.\n\nSecond paragraph develops evidence and analysis with concrete facts.\n\nThird paragraph synthesizes conclusions effectively.'
  );

  assert.equal(metrics.paragraphs, 3);
  assert.equal(metrics.sentences, 4);
  assert.ok(metrics.words >= 20);
  assert.ok(metrics.avgWordsPerSentence >= 4);
  assert.equal(metrics.hasMultiParagraphStructure, true);
});

test('humanizeEssayText removes em-dashes, en-dashes, non-breaking hyphens, AI buzzwords, and markdown while keeping real hyphens', () => {
  const aiText =
    '## Model Essay\n\nIn today’s fast-paced world, we must **delve into** the multifaceted tapestry of urban policy — especially transit — because well‑known bottlenecks play a pivotal role in long-term growth.\n\nFurthermore, this is a testament to robust planning -- cities that leverage data succeed.';

  const cleaned = humanizeEssayText(aiText);

  assert.equal(/[\u2011\u2012\u2013\u2014\u2015]/.test(cleaned), false);
  assert.equal(/ -- /.test(cleaned), false);
  assert.equal(/delve into|tapestry|pivotal|multifaceted|testament to|fast-paced world|\*\*|##/i.test(cleaned), false);
  assert.match(cleaned, /well-known/);
  assert.match(cleaned, /long-term/);
});

test('buildPerfectEssayRewritePrompt embeds specific weaknesses and anti-AI-footprint rules', () => {
  const rewritePrompt = buildPerfectEssayRewritePrompt(
    'Analyze supply chain resilience after global disruptions.',
    'Supply chains broke down when single suppliers failed.',
    ['Add concrete historical examples', 'Address cost vs redundancy trade-offs'],
    'Avoid repetitive passive voice.'
  );

  assert.match(rewritePrompt, /Add concrete historical examples/);
  assert.match(rewritePrompt, /Address cost vs redundancy trade-offs/);
  assert.match(rewritePrompt, /Avoid repetitive passive voice/);
  assert.match(rewritePrompt, /em-?dash/i);
});
