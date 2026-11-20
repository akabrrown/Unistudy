"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const mathjs_1 = require("mathjs");
const mathSolver_1 = require("./mathSolver");
const mathEngine = { compile: mathjs_1.compile, derivative: mathjs_1.derivative, evaluate: mathjs_1.evaluate, format: mathjs_1.format, lusolve: mathjs_1.lusolve, simplify: mathjs_1.simplify };
(0, node_test_1.default)('tryDeterministicMathSolve differentiates expressions accurately with step-by-step markdown', () => {
    const res = (0, mathSolver_1.tryDeterministicMathSolve)('Find the derivative of x^3 + 2*x^2 - 5*x + 7', mathEngine);
    strict_1.default.ok(res);
    strict_1.default.equal(res.category, 'calculus_derivative');
    strict_1.default.match(res.answer, /3\s*\*?\s*x\s*\^\s*2\s*\+\s*4\s*\*?\s*x\s*-\s*5/);
    strict_1.default.ok(res.markdown.includes('Final Answer'));
});
(0, node_test_1.default)('tryDeterministicMathSolve evaluates definite integrals accurately', () => {
    const res = (0, mathSolver_1.tryDeterministicMathSolve)('integrate x^2 from 0 to 3', mathEngine);
    strict_1.default.ok(res);
    strict_1.default.equal(res.category, 'calculus_integral');
    strict_1.default.equal(res.answer, '9');
});
(0, node_test_1.default)('tryDeterministicMathSolve solves quadratic equations including complex roots', () => {
    const realRoots = (0, mathSolver_1.tryDeterministicMathSolve)('Solve x^2 - 5x + 6 = 0', mathEngine);
    strict_1.default.ok(realRoots);
    strict_1.default.equal(realRoots.category, 'algebra_equation');
    strict_1.default.ok(realRoots.answer.includes('3') && realRoots.answer.includes('2'));
    const complexRoots = (0, mathSolver_1.tryDeterministicMathSolve)('Solve x^2 + 2x + 5 = 0', mathEngine);
    strict_1.default.ok(complexRoots);
    strict_1.default.ok(complexRoots.answer.includes('i'));
});
(0, node_test_1.default)('tryDeterministicMathSolve solves systems of simultaneous equations and matrices', () => {
    const sys = (0, mathSolver_1.tryDeterministicMathSolve)('Solve 2x + y = 7, x - y = 2', mathEngine);
    strict_1.default.ok(sys);
    strict_1.default.equal(sys.category, 'linear_system');
    strict_1.default.ok(sys.answer.includes('x = 3') && sys.answer.includes('y = 1'));
    const detRes = (0, mathSolver_1.tryDeterministicMathSolve)('det([[1, 2], [3, 4]])', mathEngine);
    strict_1.default.ok(detRes);
    strict_1.default.equal(detRes.answer, '-2');
});
(0, node_test_1.default)('tryDeterministicMathSolve computes descriptive statistics cleanly', () => {
    const stats = (0, mathSolver_1.tryDeterministicMathSolve)('Find mean and standard deviation of 2, 4, 4, 4, 5, 5, 7, 9', mathEngine);
    strict_1.default.ok(stats);
    strict_1.default.equal(stats.category, 'statistics');
    strict_1.default.ok(stats.answer.includes('5') && stats.answer.includes('2'));
});
(0, node_test_1.default)('buildUniversalMathSolverPrompt delimits untrusted input, injects CAS check, and bans raw HTML bolding', () => {
    const cas = (0, mathSolver_1.tryDeterministicMathSolve)('Solve x^2 - 5x + 6 = 0', mathEngine);
    const prompt = (0, mathSolver_1.buildUniversalMathSolverPrompt)({
        problem: 'Solve x^2 - 5x + 6 = 0',
        subject: 'Mathematics',
        level: 'Undergraduate',
        verifiedComputation: cas,
    });
    strict_1.default.ok(prompt.includes('<math_problem>'));
    strict_1.default.ok(prompt.includes('<verified_cas_check'));
    strict_1.default.ok(prompt.includes('### Problem Restatement'));
    strict_1.default.match(prompt, /Markdown|\*\*|KaTeX/i);
    strict_1.default.equal(prompt.includes('Use HTML for bolding'), false);
});
(0, node_test_1.default)('extractRawBase64AndMime and buildMathOcrPrompt handle data URLs and enforce verbatim math transcription', async () => {
    const mod = (await Promise.resolve().then(() => __importStar(require('./mathSolver'))));
    strict_1.default.equal(typeof mod.extractRawBase64AndMime, 'function');
    strict_1.default.equal(typeof mod.buildMathOcrPrompt, 'function');
    strict_1.default.equal(typeof mod.cleanExtractedMathText, 'function');
    const extractFn = mod.extractRawBase64AndMime;
    const parsed = extractFn('data:image/png;base64, aGVsbG8= ', 'image/jpeg');
    strict_1.default.equal(parsed.mimeType, 'image/png');
    strict_1.default.equal(parsed.data, 'aGVsbG8=');
    const ocrPromptFn = mod.buildMathOcrPrompt;
    const mathPrompt = ocrPromptFn('math');
    const graphPrompt = ocrPromptFn('graph');
    strict_1.default.ok(mathPrompt.includes('$...$') && mathPrompt.includes('$$...$$'));
    strict_1.default.ok(graphPrompt.toLowerCase().includes('coordinates'));
    const cleanFn = mod.cleanExtractedMathText;
    const cleaned = cleanFn('Here is the transcription of the image:\n\\(2x + 5 = 15\\)');
    strict_1.default.equal(cleaned.includes('Here is the transcription'), false);
    strict_1.default.ok(cleaned.includes('$2x + 5 = 15$'));
});
(0, node_test_1.default)('buildUniversalMathSolverPrompt for image-only request enforces verbatim transcription before solving', () => {
    const prompt = (0, mathSolver_1.buildUniversalMathSolverPrompt)({
        problem: '',
        subject: 'Calculus',
    });
    strict_1.default.ok(prompt.includes('Solve the mathematical problem shown in the attached image step-by-step.'));
    strict_1.default.ok(prompt.includes('If an image is attached: Transcribe the EXACT question and numbers'));
    strict_1.default.ok(prompt.includes('### Problem Restatement'));
});
(0, node_test_1.default)('sanitizeMathResponse converts accidental HTML tags to Markdown, normalizes MixTeX LaTeX, and removes AI footprints', () => {
    const raw = '<strong>Final Answer</strong>\nMoreover, this is pivotal—we get \\(x = 3\\) and \\[\\int_0^3 x^2 dx = 9\\]';
    const cleaned = (0, mathSolver_1.sanitizeMathResponse)(raw);
    strict_1.default.equal(cleaned.includes('<strong>'), false);
    strict_1.default.ok(cleaned.includes('**Final Answer**'));
    strict_1.default.ok(cleaned.includes('$x = 3$'));
    strict_1.default.ok(cleaned.includes('$$\\int_0^3 x^2 dx = 9$$'));
    strict_1.default.equal(cleaned.includes('—'), false);
    strict_1.default.equal(cleaned.toLowerCase().includes('pivotal'), false);
});
