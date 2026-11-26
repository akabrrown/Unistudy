/**
 * UniStudy Lecture Title & Course Code Formatter
 * Transforms raw uploaded file names (e.g. "RESEARCH METHODS WEEK 7.pptx",
 * "06 Week 6 Lecture.pdf", "informationsystemssecurity-Introductionweek1.pptx")
 * into clean, collegiate human-readable lecture topics and ensures proper course code spacing.
 */

export function formatCourseCode(code: string | null | undefined): string {
  if (!code) return '';
  const trimmed = code.trim().toUpperCase();
  // Ensure standard spacing between department prefix and course number (e.g. BSIT303 -> BSIT 303)
  const match = trimmed.match(/^([A-Z]{2,5})\s*(\d{2,4}[A-Z]?)$/);
  if (match) {
    return `${match[1]} ${match[2]}`;
  }
  return trimmed;
}

export function cleanLectureTitle(rawTitle: string | null | undefined): string {
  if (!rawTitle) return 'Untitled Lecture';
  let t = rawTitle.trim();

  // 1. Remove file extensions (.pptx, .pdf, .ppt, .docx, .xlsx)
  t = t.replace(/\.(pptx?|pdf|docx?|xlsx?)$/i, '');

  // 2. Remove duplicate/copy suffixes like (1), _copy, - copy
  t = t.replace(/\s*\(\d+\)$/, '').replace(/[\s_-]+copy$/i, '');

  // 3. Remove leading numeric ordering prefixes like '06 ', '02 ', '01 - '
  t = t.replace(/^0*(\d+)\s*[-_.]\s*/, '');
  t = t.replace(/^0*(\d+)\s+Week/i, 'Week');

  // 4. Handle concatenated course filenames like 'informationsystemssecurity-Introductionweek1'
  if (/^informationsystemssecurity[-_]introductionweek(\d+)/i.test(t)) {
    const weekNum = t.match(/week(\d+)/i)![1];
    return `Week ${weekNum}: Info System Security`;
  }

  // 5. Handle cases like 'BSIT315_L01_3-Tier_Applications' or 'BSIT315_L02_1_Intro_to_JavaScript'
  const bsitMatch = t.match(/^(?:[A-Z]{2,5}\s*\d{2,4}\s*[-_])?L0?(\d+)(?:_\d+)?[-_](.+)$/i);
  if (bsitMatch) {
    const lecNum = bsitMatch[1];
    // Extract the raw topic following L0X_ (preserving numbers like 3-Tier)
    const topicMatch = t.match(/L0?\d+[-_](.+)$/i);
    let topic = topicMatch ? topicMatch[1] : bsitMatch[2];
    topic = topic.replace(/_/g, ' ').replace(/\bintro\b/i, 'Introduction');
    return `Lecture ${lecNum}: ${topic}`;
  }

  // 6. Handle cases like 'BSIT 303 DBMS II Week 5 Presentation'
  const dbmsMatch = t.match(/^(?:[A-Z]{3,4}\s*\d{3}\s*)?(?:DBMS\s*II\s*)?Week\s*(\d+)\s*(.*)$/i);
  if (dbmsMatch && /DBMS/i.test(t)) {
    const weekNum = dbmsMatch[1];
    const rest = dbmsMatch[2].replace(/Presentation/i, '').trim();
    return `Week ${weekNum}: DBMS II${rest ? ' - ' + rest : ''}`;
  }

  // 7. Handle 'RESEARCH METHODS WEEK 7' -> 'Week 7: Research Methods'
  const rmMatch = t.match(/^(?:RESEARCH\s+METHODS?)\s+WEEK\s*(\d+)$/i);
  if (rmMatch) {
    return `Week ${rmMatch[1]}: Research Methods`;
  }

  // 8. Multi-week & single-week formatting
  t = t.replace(/_/g, ' ');
  t = t.replace(/^Weeks?\s*(\d+)\s*(?:&|and|-)\s*(\d+)\s*[-:—]?\s*/i, 'Weeks $1 & $2: ');
  t = t.replace(/^Week\s*(\d+)\s*[-:—]?\s*/i, 'Week $1: ');

  // 9. Lesson formatting: 'Lesson 1 Web Development II' -> 'Lesson 1: Web Development II'
  t = t.replace(/^Lesson\s*(\d+)\s*[-:—]?\s*/i, 'Lesson $1: ');

  // 10. Specific keywords
  if (/^phpcheatsheet$/i.test(t)) {
    return 'PHP Cheat Sheet';
  }

  // Clean trailing punctuation and multiple spaces
  t = t.replace(/[:\s,-]+$/, '').replace(/\s+/g, ' ').trim();

  return t;
}
