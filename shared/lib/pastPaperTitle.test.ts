import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePastPaperTitle,
  tryDecodeBase64Path,
  isUidString,
  extractCourseCode,
  resolveDisplayCourseCode,
} from './pastPaperTitle';

test('pastPaperTitle - base64 path decoding and humanization', async (t) => {
  await t.test('decodes base64 path from user report to human-readable title', () => {
    const raw = 'L0RpcExldmVsMTAwLzIwMDgtMjAwOS9QREJBIDExMSBQcmluY2lwbGVzIG9mIE1hcmtldGluZy1GSVJTVCBTRU1FU1RFUi5wZGY';
    const clean = normalizePastPaperTitle(raw);
    assert.match(clean, /PDBA 111/i);
    assert.match(clean, /Principles of Marketing/i);
    assert.match(clean, /First Semester/i);
    assert.doesNotMatch(clean, /L0RpcExldmVsMTAw/);
    assert.doesNotMatch(clean, /\.pdf$/i);
  });

  await t.test('decodes base64 without padding or with url-safe chars', () => {
    // base64 for "/Level200/2020/BCPC 201 Commercial Law.pdf"
    const base64Str = Buffer.from('/Level200/2020/BCPC 201 Commercial Law.pdf').toString('base64');
    const clean = normalizePastPaperTitle(base64Str);
    assert.match(clean, /BCPC 201 Commercial Law/);
    assert.doesNotMatch(clean, /\.pdf$/i);
  });

  await t.test('cleans raw file paths and normalizes hyphens/extensions', () => {
    const pathStr = '/Level100/2019-2020/BCPC 101 Introduction to Business-SECOND SEMESTER.pdf';
    const clean = normalizePastPaperTitle(pathStr);
    assert.match(clean, /BCPC 101 Introduction to Business/);
    assert.match(clean, /Second Semester/i);
    assert.doesNotMatch(clean, /\.pdf$/i);
    assert.doesNotMatch(clean, /^\//);
  });

  await t.test('cleans URL-encoded titles and underscores', () => {
    const urlEncoded = 'BCPC%20207_Financial_Accounting-FIRST_SEMESTER.pdf';
    const clean = normalizePastPaperTitle(urlEncoded);
    assert.equal(clean.includes('%20'), false);
    assert.match(clean, /BCPC 207 Financial Accounting/);
  });

  await t.test('handles already clean titles gracefully', () => {
    const normal = 'BCPC 207 Financial Accounting - First Semester (2022)';
    assert.equal(normalizePastPaperTitle(normal), normal);
  });

  await t.test('handles null, empty, and invalid inputs with safe default', () => {
    assert.equal(normalizePastPaperTitle(''), 'Past Examination Paper');
    assert.equal(normalizePastPaperTitle(null), 'Past Examination Paper');
    assert.equal(normalizePastPaperTitle(undefined), 'Past Examination Paper');
    assert.equal(normalizePastPaperTitle('   '), 'Past Examination Paper');
  });

  await t.test('isUidString identifies full and partial UUIDs', () => {
    assert.equal(isUidString('d2f60494-b98f-4c3c-8b4e-890514f65b3e'), true);
    assert.equal(isUidString('d2f60494b98f4c3c8b4e890514f65b3e'), true);
    assert.equal(isUidString('d2f60494'), true);
    assert.equal(isUidString('BCPC 208'), false);
    assert.equal(isUidString('PBAC 301'), false);
    assert.equal(isUidString('BBA 101'), false);
    assert.equal(isUidString(''), false);
    assert.equal(isUidString(null), false);
  });

  await t.test('extractCourseCode parses various academic course code formats', () => {
    assert.equal(extractCourseCode('BCPC 208'), 'BCPC 208');
    assert.equal(extractCourseCode('BCPC208'), 'BCPC 208');
    assert.equal(extractCourseCode('pbac 301'), 'PBAC 301');
    assert.equal(extractCourseCode('BCPC_207_Financial_Accounting.pdf'), 'BCPC 207');
    assert.equal(extractCourseCode('PDBA 111 Principles of Marketing'), 'PDBA 111');
    assert.equal(extractCourseCode('d2f60494-b98f-4c3c-8b4e-890514f65b3e'), null);
  });

  await t.test('resolveDisplayCourseCode never returns a UUID and extracts real course code', () => {
    // When course_code is a raw UUID, extract from paperTitle
    const res1 = resolveDisplayCourseCode({
      courseCode: 'd2f60494-b98f-4c3c-8b4e-890514f65b3e',
      paperTitle: 'BCPC 208 - 2024 End of Semester Examination',
    });
    assert.equal(res1, 'BCPC 208');

    // When joinedCourseCode is valid
    const res2 = resolveDisplayCourseCode({
      courseCode: 'd2f60494-b98f-4c3c-8b4e-890514f65b3e',
      joinedCourseCode: 'PBAC 301',
    });
    assert.equal(res2, 'PBAC 301');

    // When normalizedCode is BCPC208
    const res3 = resolveDisplayCourseCode({
      courseCode: 'd2f60494-b98f-4c3c-8b4e-890514f65b3e',
      normalizedCode: 'BCPC208',
    });
    assert.equal(res3, 'BCPC 208');

    // When courseTitle contains code
    const res4 = resolveDisplayCourseCode({
      courseCode: 'd2f60494-b98f-4c3c-8b4e-890514f65b3e',
      courseTitle: 'Introduction to Business Administration BBA 101',
    });
    assert.equal(res4, 'BBA 101');

    // Fallback when completely unidentifiable (NEVER raw UUID)
    const res5 = resolveDisplayCourseCode({
      courseCode: 'd2f60494-b98f-4c3c-8b4e-890514f65b3e',
      paperTitle: 'General University Past Question',
    });
    assert.equal(res5, 'EXAM');
  });
});
