/**
 * UniStudy Chat Title Sanitizer & Normalizer
 * Cleans user message text or session titles into crisp, human-readable session titles.
 * Purges raw HTML/DOCTYPE snippets, unclosed tags, code fences, markdown syntax, and slash commands.
 */

export function cleanChatTitle(raw?: string | null, maxLength = 50): string {
  if (!raw || typeof raw !== 'string') {
    return 'New Study Session';
  }

  let text = raw.trim();

  // 1. If input contains HTML <title>...</title>, extract that title first
  const titleTagMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleTagMatch && titleTagMatch[1]?.trim()) {
    text = titleTagMatch[1];
  } else {
    // Also check for <h1>...</h1> or <h2>...</h2> if present
    const h1Match = text.match(/<h[1-2][^>]*>([\s\S]*?)<\/h[1-2]>/i);
    if (h1Match && h1Match[1]?.trim()) {
      text = h1Match[1];
    }
  }

  // 2. Strip code fences (```lang ... ```)
  const hadCodeFence = /```/.test(text);
  text = text.replace(/```[a-z0-9_-]*[\s\S]*?```/gi, ' ');
  text = text.replace(/`([^`]+)`/g, '$1');

  // 3. Strip DOCTYPE declarations (including broken whitespace e.g. <! DOCTYPE ...>)
  text = text.replace(/<!?\s*doctype[^>]*>/gi, ' ');

  // 4. Strip HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');

  // 5. Strip all closed HTML tags <tag>...</tag> or <tag />
  text = text.replace(/<\/?[a-z0-9_-]+(?:\s+[^>]*)?>/gi, ' ');

  // 6. Strip any generic <...> tags
  text = text.replace(/<[^>]+>/g, ' ');

  // 7. Strip unclosed trailing tags or doctype fragments (e.g. "<title", "<head", "<! DOCTYPE")
  text = text.replace(/<!?[a-z0-9_-]*$/gi, ' ');

  // 8. Strip slash commands at the start (/test, /plan, /explain, /summary, /ask, /chat, etc.)
  text = text.replace(/^\/(?:test|plan|explain|summary|ask|chat|code|review|quiz)\s+/i, '');

  // 9. Strip markdown headers (### ), bullet points, bold/italic markers
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/^[-*+]\s+/gm, '');
  text = text.replace(/[*_~]{1,3}/g, '');

  // 10. Decode common HTML entities
  text = text
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ');

  // 11. Remove standalone markup keywords left behind (html, head, hend, body, title, doctype)
  text = text.replace(/\b(?:doctype|html|head|hend|body|title|meta|link|script|style)\b/gi, ' ');

  // 12. Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // 13. Strip leading non-alphanumeric clutter (except quotes/brackets)
  text = text.replace(/^[^a-zA-Z0-9([{"'#]+/g, '').trim();

  // If text became empty or only whitespace, fallback sensibly
  if (!text || text.length < 2) {
    return hadCodeFence ? 'Code & Implementation Discussion' : 'New Study Session';
  }

  // 14. Graceful truncation at word boundary
  if (text.length > maxLength) {
    const truncated = text.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 20) {
      text = truncated.slice(0, lastSpace).trim() + '...';
    } else {
      text = truncated.trim() + '...';
    }
  }

  // Capitalize first letter
  return text.charAt(0).toUpperCase() + text.slice(1);
}
