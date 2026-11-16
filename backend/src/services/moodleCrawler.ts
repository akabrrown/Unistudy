import axios from 'axios';

export interface MoodleSyncOptions {
  baseUrl?: string;
  sesskey: string;
  moodleSession: string;
  courseId: number;
}

export interface DiscoveredMoodleFile {
  title: string;
  url: string;
  filename: string;
  courseCode: string;
  normalizedCode: string;
  year: number;
  examType: 'mid-semester' | 'end-semester' | 'resit';
}

/**
 * Normalizes course code to uppercase alphanumeric string (e.g., "dcit 101" -> "DCIT101")
 */
export function normalizeCourseCode(code: string): string {
  if (!code) return '';
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Extracts course code from course name, folder name, or filename
 * E.g., "PBBA 101: Principles of Management" -> { courseCode: "PBBA 101", normalizedCode: "PBBA101" }
 */
export function extractCourseCode(text: string): { courseCode: string; normalizedCode: string } | null {
  if (!text) return null;
  const match = text.match(/\b([A-Z]{2,6})\s*[-_]?\s*(\d{3,4}[A-Z]?)\b/i);
  if (!match) return null;

  const rawCode = `${match[1].toUpperCase()} ${match[2].toUpperCase()}`;
  return {
    courseCode: rawCode,
    normalizedCode: normalizeCourseCode(rawCode),
  };
}

/**
 * Extracts exam year, type, and title from filename or contextual text
 */
export function extractExamMeta(filename: string, courseCode?: string): {
  year: number;
  examType: 'mid-semester' | 'end-semester' | 'resit';
  title: string;
} {
  const currentYear = new Date().getFullYear();
  // Match 4-digit years (1990-2099) bounded by non-digits or start/end of string
  const yearMatch = filename.match(/(?:^|[^0-9])(20\d{2}|19\d{2})(?:[^0-9]|$)/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : currentYear;

  const lower = filename.toLowerCase();
  let examType: 'mid-semester' | 'end-semester' | 'resit' = 'end-semester';
  if (lower.includes('midsem') || lower.includes('mid-sem') || lower.includes('interim')) {
    examType = 'mid-semester';
  } else if (lower.includes('resit') || lower.includes('supplementary')) {
    examType = 'resit';
  }

  const cleanName = filename
    .replace(/\.pdf$/i, '')
    .replace(/[-_]/g, ' ')
    .trim();

  const title = courseCode
    ? `${courseCode} - ${cleanName || `${year} Examination`}`
    : cleanName || `${year} Past Examination Paper`;

  return { year, examType, title };
}

/**
 * Determines whether a file or module is likely a past question / exam paper
 */
export function isPastPaperCandidate(name: string, url?: string): boolean {
  const target = `${name} ${url || ''}`.toLowerCase();
  const keywords = [
    'past question',
    'past paper',
    'pasco',
    'exam',
    'midsem',
    'end of sem',
    'end semester',
    'examination',
    'quiz',
    'test 1',
    'test 2',
    'final',
  ];

  return keywords.some((kw) => target.includes(kw));
}

/**
 * Fetches course state from Moodle AJAX API
 */
export async function fetchMoodleCourseState(options: MoodleSyncOptions): Promise<any> {
  const baseUrl = (options.baseUrl || 'https://join.upsavirtual.site').replace(/\/+$/, '');
  const targetUrl = `${baseUrl}/lib/ajax/service.php?sesskey=${encodeURIComponent(options.sesskey)}&info=core_courseformat_get_state`;

  const headers = {
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Content-Type': 'application/json',
    'Cookie': `MoodleSession=${options.moodleSession}`,
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': `${baseUrl}/course/view.php?id=${options.courseId}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  const body = [
    {
      index: 0,
      methodname: 'core_courseformat_get_state',
      args: { courseid: options.courseId },
    },
  ];

  const response = await axios.post(targetUrl, body, {
    headers,
    timeout: 15000,
  });

  if (!Array.isArray(response.data) || !response.data[0]) {
    throw new Error('Invalid response structure from Moodle service.php');
  }

  const item = response.data[0];
  if (item.error) {
    throw new Error(`Moodle API returned error: ${item.exception?.message || JSON.stringify(item.exception || item)}`);
  }

  const rawData = item.data;
  return typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
}

/**
 * Inspects a Moodle folder view page (mod/folder/view.php?id=...) to discover downloadable PDFs
 */
export async function scanMoodleFolderHtml(
  folderUrl: string,
  moodleSession: string,
  courseCode: string
): Promise<DiscoveredMoodleFile[]> {
  try {
    const headers = {
      'Cookie': `MoodleSession=${moodleSession}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    const res = await axios.get(folderUrl, { headers, timeout: 15000 });
    const html = res.data as string;
    const files: DiscoveredMoodleFile[] = [];

    // Match links to files: href="(https?://[^"]+\.pdf[^"]*)"
    const linkRegex = /<a\s+[^>]*href=["']([^"']+\.pdf(?:\?[^"']*)?)["'][^>]*>(.*?)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const fileUrl = match[1];
      const linkText = match[2].replace(/<[^>]+>/g, '').trim();
      const filename = fileUrl.split('/').pop()?.split('?')[0] || linkText;

      const meta = extractExamMeta(linkText || filename, courseCode);
      files.push({
        title: meta.title,
        url: fileUrl,
        filename,
        courseCode,
        normalizedCode: normalizeCourseCode(courseCode),
        year: meta.year,
        examType: meta.examType,
      });
    }

    return files;
  } catch (err: any) {
    console.warn(`[MoodleCrawler] Could not scan folder ${folderUrl}:`, err.message);
    return [];
  }
}

/**
 * Crawls a Moodle course and discovers all downloadable past exam papers
 */
export async function discoverMoodlePastPapers(options: MoodleSyncOptions): Promise<{
  courseName: string;
  courseCode: string;
  normalizedCode: string;
  papers: DiscoveredMoodleFile[];
}> {
  const baseUrl = (options.baseUrl || 'https://join.upsavirtual.site').replace(/\/+$/, '');
  const stateData = await fetchMoodleCourseState(options);

  // Extract course titles
  const courseFullName = stateData.course?.fullname || stateData.course?.shortname || `Course ${options.courseId}`;
  const extracted = extractCourseCode(courseFullName) || {
    courseCode: `COURSE ${options.courseId}`,
    normalizedCode: `COURSE${options.courseId}`,
  };

  const discoveredPapers: DiscoveredMoodleFile[] = [];
  const cmList = stateData.cm || [];

  for (const cm of cmList) {
    const name = cm.name || '';
    const moduleName = cm.modulename || '';
    const url = cm.url || '';

    // 1. Direct PDF Resource
    if (moduleName === 'resource' && (isPastPaperCandidate(name, url) || name.toLowerCase().endsWith('.pdf'))) {
      const meta = extractExamMeta(name, extracted.courseCode);
      const downloadUrl = url || `${baseUrl}/mod/resource/view.php?id=${cm.id}`;
      discoveredPapers.push({
        title: meta.title,
        url: downloadUrl,
        filename: `${name}.pdf`,
        courseCode: extracted.courseCode,
        normalizedCode: extracted.normalizedCode,
        year: meta.year,
        examType: meta.examType,
      });
    }

    // 2. Folder containing multiple exam files (mod_folder)
    if (moduleName === 'folder' && (isPastPaperCandidate(name) || true)) {
      const folderUrl = url || `${baseUrl}/mod/folder/view.php?id=${cm.id}`;
      const folderFiles = await scanMoodleFolderHtml(folderUrl, options.moodleSession, extracted.courseCode);
      discoveredPapers.push(...folderFiles);
    }
  }

  return {
    courseName: courseFullName,
    courseCode: extracted.courseCode,
    normalizedCode: extracted.normalizedCode,
    papers: discoveredPapers,
  };
}

/**
 * Downloads a binary PDF file from Moodle using the active session cookie
 */
export async function downloadMoodlePdf(fileUrl: string, moodleSession: string): Promise<Buffer> {
  const headers = {
    'Cookie': `MoodleSession=${moodleSession}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };

  const response = await axios.get(fileUrl, {
    headers,
    responseType: 'arraybuffer',
    timeout: 30000,
    maxRedirects: 5,
  });

  return Buffer.from(response.data);
}

export interface MoodleStudentProfile {
  userId: number;
  username: string;
  fullName: string;
  token: string;
}

export interface MoodleEnrolledCourse {
  id: number;
  shortname: string;
  fullname: string;
  courseCode: string;
  normalizedCode: string;
}

/**
 * Direct student login using Index Number and Password via Moodle Token Service
 */
export async function loginMoodleWithCredentials(
  username: string,
  password: string,
  baseUrl = 'https://join.upsavirtual.site'
): Promise<{ token: string; privatetoken?: string }> {
  const cleanBase = baseUrl.trim().replace(/\/+$/, '');
  const targetUrl = `${cleanBase}/login/token.php`;

  const params = new URLSearchParams({
    username: username.trim(),
    password: password.trim(),
    service: 'moodle_mobile_app',
  });

  const response = await axios.post(targetUrl, params.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'UniStudy-Proxy/2.0 (Academic Integrations)',
    },
    timeout: 20000,
  });

  if (response.data?.error) {
    throw new Error(response.data.error || 'Authentication failed on university portal');
  }

  if (!response.data?.token) {
    throw new Error('University portal did not return an access token. Please check your credentials.');
  }

  return {
    token: response.data.token,
    privatetoken: response.data.privatetoken,
  };
}

/**
 * Fetches the student profile and enrolled courses using the Moodle access token
 */
export async function fetchMoodleEnrolledCourses(
  token: string,
  baseUrl = 'https://join.upsavirtual.site'
): Promise<{ profile: MoodleStudentProfile; courses: MoodleEnrolledCourse[] }> {
  const cleanBase = baseUrl.trim().replace(/\/+$/, '');

  // 1. Get site & user info
  const siteInfoRes = await axios.get(`${cleanBase}/webservice/rest/server.php`, {
    params: {
      wstoken: token,
      moodlewsrestformat: 'json',
      wsfunction: 'core_webservice_get_site_info',
    },
    timeout: 15000,
  });

  const siteInfo = siteInfoRes.data;
  if (!siteInfo || !siteInfo.userid) {
    throw new Error('Failed to resolve student identity from university portal');
  }

  const profile: MoodleStudentProfile = {
    userId: siteInfo.userid,
    username: siteInfo.username || '',
    fullName: siteInfo.fullname || `${siteInfo.firstname || ''} ${siteInfo.lastname || ''}`.trim(),
    token,
  };

  // 2. Get enrolled courses
  const coursesRes = await axios.get(`${cleanBase}/webservice/rest/server.php`, {
    params: {
      wstoken: token,
      moodlewsrestformat: 'json',
      wsfunction: 'core_enrol_get_users_courses',
      userid: profile.userId,
    },
    timeout: 20000,
  });

  const rawCourses = Array.isArray(coursesRes.data) ? coursesRes.data : [];
  const courses: MoodleEnrolledCourse[] = rawCourses.map((c: any) => {
    const extracted = extractCourseCode(c.fullname || c.shortname) || {
      courseCode: c.shortname || `COURSE ${c.id}`,
      normalizedCode: normalizeCourseCode(c.shortname || `COURSE${c.id}`),
    };

    return {
      id: c.id,
      shortname: c.shortname || '',
      fullname: c.fullname || '',
      courseCode: extracted.courseCode,
      normalizedCode: extracted.normalizedCode,
    };
  });

  return { profile, courses };
}

/**
 * Scans course sections and modules via Moodle Web Service for PDF past question documents
 */
export async function fetchCourseFilesViaWs(
  courseId: number,
  token: string,
  courseCode: string,
  baseUrl = 'https://join.upsavirtual.site'
): Promise<DiscoveredMoodleFile[]> {
  const cleanBase = baseUrl.trim().replace(/\/+$/, '');

  const contentsRes = await axios.get(`${cleanBase}/webservice/rest/server.php`, {
    params: {
      wstoken: token,
      moodlewsrestformat: 'json',
      wsfunction: 'core_course_get_contents',
      courseid: courseId,
    },
    timeout: 25000,
  });

  const sections = Array.isArray(contentsRes.data) ? contentsRes.data : [];
  const discovered: DiscoveredMoodleFile[] = [];

  for (const section of sections) {
    const modules = section.modules || [];
    for (const mod of modules) {
      const contentsList = mod.contents || [];
      for (const file of contentsList) {
        const filename = file.filename || mod.name || '';
        const fileurl = file.fileurl || '';
        const isPdf = filename.toLowerCase().endsWith('.pdf') || file.mimetype === 'application/pdf';

        if (isPdf && (isPastPaperCandidate(filename, fileurl) || isPastPaperCandidate(section.name || ''))) {
          const meta = extractExamMeta(filename, courseCode);
          discovered.push({
            title: meta.title,
            url: fileurl,
            filename,
            courseCode,
            normalizedCode: normalizeCourseCode(courseCode),
            year: meta.year,
            examType: meta.examType,
          });
        }
      }
    }
  }

  return discovered;
}

/**
 * Downloads a binary PDF file from Moodle using the official Web Service token via secure proxy
 */
export async function downloadMoodleFileWithToken(fileUrl: string, token: string): Promise<Buffer> {
  const urlWithToken = fileUrl.includes('?') ? `${fileUrl}&token=${token}` : `${fileUrl}?token=${token}`;

  const response = await axios.get(urlWithToken, {
    responseType: 'arraybuffer',
    timeout: 45000,
    headers: {
      'User-Agent': 'UniStudy-Proxy/2.0 (Document Ingestion)',
    },
  });

  return Buffer.from(response.data);
}

