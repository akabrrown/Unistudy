import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCourseCode,
  extractCourseCode,
  extractExamMeta,
  isPastPaperCandidate,
} from './moodleCrawler';

describe('moodleCrawler utility tests', () => {
  it('normalizes course codes consistently to uppercase alphanumeric', () => {
    assert.equal(normalizeCourseCode('dcit 101'), 'DCIT101');
    assert.equal(normalizeCourseCode('PBBA-202'), 'PBBA202');
    assert.equal(normalizeCourseCode('  bba _ 304  '), 'BBA304');
    assert.equal(normalizeCourseCode('CS102A'), 'CS102A');
  });

  it('extracts course codes from course names and strings', () => {
    const r1 = extractCourseCode('PBBA 101: Principles of Management');
    assert.ok(r1);
    assert.equal(r1.courseCode, 'PBBA 101');
    assert.equal(r1.normalizedCode, 'PBBA101');

    const r2 = extractCourseCode('DCIT 104 - Programming Fundamentals');
    assert.ok(r2);
    assert.equal(r2.courseCode, 'DCIT 104');
    assert.equal(r2.normalizedCode, 'DCIT104');

    const r3 = extractCourseCode('General Orientation Seminar');
    assert.equal(r3, null);
  });

  it('extracts exam metadata (year, exam type, title) accurately', () => {
    const meta1 = extractExamMeta('DCIT101_Midsem_2023.pdf', 'DCIT 101');
    assert.equal(meta1.year, 2023);
    assert.equal(meta1.examType, 'mid-semester');
    assert.match(meta1.title, /DCIT 101/);

    const meta2 = extractExamMeta('BBA_Resit_Examination_2021.pdf', 'BBA 202');
    assert.equal(meta2.year, 2021);
    assert.equal(meta2.examType, 'resit');

    const meta3 = extractExamMeta('Final_Examination_Paper.pdf');
    assert.equal(meta3.examType, 'end-semester');
    assert.ok(meta3.year >= 2020);
  });

  it('correctly identifies past paper candidate titles and URLs', () => {
    assert.equal(isPastPaperCandidate('End of Semester Past Questions'), true);
    assert.equal(isPastPaperCandidate('Pasco Collection 2020-2024'), true);
    assert.equal(isPastPaperCandidate('Midsem Examination Papers'), true);
    assert.equal(isPastPaperCandidate('Lecture 1 Introduction to Software.pptx'), false);
    assert.equal(isPastPaperCandidate('Course Syllabus and Reading List'), false);
  });
});

