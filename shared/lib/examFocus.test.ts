import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLecturerAreasInput,
  computeAreasHash,
  matchSlidesAndQuestionsToAreas,
  buildExamFocusSynthesisPrompt,
  parseExamFocusSynthesisJson,
  buildDeterministicExamFocusSummary,
  buildGapPracticeQuestionsPrompt,
  parseGapPracticeQuestionsJson,
  buildDeterministicGapPracticeQuestions,
} from './examFocus';

test('parseLecturerAreasInput normalizes numbered, bulleted, comma/semicolon lists and caps duplicates', () => {
  const raw = `
    1. Boyce-Codd Normal Form (BCNF) & Functional Dependencies
    - Two-Phase Locking (2PL) and Deadlock Prevention
    • BCNF & Functional Dependencies
    Topic 3: Star Schema, ETL vs ELT; OLAP Cubes
    * Query Optimization & B-Tree Indexing
  `;
  const areas = parseLecturerAreasInput(raw);
  assert.deepEqual(areas, [
    'Boyce-Codd Normal Form (BCNF) & Functional Dependencies',
    'Two-Phase Locking (2PL) and Deadlock Prevention',
    'BCNF & Functional Dependencies',
    'Star Schema, ETL vs ELT',
    'OLAP Cubes',
    'Query Optimization & B-Tree Indexing',
  ]);
  assert.deepEqual(parseLecturerAreasInput('   \n  -  '), []);
});

test('parseLecturerAreasInput deduplicates exact case-insensitive items and enforces max 25 limit', () => {
  const lines = Array.from({ length: 30 }, (_, i) => `${i + 1}. Exam Area Topic ${i + 1}`);
  lines.push('exam area topic 1');
  const parsed = parseLecturerAreasInput(lines.join('\n'));
  assert.equal(parsed.length, 25);
  assert.equal(parsed[0], 'Exam Area Topic 1');
});

test('computeAreasHash is order/whitespace invariant for identical normalized area sets', () => {
  const h1 = computeAreasHash(['Database Normalization (BCNF)', 'Two-Phase Locking']);
  const h2 = computeAreasHash(['two-phase locking', '  Database   Normalization (BCNF) ']);
  const h3 = computeAreasHash(['Query Optimization']);
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
});

test('matchSlidesAndQuestionsToAreas matches slides and past questions via phrases + academic acronyms and flags coverage gaps', () => {
  const areas = [
    'BCNF & Database Normalization',
    '2PL Concurrency Control',
    'Distributed Blockchain Consensus',
  ];

  const slides = [
    {
      slide_id: 's1',
      lecture_id: 'l1',
      lecture_title: 'Week 3 Normalization',
      week: 3,
      slide_number: 12,
      image_url: 'https://res.cloudinary.com/demo/image/upload/s12.webp',
      raw_text: 'Boyce-Codd Normal Form requires every determinant X in X -> Y to be a superkey. Decomposition removes redundancy.',
      explanation: 'Key rule for normalization in relational schemas.',
    },
    {
      slide_id: 's2',
      lecture_id: 'l2',
      lecture_title: 'Week 7 Transactions',
      week: 7,
      slide_number: 5,
      image_url: 'https://res.cloudinary.com/demo/image/upload/s5.webp',
      raw_text: 'Two-Phase Locking separates growing phase (acquiring locks) and shrinking phase (releasing locks) to enforce serializability.',
      explanation: null,
    },
    {
      slide_id: 's3',
      lecture_id: 'l1',
      lecture_title: 'Week 3 Normalization',
      week: 3,
      slide_number: 1,
      image_url: 'https://res.cloudinary.com/demo/image/upload/s1.webp',
      raw_text: 'Course Overview and Office Hours BSIT 303',
      explanation: null,
    },
  ];

  const questions = [
    {
      question_id: 'q1',
      paper_id: 'p1',
      paper_title: 'BSIT303 2025 Final Exam',
      year: 2025,
      exam_type: 'end-semester',
      question_number: '1',
      text_content: 'Define Boyce-Codd Normal Form and decompose relation R(A,B,C) given functional dependency B -> C.\nA. B is superkey\nB. A is partial\nC. Transitive only\nD. None',
      extracted_topic: 'MCQ|Normalization',
      marks_available: 1,
    },
    {
      question_id: 'q2',
      paper_id: 'p1',
      paper_title: 'BSIT303 2025 Final Exam',
      year: 2025,
      exam_type: 'end-semester',
      question_number: '4',
      text_content: 'Compare Strict Two-Phase Locking with Timestamp Ordering for preventing cascading rollbacks.',
      extracted_topic: 'THEORY|Concurrency Control',
      marks_available: 15,
    },
  ];

  const result = matchSlidesAndQuestionsToAreas({ areas, slides, questions });

  const bcnfSlides = result.matchedSlides.filter((s) => s.area === 'BCNF & Database Normalization');
  const bcnfQs = result.matchedQuestions.filter((q) => q.area === 'BCNF & Database Normalization');
  assert.equal(bcnfSlides[0]?.slide_id, 's1');
  assert.equal(bcnfQs[0]?.question_id, 'q1');

  const tplSlides = result.matchedSlides.filter((s) => s.area === '2PL Concurrency Control');
  const tplQs = result.matchedQuestions.filter((q) => q.area === '2PL Concurrency Control');
  assert.equal(tplSlides[0]?.slide_id, 's2');
  assert.equal(tplQs[0]?.question_id, 'q2');
  assert.equal(tplQs[0]?.is_mcq, false);

  const gap = result.coverageGaps.find((g) => g.area === 'Distributed Blockchain Consensus');
  assert.ok(gap);
  assert.equal(gap.missing_slides, true);
  assert.equal(gap.missing_questions, true);
  assert.match(gap.gap_note, /not covered/i);
});

