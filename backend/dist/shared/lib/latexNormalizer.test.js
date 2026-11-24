"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const latexNormalizer_1 = require("./latexNormalizer");
const aiTutor_1 = require("./aiTutor");
(0, node_test_1.default)('normalizeLatexMarkdown converts MixTeX/bracket delimiters to KaTeX $ and $$ and strips markdown fences', () => {
    const raw = '```markdown\n## Calculus Notes\nInline formula: \\(E = mc^2\\) and block:\n\\[\n\\int_0^1 x^2 dx = \\frac{1}{3}\n\\]\n```';
    const normalized = (0, latexNormalizer_1.normalizeLatexMarkdown)(raw);
    strict_1.default.equal(normalized.includes('```markdown'), false);
    strict_1.default.ok(normalized.includes('$E = mc^2$'));
    strict_1.default.ok(normalized.includes('$$\n\\int_0^1 x^2 dx = \\frac{1}{3}\n$$'));
});
(0, node_test_1.default)('buildGroundedTutorPrompt enforces strict tutor identity, chosen personality mandate and tone', () => {
    const strictPrompt = (0, aiTutor_1.buildGroundedTutorPrompt)({
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
    strict_1.default.ok(strictPrompt.includes('Dr. Mensah'));
    strict_1.default.ok(strictPrompt.includes('<tutor_identity>'));
    strict_1.default.ok(strictPrompt.includes('STRICT & RIGOROUS'));
    strict_1.default.ok(strictPrompt.includes('ACADEMIC & SCHOLARLY'));
    strict_1.default.match(strictPrompt, /distinction|precision/i);
    const casualEmpatheticPrompt = (0, aiTutor_1.buildGroundedTutorPrompt)({
        tutorName: 'Sophia',
        tutorPersonality: 'empathetic',
        courseContext: 'Macroeconomics',
        studentConfig: {
            tone: 'casual',
        },
    });
    strict_1.default.ok(casualEmpatheticPrompt.includes('Sophia'));
    strict_1.default.ok(casualEmpatheticPrompt.includes('EMPATHETIC & CALM'));
    strict_1.default.ok(casualEmpatheticPrompt.includes('CASUAL & RELATABLE'));
});
