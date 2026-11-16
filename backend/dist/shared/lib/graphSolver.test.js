"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const graphSolver_1 = require("./graphSolver");
(0, node_test_1.default)('deterministic geometry transforms compute exact translation, y-axis reflection, and rotations', () => {
    const p = { label: 'A', x: 2, y: 4 };
    const translated = (0, graphSolver_1.applyPointTransform)(p, {
        sourceShape: 'ABCD',
        targetShape: 'A1B1C1D1',
        type: 'translation',
        vector: [-5, -2],
    });
    strict_1.default.equal(translated.x, -3);
    strict_1.default.equal(translated.y, 2);
    const reflectedY = (0, graphSolver_1.applyPointTransform)(p, {
        sourceShape: 'ABCD',
        targetShape: 'A2B2C2D2',
        type: 'reflection_y',
    });
    strict_1.default.equal(reflectedY.x, -2);
    strict_1.default.equal(reflectedY.y, 4);
    const rotated90Cw = (0, graphSolver_1.applyPointTransform)({ label: 'P', x: 3, y: 1 }, {
        sourceShape: 'P',
        targetShape: 'P1',
        type: 'rotation_90_cw',
    });
    strict_1.default.equal(rotated90Cw.x, 1);
    strict_1.default.equal(rotated90Cw.y, -3);
});
(0, node_test_1.default)('classifyQuadrilateral accurately identifies rectangle vs square vs parallelogram', () => {
    const rect = (0, graphSolver_1.classifyQuadrilateral)([
        { label: 'A', x: 2, y: 4 },
        { label: 'B', x: 2, y: 8 },
        { label: 'C', x: 8, y: 8 },
        { label: 'D', x: 8, y: 4 },
    ]);
    strict_1.default.equal(rect.classification, 'Rectangle');
    const sq = (0, graphSolver_1.classifyQuadrilateral)([
        { label: 'A', x: 0, y: 0 },
        { label: 'B', x: 0, y: 4 },
        { label: 'C', x: 4, y: 4 },
        { label: 'D', x: 4, y: 0 },
    ]);
    strict_1.default.equal(sq.classification, 'Square');
});
(0, node_test_1.default)('computeSegmentGradient returns exact simplified fraction and decimal for A2B1', () => {
    const grad = (0, graphSolver_1.computeSegmentGradient)({ label: 'A2', x: -2, y: 4 }, { label: 'B1', x: -3, y: 6 });
    strict_1.default.equal(grad.isVertical, false);
    strict_1.default.equal(grad.decimal, -2);
    strict_1.default.equal(grad.simplifiedFraction, '-2');
    const frac = (0, graphSolver_1.computeSegmentGradient)({ label: 'P', x: 1, y: 2 }, { label: 'Q', x: 5, y: 4 });
    strict_1.default.equal(frac.simplifiedFraction, '1/2');
    strict_1.default.equal(frac.decimal, 0.5);
});
(0, node_test_1.default)('parseDeterministicGraphProblem solves full BECE/WASSCE coordinate transformation question', () => {
    const question = `
(a) Using a scale of 2 cm to 2 units on both axes, draw on a graph sheet two perpendicular axes, Ox and Oy, for the interval -10 <= x <= 10 and -10 <= y <= 10.
(b) On the same graph sheet, draw:
(i) a quadrilateral ABCD with vertices A(2,4), B(2,8), C(8,8) and D(8,4);
(ii) the image A1B1C1D1 of ABCD under a translation by vector (-5, -2), where A -> A1, B -> B1, C -> C1 and D -> D1;
(iii) the image A2B2C2D2 of ABCD under a reflection in the y-axis, where A -> A2, B -> B2, C -> C2 and D -> D2.
(c) (i) What type of quadrilateral is ABCD?
(ii) Find the gradient of A2B1.
  `;
    const resolved = (0, graphSolver_1.parseDeterministicGraphProblem)(question);
    strict_1.default.ok(resolved);
    strict_1.default.equal(resolved.xAxis.min, -10);
    strict_1.default.equal(resolved.xAxis.max, 10);
    strict_1.default.equal(resolved.xAxis.step, 2);
    strict_1.default.equal(resolved.equalAspect, true);
    const abcd = resolved.shapes.find((s) => s.name === 'ABCD');
    const a1b1c1d1 = resolved.shapes.find((s) => s.name === 'A1B1C1D1');
    const a2b2c2d2 = resolved.shapes.find((s) => s.name === 'A2B2C2D2');
    const segA2B1 = resolved.shapes.find((s) => s.name.includes('A2') && s.name.includes('B1'));
    strict_1.default.ok(abcd && abcd.vertices.length === 4);
    strict_1.default.deepEqual(a1b1c1d1?.vertices.map((v) => [v.x, v.y]), [[-3, 2], [-3, 6], [3, 6], [3, 2]]);
    strict_1.default.deepEqual(a2b2c2d2?.vertices.map((v) => [v.x, v.y]), [[-2, 4], [-2, 8], [-8, 8], [-8, 4]]);
    strict_1.default.ok(segA2B1, 'Expected line segment A2B1 to be plotted');
    const stepsJoined = resolved.solutionSteps.join('\n');
    strict_1.default.match(stepsJoined, /Rectangle/i);
    strict_1.default.match(stepsJoined, /-2/);
    strict_1.default.equal(/[\u2012\u2013\u2014\u2015]/.test(stepsJoined), false);
});
(0, node_test_1.default)('resolveGraphSpec deterministically corrects LLM arithmetic and validates multiple expressions', () => {
    const resolved = (0, graphSolver_1.resolveGraphSpec)({
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
    strict_1.default.equal(resolved.functions.length, 2);
    const a1 = resolved.shapes.find((s) => s.name === 'A1B1C1D1')?.vertices[0];
    strict_1.default.equal(a1?.x, -3);
    strict_1.default.equal(a1?.y, 2);
    strict_1.default.ok(resolved.solutionSteps.some((s) => /Rectangle/i.test(s)));
    strict_1.default.equal(resolved.solutionSteps.some((s) => s.includes('—')), false);
});
(0, node_test_1.default)('parseDeterministicGraphProblem extracts natural-prose quadratic functions and plain coordinates', () => {
    const naturalQuadratic = 'Draw the graph of y = 2x^2 - 5x + 3 for the interval -2 <= x <= 4';
    const res1 = (0, graphSolver_1.parseDeterministicGraphProblem)(naturalQuadratic);
    strict_1.default.ok(res1);
    strict_1.default.equal(res1.functions.length, 1);
    strict_1.default.equal(res1.functions[0].expression, '2x^2 - 5x + 3');
    strict_1.default.equal(res1.xAxis.min, -2);
    strict_1.default.equal(res1.xAxis.max, 4);
    const commandPrefix = 'plot y = 3x - 1, y = -2x + 4';
    const res2 = (0, graphSolver_1.parseDeterministicGraphProblem)(commandPrefix);
    strict_1.default.ok(res2);
    strict_1.default.equal(res2.functions.length, 2);
    const plainCoords = 'Draw a triangle with vertices (1, 2), (4, 6), (7, 1)';
    const res3 = (0, graphSolver_1.parseDeterministicGraphProblem)(plainCoords);
    strict_1.default.ok(res3);
    strict_1.default.equal(res3.shapes.length, 1);
    strict_1.default.equal(res3.shapes[0].vertices.length, 3);
});
