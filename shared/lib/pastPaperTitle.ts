/**
 * UUID detection to prevent internal database UIDs / UUIDs from ever displaying as human course codes.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_32_REGEX = /^[0-9a-f]{32}$/i;
const HEX_8_PREFIX_REGEX = /^[0-9a-f]{8}$/i;

export function isUidString(val: string | null | undefined): boolean {
  if (!val || typeof val !== 'string') return false;
  const clean = val.trim();
  if (UUID_REGEX.test(clean)) return true;
  if (HEX_32_REGEX.test(clean)) return true;
  // Check if 8-char hex prefix (from split(/[-_]/)[0] on a UUID), but not a valid course code
  if (HEX_8_PREFIX_REGEX.test(clean) && !/^[A-Za-z]{4}\d{4}$/i.test(clean)) {
    return true;
  }
  return false;
}

/**
 * Extracts a standard academic course code from a title, code, or filename.
 * Supports Ghanaian university formats:
 * e.g., "BCPC 208", "PBAC 301", "BBA 101", "CS101", "DCIT 102", "INFT 204", "UGBS 201", "MATH 101"
 */
export function extractCourseCode(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') return null;
  const clean = text.trim();
  if (isUidString(clean)) return null;

  // Replace underscores and path separators with spaces to ensure clean token boundaries
  const normalized = clean.replace(/[\\/_]+/g, ' ');

  // Match: 2-5 letters, optional space or hyphen, 3 digits, optional letter
  const match = normalized.match(/(?:^|[^A-Za-z0-9])([A-Za-z]{2,5})\s*(\d{3}[A-Za-z]?)(?![0-9A-Za-z])/);
  if (match) {
    const prefix = match[1].toUpperCase();
    const number = match[2].toUpperCase();
    return `${prefix} ${number}`;
  }
  return null;
}

/**
 * Robustly resolves the user-facing course code, ensuring NO UUID/UID is ever displayed.
 */
export function resolveDisplayCourseCode(input: {
  courseCode?: string | null;
  joinedCourseCode?: string | null;
  normalizedCode?: string | null;
  courseTitle?: string | null;
  paperTitle?: string | null;
  fallback?: string;
}): string {
  const {
    courseCode,
    joinedCourseCode,
    normalizedCode,
    courseTitle,
    paperTitle,
    fallback = 'EXAM',
  } = input;

  // 1. Check joinedCourseCode from course relation if not UID
  if (joinedCourseCode && !isUidString(joinedCourseCode)) {
    const extracted = extractCourseCode(joinedCourseCode);
    if (extracted) return extracted;
    if (joinedCourseCode.trim()) return joinedCourseCode.trim().toUpperCase();
  }

  // 2. Check courseCode if not UID
  if (courseCode && !isUidString(courseCode)) {
    const extracted = extractCourseCode(courseCode);
    if (extracted) return extracted;
    if (courseCode.trim()) return courseCode.trim().toUpperCase();
  }

  // 3. Check normalizedCode (e.g. BCPC208) if not UID
  if (normalizedCode && !isUidString(normalizedCode)) {
    const extracted = extractCourseCode(normalizedCode);
    if (extracted) return extracted;
  }

  // 4. Extract from paperTitle (e.g. "BCPC 208 - 2024 End of Semester Examination")
  if (paperTitle) {
    const extracted = extractCourseCode(paperTitle);
    if (extracted) return extracted;
  }

  // 5. Extract from courseTitle (e.g. "Principles of Marketing - PDBA 111")
  if (courseTitle) {
    const extracted = extractCourseCode(courseTitle);
    if (extracted) return extracted;
  }

  return fallback;
}

/**
 * Attempts to decode a base64-encoded file path or title.
 * Works universally across both Node.js (Buffer) and browser (atob) runtimes.
 */
