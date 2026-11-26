import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanLectureTitle, formatCourseCode } from './lectureTitle';

test('formatCourseCode inserts space between department and code', () => {
  assert.equal(formatCourseCode('BSIT303'), 'BSIT 303');
  assert.equal(formatCourseCode('bcpc207'), 'BCPC 207');
  assert.equal(formatCourseCode('BITM 309'), 'BITM 309');
  assert.equal(formatCourseCode(''), '');
  assert.equal(formatCourseCode(null), '');
});

test('cleanLectureTitle strips file extensions and raw noise', () => {
  assert.equal(cleanLectureTitle('06 Week 6 Lecture.pdf'), 'Week 6: Lecture');
  assert.equal(cleanLectureTitle('02 Week 3-4 Lecture.pdf'), 'Weeks 3 & 4: Lecture');
  assert.equal(cleanLectureTitle('RESEARCH METHODS WEEK 7.pptx'), 'Week 7: Research Methods');
  assert.equal(cleanLectureTitle('informationsystemssecurity-Introductionweek1.pptx'), 'Week 1: Info System Security');
  assert.equal(cleanLectureTitle('BSIT 303 DBMS II Week 5 Presentation.pptx'), 'Week 5: DBMS II');
  assert.equal(cleanLectureTitle('Week 5 Leadership_ Trust_ Power and Ethics (1).pdf'), 'Week 5: Leadership Trust Power and Ethics');
  assert.equal(cleanLectureTitle('BSIT315_L01_3-Tier_Applications.pdf'), 'Lecture 1: 3-Tier Applications');
  assert.equal(cleanLectureTitle('phpcheatsheet.pdf'), 'PHP Cheat Sheet');
  assert.equal(cleanLectureTitle(null), 'Untitled Lecture');
});
