import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPointTransform,
  classifyQuadrilateral,
  computeSegmentGradient,
  parseDeterministicGraphProblem,
  resolveGraphSpec,
  type GraphPoint,
} from './graphSolver';

test('deterministic geometry transforms compute exact translation, y-axis reflection, and rotations', () => {
  const p: GraphPoint = { label: 'A', x: 2, y: 4 };

  const translated = applyPointTransform(p, {
    sourceShape: 'ABCD',
    targetShape: 'A1B1C1D1',
    type: 'translation',
    vector: [-5, -2],
  });
  assert.equal(translated.x, -3);
  assert.equal(translated.y, 2);

  const reflectedY = applyPointTransform(p, {
    sourceShape: 'ABCD',
    targetShape: 'A2B2C2D2',
    type: 'reflection_y',
  });
  assert.equal(reflectedY.x, -2);
  assert.equal(reflectedY.y, 4);

  const rotated90Cw = applyPointTransform({ label: 'P', x: 3, y: 1 }, {
    sourceShape: 'P',
    targetShape: 'P1',
    type: 'rotation_90_cw',
  });
  assert.equal(rotated90Cw.x, 1);
  assert.equal(rotated90Cw.y, -3);
});

test('classifyQuadrilateral accurately identifies rectangle vs square vs parallelogram', () => {
  const rect = classifyQuadrilateral([
    { label: 'A', x: 2, y: 4 },
    { label: 'B', x: 2, y: 8 },
    { label: 'C', x: 8, y: 8 },
    { label: 'D', x: 8, y: 4 },
  ]);
  assert.equal(rect.classification, 'Rectangle');

  const sq = classifyQuadrilateral([
    { label: 'A', x: 0, y: 0 },
    { label: 'B', x: 0, y: 4 },
    { label: 'C', x: 4, y: 4 },
    { label: 'D', x: 4, y: 0 },
  ]);
  assert.equal(sq.classification, 'Square');
});

test('computeSegmentGradient returns exact simplified fraction and decimal for A2B1', () => {
  const grad = computeSegmentGradient(
    { label: 'A2', x: -2, y: 4 },
    { label: 'B1', x: -3, y: 6 }
  );
  assert.equal(grad.isVertical, false);
  assert.equal(grad.decimal, -2);
  assert.equal(grad.simplifiedFraction, '-2');

  const frac = computeSegmentGradient(
    { label: 'P', x: 1, y: 2 },
    { label: 'Q', x: 5, y: 4 }
  );
  assert.equal(frac.simplifiedFraction, '1/2');
  assert.equal(frac.decimal, 0.5);
});

test('parseDeterministicGraphProblem solves full BECE/WASSCE coordinate transformation question', () => {
  const question = `
(a) Using a scale of 2 cm to 2 units on both axes, draw on a graph sheet two perpendicular axes, Ox and Oy, for the interval -10 <= x <= 10 and -10 <= y <= 10.
(b) On the same graph sheet, draw:
(i) a quadrilateral ABCD with vertices A(2,4), B(2,8), C(8,8) and D(8,4);
(ii) the image A1B1C1D1 of ABCD under a translation by vector (-5, -2), where A -> A1, B -> B1, C -> C1 and D -> D1;
(iii) the image A2B2C2D2 of ABCD under a reflection in the y-axis, where A -> A2, B -> B2, C -> C2 and D -> D2.
(c) (i) What type of quadrilateral is ABCD?
(ii) Find the gradient of A2B1.
  `;

  const resolved = parseDeterministicGraphProblem(question);
  assert.ok(resolved);
  assert.equal(resolved.xAxis.min, -10);
  assert.equal(resolved.xAxis.max, 10);
  assert.equal(resolved.xAxis.step, 2);
  assert.equal(resolved.equalAspect, true);

  const abcd = resolved.shapes.find((s) => s.name === 'ABCD');
  const a1b1c1d1 = resolved.shapes.find((s) => s.name === 'A1B1C1D1');
  const a2b2c2d2 = resolved.shapes.find((s) => s.name === 'A2B2C2D2');
  const segA2B1 = resolved.shapes.find((s) => s.name.includes('A2') && s.name.includes('B1'));

  assert.ok(abcd && abcd.vertices.length === 4);
  assert.deepEqual(
    a1b1c1d1?.vertices.map((v) => [v.x, v.y]),
    [[-3, 2], [-3, 6], [3, 6], [3, 2]]
  );
  assert.deepEqual(
    a2b2c2d2?.vertices.map((v) => [v.x, v.y]),
    [[-2, 4], [-2, 8], [-8, 8], [-8, 4]]
  );
  assert.ok(segA2B1, 'Expected line segment A2B1 to be plotted');

  const stepsJoined = resolved.solutionSteps.join('\n');
  assert.match(stepsJoined, /Rectangle/i);
  assert.match(stepsJoined, /-2/);
  assert.equal(/[\u2012\u2013\u2014\u2015]/.test(stepsJoined), false);
});

test('resolveGraphSpec deterministically corrects LLM arithmetic and validates multiple expressions', () => {
  const resolved = resolveGraphSpec({
    title: 'Quadratic & Linear Intersection',
    xAxis: { min: -6, max: 6, step: 1, label: 'x' },
    yAxis: { min: -10, max: 12, step: 2, label: 'y' },
    functions: [
      { expression: 'x^2 - 4', label: 'y = x^2 - 4' },
      { expression: '2*x + 1', label: 'y = 2x + 1' },
    ],
    shapes: [
      {
        name: 'ABCD',
        closed: true,
        vertices: [
          { label: 'A', x: 2, y: 4 },
          { label: 'B', x: 2, y: 8 },
          { label: 'C', x: 8, y: 8 },
          { label: 'D', x: 8, y: 4 },
        ],
      },
    ],
    transformations: [
      {
        sourceShape: 'ABCD',
        targetShape: 'A1B1C1D1',
        type: 'translation',
        vector: [-5, -2],
      },
    ],
    queries: [
      { type: 'classify_quadrilateral', shapeName: 'ABCD' },
    ],
    solutionSteps: ['Sample step—with em-dash'],
  });

  assert.equal(resolved.functions.length, 2);
  const a1 = resolved.shapes.find((s) => s.name === 'A1B1C1D1')?.vertices[0];
  assert.equal(a1?.x, -3);
  assert.equal(a1?.y, 2);
  assert.ok(resolved.solutionSteps.some((s) => /Rectangle/i.test(s)));
  assert.equal(resolved.solutionSteps.some((s) => s.includes('—')), false);
});

