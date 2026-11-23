import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePastPaperTitle, tryDecodeBase64Path } from './pastPaperTitle';

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
});
