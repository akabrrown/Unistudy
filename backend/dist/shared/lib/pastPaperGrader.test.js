"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const pastPaperGrader_1 = require("./pastPaperGrader");
(0, node_test_1.default)('extractSubQuestionLabels detects lettered and roman numeral sub-questions', () => {
    const q = `(a) Define osmosis. (2 marks)\n(b) State two factors affecting diffusion. (4 marks)\n(c) (i) Explain active transport.\n(ii) Give one biological example.`;
    const labels = (0, pastPaperGrader_1.extractSubQuestionLabels)(q);
    strict_1.default.ok(labels.includes('a'));
    strict_1.default.ok(labels.includes('b'));
    strict_1.default.ok(labels.includes('c'));
    strict_1.default.ok(labels.includes('i'));
    strict_1.default.ok(labels.includes('ii'));
});
(0, node_test_1.default)('isModelAnswerIncomplete detects empty, placeholder, and partial sub-part answers', () => {
    const q = `(a) State Newton's first law.\n(b) Calculate the force when m = 4 kg and a = 3 m/s^2.`;
    strict_1.default.equal((0, pastPaperGrader_1.isModelAnswerIncomplete)(q, ''), true);
    strict_1.default.equal((0, pastPaperGrader_1.isModelAnswerIncomplete)(q, 'Student did not attempt this question.'), true);
    strict_1.default.equal((0, pastPaperGrader_1.isModelAnswerIncomplete)(q, '(a) An object remains at rest unless acted on by a net external force.'), true);
    strict_1.default.equal((0, pastPaperGrader_1.isModelAnswerIncomplete)(q, '(a) An object remains at rest or uniform motion unless acted upon by a net force.\n(b) Using $F = ma = 4 \\times 3 = 12\\text{ N}$.'), false);
});
(0, node_test_1.default)('buildPastPaperBatchPrompt includes explicit sub-parts and handles unanswered questions', () => {
    const prompt = (0, pastPaperGrader_1.buildPastPaperBatchPrompt)([
        {
            id: 'q1',
            question_content: '(a) Define entropy.\n(b) Explain the second law of thermodynamics.',
            marks_available: 10,
            student_answer: '',
        },
    ], false);
    strict_1.default.ok(prompt.includes('Required sub-parts to solve completely: (a), (b)'));
    strict_1.default.ok(prompt.includes('[No answer provided]'));
    strict_1.default.match(prompt, /whether the student answered/i);
});
(0, node_test_1.default)('normalizeBatchGradingResults zeroes blank student answers, flags incomplete model answers, and cleans output', () => {
    const items = [
        {
            id: 'q1',
            question_content: '(a) Solve 2x = 6.\n(b) Solve x + 4 = 10.',
            marks_available: 6,
            student_answer: '',
        },
        {
            id: 'q2',
            question_content: 'Define photosynthesis.',
            marks_available: 4,
            student_answer: 'Plants use sunlight to convert CO2 and water into glucose and oxygen.',
        },
    ];
    const { results, incompleteIds } = (0, pastPaperGrader_1.normalizeBatchGradingResults)(items, [
        {
            id: 'q1',
            marks_awarded: 3, // should be clamped to 0 since student_answer is empty
            feedback: 'Moreover, student left this blank.',
            model_answer: '(a) Dividing by 2 gives $x = 3$.', // missing (b)!
        },
        {
            id: 'q2',
            marks_awarded: 4,
            feedback: 'Accurate definition covering light, reactants, and products.',
            model_answer: 'Photosynthesis is the process by which green plants convert carbon dioxide and water into glucose and oxygen using light energy—vital for life.',
        },
    ]);
    strict_1.default.equal(results[0].marks_awarded, 0);
    strict_1.default.ok(incompleteIds.includes('q1'));
    strict_1.default.equal(incompleteIds.includes('q2'), false);
    strict_1.default.equal(results[1].model_answer.includes('—'), false);
});
