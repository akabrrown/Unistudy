import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractFlashcardsFromSlides,
  parseFlashcardsJson,
} from './flashcardExtractor';

test('parseFlashcardsJson extracts flashcards from JSON object or array and trims fields', () => {
  const raw = '```json\n{"flashcards":[{"front":"  What is DOM?  ","back":"  Document Object Model tree representation. "}]}\n```';
  const cards = parseFlashcardsJson(raw);
  assert.equal(cards.length, 1);
  assert.deepEqual(cards[0], {
    front: 'What is DOM?',
    back: 'Document Object Model tree representation.',
  });
});

test('extractFlashcardsFromSlides ignores phone numbers, course metadata, and raw HTML noise', () => {
  const slides = [
    {
      slide_number: 1,
      raw_text:
        'Course Lead:\nAkayete Benedict\n0243533599\n<button>Submit</button>\nSemantic HTML : HTML elements that clearly describe their meaning to browsers and developers.\nDocument Object Model\nA programming interface for web documents representing the page as a node tree.',
      explanation: 'Semantic HTML improves screen reader accessibility and search engine indexing across web pages.',
    },
  ];

  const cards = extractFlashcardsFromSlides(slides);
  assert.ok(cards.length >= 2);
  assert.equal(
    cards.some((c) => c.front.includes('0243533599') || c.front.includes('Course Lead') || c.front.includes('<button>')),
    false
  );
  assert.ok(cards.some((c) => c.front.includes('Semantic HTML')));
});
