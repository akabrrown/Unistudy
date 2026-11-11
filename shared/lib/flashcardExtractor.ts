export interface FlashcardItem {
  front: string;
  back: string;
}

export interface SlideFlashcardInput {
  raw_text?: string | null;
  explanation?: string | null;
  slide_number?: number | null;
}

const NOISE_TERM_REGEX =
  /^(nb|note|course lead|lecturer|instructor|department|faculty|week \d+|slide \d+|learning outcomes?|references?|objectives?):?$/i;

function isNoiseTerm(term: string): boolean {
  const trimmed = term.trim();
  if (trimmed.length < 3) return true;
  if (/^\d[\d\s+()-]{4,}$/.test(trimmed)) return true; // phone numbers / numeric codes
  if (trimmed.includes('<') && trimmed.includes('>')) return true; // raw HTML tag snippets
  if (/[•▪➢►◆]/.test(trimmed) && trimmed.length < 18) return true;
  if (trimmed.endsWith(':')) return true;
  if (NOISE_TERM_REGEX.test(trimmed)) return true;
  if (/^(bsit|bitm|bcpc|cs|it)\s*\d+/i.test(trimmed)) return true;
  return false;
}

export function parseFlashcardsJson(rawInput: unknown): FlashcardItem[] {
  let parsed = rawInput;

  if (typeof rawInput === 'string') {
    const cleaned = rawInput
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    const objStart = cleaned.indexOf('{');
    const arrStart = cleaned.indexOf('[');
    const start =
      arrStart !== -1 && (objStart === -1 || arrStart < objStart) ? arrStart : objStart;

    if (start === -1) return [];
    const end =
      start === arrStart ? cleaned.lastIndexOf(']') : cleaned.lastIndexOf('}');
    if (end <= start) return [];

    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return [];
    }
  }

  let items: unknown[] = [];
  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const firstArray = Object.values(parsed as Record<string, unknown>).find((v) =>
      Array.isArray(v)
    );
    if (Array.isArray(firstArray)) {
      items = firstArray;
    }
  }

  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return { front: '', back: '' };
      const rec = item as Record<string, unknown>;
      const front = String(
        rec.front ?? rec.question ?? rec.term ?? rec.concept ?? rec.q ?? ''
      ).trim();
      const back = String(
        rec.back ?? rec.answer ?? rec.definition ?? rec.explanation ?? rec.a ?? ''
      ).trim();
      return { front, back };
    })
    .filter((card) => card.front.length > 0 && card.back.length > 0);
}

export function extractFlashcardsFromSlides(
  slides: SlideFlashcardInput[]
): FlashcardItem[] {
  const cards: FlashcardItem[] = [];
  const seen = new Set<string>();

  const addCard = (front: string, back: string) => {
    const cleanFront = front.replace(/\s+/g, ' ').trim();
    const cleanBack = back.replace(/\s+/g, ' ').trim();
    if (!cleanFront || !cleanBack || cleanBack.length < 15) return;
    if (seen.has(cleanFront.toLowerCase()) || cards.length >= 15) return;
    seen.add(cleanFront.toLowerCase());
    cards.push({ front: cleanFront, back: cleanBack });
  };

  for (const slide of slides) {
    const text = (slide.raw_text || '').trim();
    const explanation = (slide.explanation || '').trim();
    if (!text && !explanation) continue;

    const lines = text
      .split('\n')
      .map((l) => l.replace(/^[•▪➢►◆\-*]\s*/, '').trim())
      .filter((l) => l.length > 0);

    for (const line of lines) {
      const defMatch = line.match(/^([A-Za-z0-9\s/_-]{3,50})\s*[:–—]\s*(.{15,})$/);
      if (defMatch) {
        const term = defMatch[1].trim();
        const def = defMatch[2].trim();
        if (!isNoiseTerm(term) && !isNoiseTerm(def)) {
          addCard(`What is ${term}?`, def);
        }
      }
    }

    for (let i = 0; i < lines.length - 1; i++) {
      const current = lines[i];
      const next = lines[i + 1];
      if (
        current.length >= 4 &&
        current.length <= 50 &&
        !current.endsWith('.') &&
        !isNoiseTerm(current) &&
        next.length >= 25 &&
        !isNoiseTerm(next)
      ) {
        addCard(`Explain: ${current}`, next);
      }
    }

    if (explanation.length > 25 && !explanation.startsWith('Explanation pending')) {
      const heading =
        lines.find((l) => l.length > 4 && l.length < 60 && !isNoiseTerm(l)) ||
        `Slide ${slide.slide_number || ''} Concept`.trim();
      const summary =
        explanation.length > 260 ? `${explanation.slice(0, 260)}...` : explanation;
      addCard(`Key concept: ${heading}`, summary);
    }
  }

  return cards;
}
