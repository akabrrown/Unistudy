"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeLatexMarkdown = normalizeLatexMarkdown;
/**
 * Normalizes OCR and LLM Markdown outputs using MixTeX-style LaTeX delimiter rules:
 * strips wrapping ```markdown fences and converts \(...\) / \[...\] to KaTeX $...$ / $$...$$.
 */
function normalizeLatexMarkdown(rawText) {
    if (!rawText || typeof rawText !== 'string')
        return '';
    let cleaned = rawText.replace(/\r\n/g, '\n').trim();
    if (/^```(?:markdown|md)?\s*\n/i.test(cleaned) && /\n```\s*$/.test(cleaned)) {
        cleaned = cleaned
            .replace(/^```(?:markdown|md)?\s*\n/i, '')
            .replace(/\n```\s*$/, '')
            .trim();
    }
    // Protect real fenced code blocks from math delimiter replacement
    const segments = cleaned.split(/(```[\s\S]*?```)/g);
    return segments
        .map((segment, index) => {
        if (index % 2 === 1)
            return segment;
        return segment
            .replace(/\\\[([\s\S]*?)\\\]/g, (_, inner) => `$$${inner}$$`)
            .replace(/\\\(([^\n]*?)\\\)/g, (_, inner) => `$${inner.trim()}$`)
            .replace(/(?<!\$)\$(?!\$)[ \t]+([^\n$]+?)[ \t]+\$(?!\$)/g, (_, inner) => `$${inner.trim()}$`);
    })
        .join('')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