test('buildExamFocusSynthesisPrompt delimits untrusted data and parseExamFocusSynthesisJson strips AI footprints and phantom citations', () => {
  const areas = ['ACID Transactions'];
  const matchedSlides = [
    {
      area: 'ACID Transactions',
      slide_id: 's1',
      lecture_id: 'l1',
      lecture_title: 'Week 5',
      week: 5,
      slide_number: 4,
      image_url: 'https://res.cloudinary.com/demo/image/upload/s4.webp',
      snippet: 'Durability uses write-ahead logging (WAL) before commit returns.',
      score: 14,
      matched_terms: ['acid', 'transactions'],
    },
  ];
  const matchedQuestions = [
    {
      area: 'ACID Transactions',
      question_id: 'q1',
      paper_id: 'p1',
      paper_title: 'BSIT303 2024',
      year: 2024,
      exam_type: 'end-semester',
      question_number: '2',
      text_content: 'Explain how WAL preserves Durability during power loss.',
      extracted_topic: 'THEORY|Transactions',
      marks_available: 10,
      is_mcq: false,
      score: 10,
      matched_terms: ['durability'],
    },
  ];
  const coverageGaps = [
    {
      area: 'ACID Transactions',
      missing_slides: false,
      missing_questions: false,
      matched_slide_count: 1,
      matched_question_count: 1,
      total_marks: 10,
      gap_note: '',
    },
  ];

  const prompt = buildExamFocusSynthesisPrompt({
    courseCode: 'BSIT303',
    courseTitle: 'Database Management II',
    areas,
    matchedSlides,
    matchedQuestions,
    coverageGaps,
  });

  assert.ok(prompt.includes('<lecturer_areas>'));
  assert.ok(prompt.includes('<matched_slides>'));
  assert.ok(prompt.includes('<matched_past_questions>'));

  const mockLlmOutput = JSON.stringify({
    summaries: [
      {
        area: 'ACID Transactions',
        high_yield_summary:
          'Durability is pivotal—write-ahead logging (WAL) flushes redo records prior to commit [Slide 4] and [Slide 999]. In today\'s fast-paced world, delve into checkpoint intervals.',
        key_concepts: ['Write-Ahead Logging [Slide 4]', 'Atomic commit protocol [Slide 999]'],
        exam_tips: 'Sketch the WAL flush timeline for full 10 marks [Slide 4].',
      },
    ],
  });

  const parsed = parseExamFocusSynthesisJson(mockLlmOutput, {
    areas,
    matchedSlides,
    coverageGaps,
  });

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].high_yield_summary.includes('[Slide 999]'), false);
  assert.equal(parsed[0].high_yield_summary.includes('[Slide 4]'), true);
  assert.equal(/—|delve|pivotal|fast-paced/i.test(parsed[0].high_yield_summary), false);

  const deterministic = buildDeterministicExamFocusSummary(
    areas,
    matchedSlides,
    matchedQuestions,
    coverageGaps
  );
  assert.equal(deterministic.length, 1);
  assert.ok(deterministic[0].high_yield_summary.includes('[Slide 4]'));
});

test('gap practice generator prompt, parser, and fallback enforce grounded citations and valid MCQ/THEORY structure', () => {
  const slides = [
    {
      area: 'Star Schema Modeling',
      slide_id: 's10',
      lecture_id: 'l12',
      lecture_title: 'Week 12 Data Warehousing',
      week: 12,
      slide_number: 18,
      image_url: 'https://res.cloudinary.com/demo/image/upload/s18.webp',
      snippet: 'A star schema links one central fact table holding numeric measures to denormalized dimension tables via foreign keys.',
      score: 18,
      matched_terms: ['star', 'schema'],
    },
  ];

  const prompt = buildGapPracticeQuestionsPrompt({
    area: 'Star Schema Modeling',
    courseCode: 'BSIT303',
    courseTitle: 'Database Management II',
    slides,
  });
  assert.ok(prompt.includes('<matched_slides>'));
  assert.ok(prompt.includes('[Slide 18]'));

  const mockJson = JSON.stringify({
    questions: [
      {
        type: 'MCQ',
        question: 'Which table stores numeric measurements such as sales_amount in a star schema?',
        options: ['A. Dimension table', 'B. Fact table', 'C. Staging log', 'D. Index catalog'],
        correct_answer: 'B',
        marks_available: 1,
        explanation: 'The central fact table holds numeric measures while dimension tables supply descriptive attributes [Slide 18] and [Slide 777].',
        slide_citations: [18, 777],
      },
      {
        type: 'THEORY',
        question: 'Explain the relationship between fact tables and denormalized dimension tables in a star schema.',
        options: [],
        correct_answer: 'Fact tables store foreign keys referencing dimension primary keys alongside numeric measures [Slide 18].',
        marks_available: 10,
        explanation: 'This pivotal design—explained on slide 18—reduces join depth for analytical queries [Slide 18].',
        slide_citations: [18],
      },
    ],
  });

  const parsed = parseGapPracticeQuestionsJson(mockJson, {
    area: 'Star Schema Modeling',
    validSlideNumbers: [18],
    courseTitle: 'Database Management II',
    slides,
  });

  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].explanation.includes('[Slide 777]'), false);
  assert.equal(parsed[0].explanation.includes('[Slide 18]'), true);
  assert.deepEqual(parsed[0].slide_citations, [18]);
  assert.equal(/—|pivotal/i.test(parsed[1].explanation), false);

  const fallback = buildDeterministicGapPracticeQuestions('Star Schema Modeling', slides);
  assert.ok(fallback.length >= 2);
  assert.ok(fallback.some((q) => q.type === 'THEORY'));
});
