export interface GroundingSource {
  slideNumber?: number;
  text: string;
}

export interface UnsupportedSpan {
  text: string;
  reason: 'phantom_citation' | 'numeric_mismatch' | 'low_source_overlap';
  citedSlide?: number;
}

export interface GroundingVerificationResult {
  groundedRatio: number;
  phantomCitations: number[];
  unsupportedSpans: UnsupportedSpan[];
  checkedStatements: number;
}

const OUTSIDE_LECTURE_MARKER = /general background\s*\(outside lecture\)|not covered in the provided lecture/i;

function normalizeToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function extractNumbers(text: string): string[] {
  const withoutCitations = text.replace(/\[Slide\s+\d+\]/gi, '');
  const matches = withoutCitations.match(/\b\d+(?:\.\d+)?%?\b/g) || [];
  return Array.from(new Set(matches));
}

function extractKeywords(text: string): string[] {
  const tokens = normalizeToken(text).match(/[\p{L}\p{N}]{4,}/gu) || [];
  return Array.from(new Set(tokens));
}

/**
 * Verifies LLM claims against retrieved slide/source passages using deterministic
 * LettuceDetect-inspired span checks: citation existence, numeric fidelity, and token overlap.
 */
export function verifyResponseGrounding(
  answer: string,
  sources: GroundingSource[]
): GroundingVerificationResult {
  if (!answer.trim() || sources.length === 0) {
    return {
      groundedRatio: 1,
      phantomCitations: [],
      unsupportedSpans: [],
      checkedStatements: 0,
    };
  }

  const validSlides = new Set(
    sources
      .map((s) => s.slideNumber)
      .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
  );

  const sourceBySlide = new Map<number, string>();
  const allSourceText = sources.map((s) => {
    if (typeof s.slideNumber === 'number') {
      const prev = sourceBySlide.get(s.slideNumber) || '';
      sourceBySlide.set(s.slideNumber, `${prev} ${s.text}`.trim());
    }
    return s.text;
  }).join('\n');

  const normalizedAllSources = normalizeToken(allSourceText);
  const allSourceNumbers = new Set(extractNumbers(allSourceText));
  const allSourceWords = new Set(extractKeywords(allSourceText));

  // Ignore code fences and explicit "outside lecture" general background section
  const mainBody = answer
    .split(OUTSIDE_LECTURE_MARKER)[0]
    .replace(/```[\s\S]*?```/g, '');

  const statements = mainBody
    .split(/(?<=[.!?])\s+|\n+/)
    .map((line) => line.replace(/^#{1,6}\s+/, '').replace(/^>\s*/, '').trim())
    .filter((line) => line.length >= 20 && !/^[-*•]\s*$/.test(line));

  const phantomSet = new Set<number>();
  const unsupportedSpans: UnsupportedSpan[] = [];
  let supportedCount = 0;

  for (const stmt of statements) {
    const citations = [...stmt.matchAll(/\[Slide\s+(\d+)\]/gi)].map((m) => Number(m[1]));
    let stmtUnsupported = false;

    for (const slideNum of citations) {
      if (validSlides.size > 0 && !validSlides.has(slideNum)) {
        phantomSet.add(slideNum);
        unsupportedSpans.push({
          text: stmt,
          reason: 'phantom_citation',
          citedSlide: slideNum,
        });
        stmtUnsupported = true;
      }
    }

    // Check numbers when sentence cites a slide or asserts quantitative claims
    const targetContext =
      citations.length > 0 && sourceBySlide.has(citations[0])
        ? sourceBySlide.get(citations[0])!
        : allSourceText;
    const targetNums =
      citations.length > 0 && sourceBySlide.has(citations[0])
        ? new Set(extractNumbers(targetContext))
        : allSourceNumbers;

    if (citations.length > 0) {
      const stmtNumbers = extractNumbers(stmt);
      const hasNumericMismatch = stmtNumbers.some((n) => !targetNums.has(n));
      if (hasNumericMismatch) {
        unsupportedSpans.push({
          text: stmt,
          reason: 'numeric_mismatch',
          citedSlide: citations[0],
        });
        stmtUnsupported = true;
      }
    }

    if (!stmtUnsupported && citations.length > 0) {
      const keywords = extractKeywords(stmt.replace(/\[Slide\s+\d+\]/gi, ''));
      if (keywords.length >= 4) {
        const matched = keywords.filter(
          (w) => allSourceWords.has(w) || normalizedAllSources.includes(w)
        ).length;
        if (matched / keywords.length < 0.25) {
          unsupportedSpans.push({
            text: stmt,
            reason: 'low_source_overlap',
            citedSlide: citations[0],
          });
          stmtUnsupported = true;
        }
      }
    }

    if (!stmtUnsupported) {
      supportedCount += 1;
    }
  }

  const checkedStatements = statements.length;
  const groundedRatio =
    checkedStatements > 0 ? Math.round((supportedCount / checkedStatements) * 100) / 100 : 1;

  return {
    groundedRatio,
    phantomCitations: Array.from(phantomSet).sort((a, b) => a - b),
    unsupportedSpans,
    checkedStatements,
  };
}

/**
 * Strips phantom [Slide N] markers whose slide numbers do not exist in provided sources.
 */
export function stripPhantomSlideCitations(answer: string, validSlideNumbers: number[]): string {
  if (!answer || validSlideNumbers.length === 0) return answer;
  const valid = new Set(validSlideNumbers);
  return answer
    .replace(/\s*\[Slide\s+(\d+)\]/gi, (full, numStr: string) => {
      const num = Number(numStr);
      return valid.has(num) ? full : '';
    })
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

