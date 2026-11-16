"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeMathResponse = sanitizeMathResponse;
const latexNormalizer_1 = require("./latexNormalizer");
const textHumanizer_1 = require("./textHumanizer");
/**
 * Converts accidental inline HTML formatting to Markdown, normalizes MixTeX/LaTeX delimiters,
 * and strips AI writing footprints while preserving mathematical notation.
 */
function sanitizeMathResponse(rawText) {
    if (!rawText || typeof rawText !== 'string')
        return '';
    const htmlConverted = rawText
        .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
        .replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**')
        .replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*')
        .replace(/<br\s*\/?>/gi, '\n');
    return (0, textHumanizer_1.stripAiFootprintsPreservingFormatting)((0, latexNormalizer_1.normalizeLatexMarkdown)(htmlConverted));
}
