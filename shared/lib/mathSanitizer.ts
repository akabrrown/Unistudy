import { normalizeLatexMarkdown } from './latexNormalizer';
import { stripAiFootprintsPreservingFormatting } from './textHumanizer';

/**
 * Converts accidental inline HTML formatting to Markdown, normalizes MixTeX/LaTeX delimiters,
 * and strips AI writing footprints while preserving mathematical notation.
 */
export function sanitizeMathResponse(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';
  const htmlConverted = rawText
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<br\s*\/?>/gi, '\n');

  return stripAiFootprintsPreservingFormatting(normalizeLatexMarkdown(htmlConverted));
}

