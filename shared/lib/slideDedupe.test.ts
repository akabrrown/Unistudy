import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupeSlidesByNumber, isRenderableSlideImage } from './slideDedupe';

const real = (n: number, id = `r${n}`) => ({
  id,
  slide_number: n,
  image_url: `https://res.cloudinary.com/demo/image/upload/v1/slides/s${n}.png`,
});
const placeholder = (n: number, id = `p${n}`) => ({
  id,
  slide_number: n,
  image_url: 'https://example.com/placeholder.png',
});

test('collapses doubled rows (38 -> 76) back to one per slide_number', () => {
  const rows = [...Array.from({ length: 38 }, (_, i) => placeholder(i + 1)), ...Array.from({ length: 38 }, (_, i) => real(i + 1))];
  const out = dedupeSlidesByNumber(rows);
  assert.equal(out.length, 38);
  assert.ok(out.every((s) => isRenderableSlideImage(s.image_url)));
});

test('prefers the row with a real image regardless of order', () => {
  const out = dedupeSlidesByNumber([real(1, 'a'), placeholder(1, 'b')]);
  assert.equal(out[0].id, 'a');
  const out2 = dedupeSlidesByNumber([placeholder(1, 'b'), real(1, 'a')]);
  assert.equal(out2[0].id, 'a');
});

test('sorts by slide_number and treats numeric strings as numbers', () => {
  const out = dedupeSlidesByNumber([
    { id: 'x', slide_number: '10', image_url: real(10).image_url },
    { id: 'y', slide_number: 2, image_url: real(2).image_url },
    { id: 'z', slide_number: '2', image_url: real(2).image_url },
  ]);
  assert.deepEqual(out.map((s) => Number(s.slide_number)), [2, 10]);
});

test('keeps rows without a usable slide_number instead of dropping content', () => {
  const out = dedupeSlidesByNumber([real(1), { id: 'n', slide_number: null, image_url: '' }]);
  assert.equal(out.length, 2);
});

test('returns empty array for non-array input', () => {
  assert.deepEqual(dedupeSlidesByNumber(null as unknown as []), []);
});

test('isRenderableSlideImage rejects placeholders and non-http values', () => {
  assert.equal(isRenderableSlideImage('https://example.com/placeholder.png'), false);
  assert.equal(isRenderableSlideImage('https://res.cloudinary.com/dwyxspqbe/x.png'), false);
  assert.equal(isRenderableSlideImage(''), false);
  assert.equal(isRenderableSlideImage('data:image/png;base64,AAA'), false);
  assert.equal(isRenderableSlideImage(real(3).image_url), true);
});
