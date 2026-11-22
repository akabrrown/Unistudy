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

test('buildGroundedTutorPrompt enforces strict tutor identity, chosen personality mandate and tone', () => {
  const strictPrompt = buildGroundedTutorPrompt({
    tutorName: 'Dr. Mensah',
    tutorPersonality: 'strict',
    courseContext: 'Corporate Financial Accounting',
    currentSlideNumber: 5,
    currentSlideText: 'Depreciation under IAS 16 vs Tax Capital Allowances',
    studentConfig: {
      readingLevel: 'Undergraduate',
      tone: 'academic',
    },
  });

  assert.ok(strictPrompt.includes('Dr. Mensah'));
  assert.ok(strictPrompt.includes('<tutor_identity>'));
  assert.ok(strictPrompt.includes('STRICT & RIGOROUS'));
  assert.ok(strictPrompt.includes('ACADEMIC & SCHOLARLY'));
  assert.match(strictPrompt, /distinction|precision/i);

  const casualEmpatheticPrompt = buildGroundedTutorPrompt({
    tutorName: 'Sophia',
    tutorPersonality: 'empathetic',
    courseContext: 'Macroeconomics',
    studentConfig: {
      tone: 'casual',
    },
  });

  assert.ok(casualEmpatheticPrompt.includes('Sophia'));
  assert.ok(casualEmpatheticPrompt.includes('EMPATHETIC & CALM'));
  assert.ok(casualEmpatheticPrompt.includes('CASUAL & RELATABLE'));
});

