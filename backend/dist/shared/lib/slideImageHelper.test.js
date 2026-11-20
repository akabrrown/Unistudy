"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const slideImageHelper_1 = require("./slideImageHelper");
(0, node_test_1.describe)('slideImageHelper - CDN optimization & placeholder detection', () => {
    (0, node_test_1.it)('detects null, empty, and broken placeholder URLs correctly', () => {
        strict_1.default.equal((0, slideImageHelper_1.isPlaceholderSlideUrl)(null), true);
        strict_1.default.equal((0, slideImageHelper_1.isPlaceholderSlideUrl)(undefined), true);
        strict_1.default.equal((0, slideImageHelper_1.isPlaceholderSlideUrl)(''), true);
        strict_1.default.equal((0, slideImageHelper_1.isPlaceholderSlideUrl)('https://example.com/placeholder.png'), true);
        strict_1.default.equal((0, slideImageHelper_1.isPlaceholderSlideUrl)('https://res.cloudinary.com/dwyxspqbe/image/upload/v1721820468/slide_placeholder.webp'), true);
        strict_1.default.equal((0, slideImageHelper_1.isPlaceholderSlideUrl)('https://res.cloudinary.com/demo/image/upload/sample_placeholder.jpg'), true);
        strict_1.default.equal((0, slideImageHelper_1.isPlaceholderSlideUrl)('https://res.cloudinary.com/dtauhhlve/image/upload/v1794818445/unistudy/lectures/ibrscvnnxsp8csu6zzfd.jpg'), false);
    });
    (0, node_test_1.it)('returns empty string for placeholder URLs in getOptimizedSlideUrl and getSlideThumbnailUrl', () => {
        strict_1.default.equal((0, slideImageHelper_1.getOptimizedSlideUrl)('https://res.cloudinary.com/dwyxspqbe/image/upload/v1721820468/slide_placeholder.webp'), '');
        strict_1.default.equal((0, slideImageHelper_1.getOptimizedSlideUrl)('https://example.com/placeholder.png'), '');
        strict_1.default.equal((0, slideImageHelper_1.getOptimizedSlideUrl)(''), '');
        strict_1.default.equal((0, slideImageHelper_1.getSlideThumbnailUrl)('https://res.cloudinary.com/dwyxspqbe/image/upload/v1721820468/slide_placeholder.webp'), '');
        strict_1.default.equal((0, slideImageHelper_1.getSlideThumbnailUrl)('https://example.com/placeholder.png'), '');
    });
    (0, node_test_1.it)('preserves pg_N (page index) parameter in Cloudinary URLs', () => {
        const rawPdfPageUrl = 'https://res.cloudinary.com/dtauhhlve/image/upload/pg_12,w_1400,f_auto,q_auto/unistudy/lectures/doc.jpg';
        const optimized = (0, slideImageHelper_1.getOptimizedSlideUrl)(rawPdfPageUrl, { lowBandwidth: false });
        strict_1.default.ok(optimized.includes('pg_12'), `Expected pg_12 in optimized URL, got: ${optimized}`);
        strict_1.default.ok(optimized.includes('w_1600'), `Expected w_1600 in optimized URL, got: ${optimized}`);
        const thumb = (0, slideImageHelper_1.getSlideThumbnailUrl)(rawPdfPageUrl);
        strict_1.default.ok(thumb.includes('pg_12'), `Expected pg_12 in thumbnail URL, got: ${thumb}`);
        strict_1.default.ok(thumb.includes('w_180'), `Expected w_180 in thumbnail URL, got: ${thumb}`);
    });
    (0, node_test_1.it)('transforms raw/upload to image/upload for PDF page extraction', () => {
        const rawUploadUrl = 'https://res.cloudinary.com/dtauhhlve/raw/upload/pg_3/unistudy/lectures/doc.jpg';
        const optimized = (0, slideImageHelper_1.getOptimizedSlideUrl)(rawUploadUrl);
        strict_1.default.ok(optimized.includes('/image/upload/'), `Expected /image/upload/, got: ${optimized}`);
        strict_1.default.ok(optimized.includes('pg_3'), `Expected pg_3 to be preserved, got: ${optimized}`);
    });
});
