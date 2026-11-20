"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const slideDedupe_1 = require("./slideDedupe");
const real = (n, id = `r${n}`) => ({
    id,
    slide_number: n,
    image_url: `https://res.cloudinary.com/demo/image/upload/v1/slides/s${n}.png`,
});
const placeholder = (n, id = `p${n}`) => ({
    id,
    slide_number: n,
    image_url: 'https://example.com/placeholder.png',
});
(0, node_test_1.test)('collapses doubled rows (38 -> 76) back to one per slide_number', () => {
    const rows = [...Array.from({ length: 38 }, (_, i) => placeholder(i + 1)), ...Array.from({ length: 38 }, (_, i) => real(i + 1))];
    const out = (0, slideDedupe_1.dedupeSlidesByNumber)(rows);
    strict_1.default.equal(out.length, 38);
    strict_1.default.ok(out.every((s) => (0, slideDedupe_1.isRenderableSlideImage)(s.image_url)));
});
(0, node_test_1.test)('prefers the row with a real image regardless of order', () => {
    const out = (0, slideDedupe_1.dedupeSlidesByNumber)([real(1, 'a'), placeholder(1, 'b')]);
    strict_1.default.equal(out[0].id, 'a');
    const out2 = (0, slideDedupe_1.dedupeSlidesByNumber)([placeholder(1, 'b'), real(1, 'a')]);
    strict_1.default.equal(out2[0].id, 'a');
});
(0, node_test_1.test)('sorts by slide_number and treats numeric strings as numbers', () => {
    const out = (0, slideDedupe_1.dedupeSlidesByNumber)([
        { id: 'x', slide_number: '10', image_url: real(10).image_url },
        { id: 'y', slide_number: 2, image_url: real(2).image_url },
        { id: 'z', slide_number: '2', image_url: real(2).image_url },
    ]);
    strict_1.default.deepEqual(out.map((s) => Number(s.slide_number)), [2, 10]);
});
(0, node_test_1.test)('keeps rows without a usable slide_number instead of dropping content', () => {
    const out = (0, slideDedupe_1.dedupeSlidesByNumber)([real(1), { id: 'n', slide_number: null, image_url: '' }]);
    strict_1.default.equal(out.length, 2);
});
(0, node_test_1.test)('returns empty array for non-array input', () => {
    strict_1.default.deepEqual((0, slideDedupe_1.dedupeSlidesByNumber)(null), []);
});
(0, node_test_1.test)('isRenderableSlideImage rejects placeholders and non-http values', () => {
    strict_1.default.equal((0, slideDedupe_1.isRenderableSlideImage)('https://example.com/placeholder.png'), false);
    strict_1.default.equal((0, slideDedupe_1.isRenderableSlideImage)('https://res.cloudinary.com/dwyxspqbe/x.png'), false);
    strict_1.default.equal((0, slideDedupe_1.isRenderableSlideImage)(''), false);
    strict_1.default.equal((0, slideDedupe_1.isRenderableSlideImage)('data:image/png;base64,AAA'), false);
    strict_1.default.equal((0, slideDedupe_1.isRenderableSlideImage)(real(3).image_url), true);
});
