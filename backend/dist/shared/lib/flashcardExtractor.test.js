"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const flashcardExtractor_1 = require("./flashcardExtractor");
(0, node_test_1.default)('parseFlashcardsJson extracts flashcards from JSON object or array and trims fields', () => {
    const raw = '```json\n{"flashcards":[{"front":"  What is DOM?  ","back":"  Document Object Model tree representation. "}]}\n```';
    const cards = (0, flashcardExtractor_1.parseFlashcardsJson)(raw);
    strict_1.default.equal(cards.length, 1);
    strict_1.default.deepEqual(cards[0], {
        front: 'What is DOM?',
        back: 'Document Object Model tree representation.',
    });
});
(0, node_test_1.default)('extractFlashcardsFromSlides ignores phone numbers, course metadata, and raw HTML noise', () => {
    const slides = [
        {
            slide_number: 1,
            raw_text: 'Course Lead:\nAkayete Benedict\n0243533599\n<button>Submit</button>\nSemantic HTML : HTML elements that clearly describe their meaning to browsers and developers.\nDocument Object Model\nA programming interface for web documents representing the page as a node tree.',
            explanation: 'Semantic HTML improves screen reader accessibility and search engine indexing across web pages.',
        },
    ];
    const cards = (0, flashcardExtractor_1.extractFlashcardsFromSlides)(slides);
    strict_1.default.ok(cards.length >= 2);
    strict_1.default.equal(cards.some((c) => c.front.includes('0243533599') || c.front.includes('Course Lead') || c.front.includes('<button>')), false);
    strict_1.default.ok(cards.some((c) => c.front.includes('Semantic HTML')));
});
