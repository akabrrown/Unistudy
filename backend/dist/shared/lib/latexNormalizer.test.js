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
(0, node_test_1.default)('buildGroundedTutorPrompt integrates Mr. Ranedeer student personalization and /test or /plan modes cleanly', () => {
    const prompt = (0, aiTutor_1.buildGroundedTutorPrompt)({
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
    strict_1.default.ok(prompt.includes('Socratic'));
    strict_1.default.ok(prompt.includes('Causal'));
    strict_1.default.ok(prompt.includes('Visual'));
    strict_1.default.match(prompt, /practice questions|assess/i);
    // Ensure no spammy third-party Discord promotions leaked
    strict_1.default.equal(/discord\.gg/i.test(prompt), false);
});
