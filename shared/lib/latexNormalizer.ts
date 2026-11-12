/**
 * Normalizes OCR and LLM Markdown outputs using MixTeX-style LaTeX delimiter rules:
 * strips wrapping ```markdown fences and converts \(...\) / \[...\] to KaTeX $...$ / $$...$$.
 */
export function normalizeLatexMarkdown(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

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
      if (index % 2 === 1) return segment;
      return segment
        .replace(/\\\[([\s\S]*?)\\\]/g, (_, inner: string) => `$$${inner}$$`)
        .replace(/\\\(([^\n]*?)\\\)/g, (_, inner: string) => `$${inner.trim()}$`)
        .replace(/(?<!\$)\$(?!\$)[ \t]+([^\n$]+?)[ \t]+\$(?!\$)/g, (_, inner: string) => `$${inner.trim()}$`);
    })
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
