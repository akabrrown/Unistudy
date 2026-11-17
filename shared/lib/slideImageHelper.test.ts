import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPlaceholderSlideUrl,
  getOptimizedSlideUrl,
  getSlideThumbnailUrl,
  getSlideBlurPlaceholder,
} from './slideImageHelper';

describe('slideImageHelper - CDN optimization & placeholder detection', () => {
  it('detects null, empty, and broken placeholder URLs correctly', () => {
    assert.equal(isPlaceholderSlideUrl(null), true);
    assert.equal(isPlaceholderSlideUrl(undefined), true);
    assert.equal(isPlaceholderSlideUrl(''), true);
    assert.equal(isPlaceholderSlideUrl('https://example.com/placeholder.png'), true);
    assert.equal(isPlaceholderSlideUrl('https://res.cloudinary.com/dwyxspqbe/image/upload/v1721820468/slide_placeholder.webp'), true);
    assert.equal(isPlaceholderSlideUrl('https://res.cloudinary.com/demo/image/upload/sample_placeholder.jpg'), true);
    assert.equal(isPlaceholderSlideUrl('https://res.cloudinary.com/dtauhhlve/image/upload/v1794818445/unistudy/lectures/ibrscvnnxsp8csu6zzfd.jpg'), false);
  });

  it('returns empty string for placeholder URLs in getOptimizedSlideUrl and getSlideThumbnailUrl', () => {
    assert.equal(getOptimizedSlideUrl('https://res.cloudinary.com/dwyxspqbe/image/upload/v1721820468/slide_placeholder.webp'), '');
    assert.equal(getOptimizedSlideUrl('https://example.com/placeholder.png'), '');
    assert.equal(getOptimizedSlideUrl(''), '');
    assert.equal(getSlideThumbnailUrl('https://res.cloudinary.com/dwyxspqbe/image/upload/v1721820468/slide_placeholder.webp'), '');
    assert.equal(getSlideThumbnailUrl('https://example.com/placeholder.png'), '');
  });

  it('preserves pg_N (page index) parameter in Cloudinary URLs', () => {
    const rawPdfPageUrl = 'https://res.cloudinary.com/dtauhhlve/image/upload/pg_12,w_1400,f_auto,q_auto/unistudy/lectures/doc.jpg';
    const optimized = getOptimizedSlideUrl(rawPdfPageUrl, { lowBandwidth: false });
    assert.ok(optimized.includes('pg_12'), `Expected pg_12 in optimized URL, got: ${optimized}`);
    assert.ok(optimized.includes('w_1600'), `Expected w_1600 in optimized URL, got: ${optimized}`);

    const thumb = getSlideThumbnailUrl(rawPdfPageUrl);
    assert.ok(thumb.includes('pg_12'), `Expected pg_12 in thumbnail URL, got: ${thumb}`);
    assert.ok(thumb.includes('w_180'), `Expected w_180 in thumbnail URL, got: ${thumb}`);
  });

  it('transforms raw/upload to image/upload for PDF page extraction', () => {
    const rawUploadUrl = 'https://res.cloudinary.com/dtauhhlve/raw/upload/pg_3/unistudy/lectures/doc.jpg';
    const optimized = getOptimizedSlideUrl(rawUploadUrl);
    assert.ok(optimized.includes('/image/upload/'), `Expected /image/upload/, got: ${optimized}`);
    assert.ok(optimized.includes('pg_3'), `Expected pg_3 to be preserved, got: ${optimized}`);
  });
});
