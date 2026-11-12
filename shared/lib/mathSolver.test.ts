import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUniversalMathSolverPrompt,
  sanitizeMathResponse,
  tryDeterministicMathSolve,
} from './mathSolver';

test('tryDeterministicMathSolve differentiates expressions accurately with step-by-step markdown', () => {
  const res = tryDeterministicMathSolve('Find the derivative of x^3 + 2*x^2 - 5*x + 7');
  assert.ok(res);
  assert.equal(res.category, 'calculus_derivative');
  assert.match(res.answer, /3\s*\*?\s*x\s*\^\s*2\s*\+\s*4\s*\*?\s*x\s*-\s*5/);
  assert.ok(res.markdown.includes('Final Answer'));
});

test('tryDeterministicMathSolve evaluates definite integrals accurately', () => {
  const res = tryDeterministicMathSolve('integrate x^2 from 0 to 3');
  assert.ok(res);
  assert.equal(res.category, 'calculus_integral');
  assert.equal(res.answer, '9');
});

test('tryDeterministicMathSolve solves quadratic equations including complex roots', () => {
  const realRoots = tryDeterministicMathSolve('Solve x^2 - 5x + 6 = 0');
  assert.ok(realRoots);
  assert.equal(realRoots.category, 'algebra_equation');
  assert.ok(realRoots.answer.includes('3') && realRoots.answer.includes('2'));

  const complexRoots = tryDeterministicMathSolve('Solve x^2 + 2x + 5 = 0');
  assert.ok(complexRoots);
  assert.ok(complexRoots.answer.includes('i'));
});

test('tryDeterministicMathSolve solves systems of simultaneous equations and matrices', () => {
  const sys = tryDeterministicMathSolve('Solve 2x + y = 7, x - y = 2');
  assert.ok(sys);
  assert.equal(sys.category, 'linear_system');
  assert.ok(sys.answer.includes('x = 3') && sys.answer.includes('y = 1'));

  const detRes = tryDeterministicMathSolve('det([[1, 2], [3, 4]])');
  assert.ok(detRes);
  assert.equal(detRes.answer, '-2');
});

test('tryDeterministicMathSolve computes descriptive statistics cleanly', () => {
  const stats = tryDeterministicMathSolve('Find mean and standard deviation of 2, 4, 4, 4, 5, 5, 7, 9');
  assert.ok(stats);
  assert.equal(stats.category, 'statistics');
  assert.ok(stats.answer.includes('5') && stats.answer.includes('2'));
});

test('buildUniversalMathSolverPrompt delimits untrusted input, injects CAS check, and bans raw HTML bolding', () => {
  const cas = tryDeterministicMathSolve('Solve x^2 - 5x + 6 = 0');
  const prompt = buildUniversalMathSolverPrompt({
    problem: 'Solve x^2 - 5x + 6 = 0',
    subject: 'Mathematics',
    level: 'Undergraduate',
    verifiedComputation: cas,
  });

  assert.ok(prompt.includes('<math_problem>'));
  assert.ok(prompt.includes('<verified_cas_check'));
  assert.match(prompt, /Markdown|\*\*|KaTeX/i);
  assert.equal(prompt.includes('Use HTML for bolding'), false);
});

test('sanitizeMathResponse converts accidental HTML tags to Markdown, normalizes MixTeX LaTeX, and removes AI footprints', () => {
  const raw = '<strong>Final Answer</strong>\nMoreover, this is pivotal—we get \\(x = 3\\) and \\[\\int_0^3 x^2 dx = 9\\]';
  const cleaned = sanitizeMathResponse(raw);

  assert.equal(cleaned.includes('<strong>'), false);
  assert.ok(cleaned.includes('**Final Answer**'));
  assert.ok(cleaned.includes('$x = 3$'));
  assert.ok(cleaned.includes('$$\\int_0^3 x^2 dx = 9$$'));
  assert.equal(cleaned.includes('—'), false);
  assert.equal(cleaned.toLowerCase().includes('pivotal'), false);
});