export function tryDecodeBase64Path(str: string): string | null {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();

  // Fast check: base64 strings have no whitespace and only base64 characters
  if (trimmed.length < 12 || trimmed.includes(' ') || !/^[A-Za-z0-9+/_-]+={0,2}$/.test(trimmed)) {
    return null;
  }

  try {
    let decoded = '';
    // Standardize URL-safe base64
    const normalizedB64 = trimmed.replace(/-/g, '+').replace(/_/g, '/');

    if (typeof Buffer !== 'undefined') {
      decoded = Buffer.from(normalizedB64, 'base64').toString('utf8');
    } else if (typeof atob === 'function') {
      decoded = decodeURIComponent(
        Array.prototype.map
          .call(atob(normalizedB64), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    }

    // Verify the decoded string looks like a legitimate file path or academic title
    if (
      decoded &&
      /^[\x20-\x7E\s]+$/.test(decoded) &&
      (decoded.includes('/') || decoded.includes('\\') || /\.pdf$/i.test(decoded) || /[A-Za-z]{3,}\s+\d{3}/.test(decoded))
    ) {
      return decoded;
    }
  } catch {
    // Not valid base64
  }

  return null;
}

/**
 * Normalizes, decodes, and humanizes raw past paper titles, filenames, and base64 paths.
 * E.g., "L0RpcExldmVsMTAwLzIwMDgtMjAwOS9QREJBIDExMSBQcmluY2lwbGVzIG9mIE1hcmtldGluZy1GSVJTVCBTRU1FU1RFUi5wZGY"
 * -> "PDBA 111 Principles of Marketing - First Semester (2008-2009)"
 */
export function normalizePastPaperTitle(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return 'Past Examination Paper';
  }

  let text = raw.trim();

  // 1. Check if the string is base64 encoded
  const decodedB64 = tryDecodeBase64Path(text);
  if (decodedB64) {
    text = decodedB64;
  }

  // 2. Decode URL encoding if present (e.g. %20)
  if (text.includes('%')) {
    try {
      text = decodeURIComponent(text);
    } catch {}
  }

  // 3. Extract path components if input is a file path (/folder/subfolder/filename.pdf)
  let yearFromPath: string | null = null;
  if (text.includes('/') || text.includes('\\')) {
    const parts = text.split(/[\\/]+/).filter(Boolean);
    if (parts.length > 0) {
      // Look for a year component like 2008-2009 or 2021 in intermediate folders
      const yearPart = parts.slice(0, -1).find((p) => /\b(19\d\d|20\d\d)(?:-(19\d\d|20\d\d))?\b/.test(p));
      if (yearPart) {
        const m = yearPart.match(/\b(19\d\d|20\d\d)(?:-(19\d\d|20\d\d))?\b/);
        if (m) yearFromPath = m[0];
      }
      text = parts[parts.length - 1]; // Take the filename
    }
  }

  // 4. Strip .pdf extension
  text = text.replace(/\.pdf$/i, '').trim();

  // 5. Replace underscores with spaces (except when part of an identifier like BCPC_207)
  text = text.replace(/_+/g, ' ');

  // 6. Fix missing spaces around hyphens between letters (e.g., Marketing-FIRST -> Marketing - FIRST)
  text = text.replace(/([A-Za-z0-9])-(FIRST|SECOND|SEMESTER|MID|END|FINAL|RESIT|[A-Za-z])/gi, '$1 - $2');

  // 7. Humanize common uppercase academic semester terms
  text = text
    .replace(/\bFIRST SEMESTER\b/gi, 'First Semester')
    .replace(/\bSECOND SEMESTER\b/gi, 'Second Semester')
    .replace(/\bMID[- ]SEMESTER\b/gi, 'Mid-Semester')
    .replace(/\bEND[- ]SEMESTER\b/gi, 'End-Semester')
    .replace(/\bMAIN EXAM\b/gi, 'Main Exam')
    .replace(/\bRESIT EXAM\b/gi, 'Resit Exam');

  // 8. Normalize spacing
  text = text.replace(/\s+/g, ' ').trim();

  // 9. If year was extracted from path and is not already in the title, append it
  if (yearFromPath && !text.includes(yearFromPath)) {
    text = `${text} (${yearFromPath})`;
  }

  return text || 'Past Examination Paper';
}
