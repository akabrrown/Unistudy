export const HUMANIZED_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\b(?:in|within)\s+today['’]?s\s+fast[- ]paced\s+(?:world|society|era|digital age),?\s*/gi, ''],
  [/\b(?:in|within)\s+an?\s+ever[- ]evolving\s+(?:landscape|world|field|environment),?\s*/gi, ''],
  [/\bdelving\s+into\b/gi, 'examining'],
  [/\bdelves\s+into\b/gi, 'examines'],
  [/\bdelved\s+into\b/gi, 'examined'],
  [/\bdelve\s+into\b/gi, 'examine'],
  [/\ba\s+testament\s+to\b/gi, 'evidence of'],
  [/\btestament\s+to\b/gi, 'evidence of'],
  [/\btapestry\s+of\b/gi, 'mix of'],
  [/\btapestry\b/gi, 'network'],
  [/\bmultifaceted\b/gi, 'complex'],
  [/\bpivotal\b/gi, 'central'],
  [/\bparamount\b/gi, 'essential'],
  [/\bunderscoring\b/gi, 'showing'],
  [/\bunderscores\b/gi, 'highlights'],
  [/\bunderscore\b/gi, 'highlight'],
  [/\bunderscored\b/gi, 'highlighted'],
  [/\ba\s+myriad\s+of\b/gi, 'many'],
  [/\bmyriad\s+of\b/gi, 'many'],
  [/\bmyriad\b/gi, 'numerous'],
  [/\ba\s+plethora\s+of\b/gi, 'a wide range of'],
  [/\bplethora\s+of\b/gi, 'wide range of'],
  [/\bseamless(?:ly)?\b/gi, 'smooth'],
  [/\bleveraging\b/gi, 'using'],
  [/\bleveraged\b/gi, 'used'],
  [/\bleverages\b/gi, 'uses'],
  [/\bleverage\b/gi, 'use'],
  [/\bharnessing\b/gi, 'using'],
  [/\bharnessed\b/gi, 'used'],
  [/\bharnesses\b/gi, 'uses'],
  [/\bharness\b/gi, 'use'],
  [/\bfostering\b/gi, 'supporting'],
  [/\bfostered\b/gi, 'supported'],
  [/\bfosters\b/gi, 'supports'],
  [/\bfoster\b/gi, 'support'],
  [/\bembark(?:ing|ed|s)?\s+on\b/gi, 'begin'],
  [/\brealm\s+of\b/gi, 'area of'],
  [/\blandscape\s+of\b/gi, 'field of'],
  [/\bintrinsically\b/gi, 'closely'],
  [/\bit is worth noting that\b,?\s*/gi, ''],
  [/\bit is important to note that\b,?\s*/gi, ''],
  [/^\s*(?:Furthermore|Moreover|Additionally|Consequently|In conclusion|To conclude|To summarize|Ultimately),\s+/gim, ''],
];

export const WRITING_HUMANIZATION_RULES = `WRITING STYLE & HUMANIZATION RULES (STRICT):
- Sound like a thoughtful top university honours student writing authentic prose in their own voice, not an AI template.
- NEVER use long em-dashes ("—"), en-dashes ("–"), or double hyphens ("--"). Use regular commas, periods, semicolons, or parentheses instead.
- AVOID robotic AI buzzwords and stock openers: never use "delve", "tapestry", "pivotal", "paramount", "underscore", "testament", "multifaceted", "myriad", "plethora", "realm", "landscape", "seamless", "leverage", "harness", "foster", "embark", "in today's fast-paced world", "it is worth noting", or starting every paragraph with "Furthermore/Moreover/Additionally/In conclusion".
- Vary sentence length and openings naturally: mix concise direct points with developed analytical claims.
- Write clean, plain essay paragraphs only (no headings, no bold text, no bullet lists, no preamble).`;

function preserveSentenceCase(text: string): string {
  return text.replace(/(^|\n\n|[.!?]\s+)([a-z])/g, (_, prefix: string, ch: string) => {
    return `${prefix}${ch.toUpperCase()}`;
  });
}

export function humanizeStreamChunk(chunk: string): string {
  return chunk
    .replace(/\u2011/g, '-')
    .replace(/(\d)\s*[\u2012\u2013\u2014\u2015]\s*(\d)/g, '$1-$2')
    .replace(/\s*[\u2012\u2013\u2014\u2015]\s*/g, ', ')
    .replace(/\s+--\s+/g, ', ')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1');
}

function cleanProseCore(text: string): string {
  let cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\u2011/g, '-')
    .replace(/\u2019/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/(\d)\s*[\u2012\u2013\u2014\u2015]\s*(\d)/g, '$1-$2')
    .replace(/\s*[\u2012\u2013\u2014\u2015]\s*([^\n\u2012\u2013\u2014\u2015]{2,90}?)\s*[\u2012\u2013\u2014\u2015]\s*/g, ', $1, ')
    .replace(/\s*[\u2012\u2013\u2014\u2015]\s*/g, ', ')
    .replace(/\s+--\s+/g, ', ');

  for (const [pattern, replacement] of HUMANIZED_REPLACEMENTS) {
    cleaned = cleaned.replace(pattern, replacement);
  }

  return cleaned
    .replace(/,\s*,+/g, ',')
    .replace(/,\s*([.!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ');
}

export function stripAiWritingFootprints(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  const strippedMarkdown = rawText
    .replace(/\r\n/g, '\n')
    .replace(/^\s*(?:#{1,6}\s+[^\n]*\n+|(?:here is|below is)[^:\n]*:\s*\n*)/i, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/(^|\s)\*([^*\n]+)\*(?=\s|[.,;!?]|$)/g, '$1$2');

  const cleaned = cleanProseCore(strippedMarkdown)
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();

  return preserveSentenceCase(cleaned);
}

const PROTECTED_MARKDOWN_SEGMENTS =
  /(```[\s\S]*?```|`[^`\n]+`|\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g;

/**
 * Removes AI writing clichés and long dashes from prose while preserving
 * Markdown headings, code blocks, inline code, and LaTeX math expressions.
 */
export function stripAiFootprintsPreservingFormatting(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  const normalized = rawText.replace(/\r\n/g, '\n');
  const parts = normalized.split(PROTECTED_MARKDOWN_SEGMENTS);

  const rebuilt = parts
    .map((segment, idx) => {
      // Odd capture groups from split() are protected code/math segments
      if (idx % 2 === 1) return segment;
      return preserveSentenceCase(cleanProseCore(segment));
    })
    .join('');

  return rebuilt.replace(/\n{3,}/g, '\n\n').trim();
}

