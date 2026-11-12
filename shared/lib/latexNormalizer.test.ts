import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLatexMarkdown } from './latexNormalizer';
import { buildGroundedTutorPrompt } from './aiTutor';

test('normalizeLatexMarkdown converts MixTeX/bracket delimiters to KaTeX $ and $$ and strips markdown fences', () => {
  const raw = '```markdown\n## Calculus Notes\nInline formula: \\(E = mc^2\\) and block:\n\\[\n\\int_0^1 x^2 dx = \\frac{1}{3}\n\\]\n```';
  const normalized = normalizeLatexMarkdown(raw);

  assert.equal(normalized.includes('```markdown'), false);
  assert.ok(normalized.includes('$E = mc^2$'));
  assert.ok(normalized.includes('$$\n\\int_0^1 x^2 dx = \\frac{1}{3}\n$$'));
});

test('buildGroundedTutorPrompt integrates Mr. Ranedeer student personalization and /test or /plan modes cleanly', () => {
  const prompt = buildGroundedTutorPrompt({
    tutorName: 'Uni',
    courseContext: 'Quantum Physics',
    currentSlideNumber: 3,
    currentSlideText: 'Photoelectric effect threshold frequency',
    studentConfig: {
      readingLevel: 'Undergraduate',
      learningStyle: 'Visual',
      communicationStyle: 'Socratic',
      tone: 'Encouraging',
      reasoningFramework: 'Causal',
      language: 'en',
    },
    commandMode: 'test',
  });

  assert.ok(prompt.includes('Socratic'));
  assert.ok(prompt.includes('Causal'));
  assert.ok(prompt.includes('Visual'));
  assert.match(prompt, /practice questions|assess/i);
  // Ensure no spammy third-party Discord promotions leaked
  assert.equal(/discord\.gg/i.test(prompt), false);
});

