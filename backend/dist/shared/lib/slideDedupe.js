"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRenderableSlideImage = isRenderableSlideImage;
exports.dedupeSlidesByNumber = dedupeSlidesByNumber;
const DEAD_IMAGE_MARKERS = ['placeholder', 'dwyxspqbe', 'example.com'];
function isRenderableSlideImage(url) {
    if (typeof url !== 'string')
        return false;
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed))
        return false;
    const lower = trimmed.toLowerCase();
    return !DEAD_IMAGE_MARKERS.some((marker) => lower.includes(marker));
}
function toSlideNumber(value) {
    const n = typeof value === 'string' ? Number.parseInt(value, 10) : value;
    return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null;
}
/**
 * Guarantees one row per slide_number. When an upload pipeline re-runs it can leave
 * a placeholder row and an image row for the same slide, which doubles the deck
 * (38 -> 76) and puts the placeholder first. The row with a renderable image wins.
 */
function dedupeSlidesByNumber(rows) {
    if (!Array.isArray(rows))
        return [];
    const byNumber = new Map();
    const unnumbered = [];
    for (const row of rows) {
        if (!row)
            continue;
        const num = toSlideNumber(row.slide_number);
        if (num === null) {
            unnumbered.push(row);
            continue;
        }
        const current = byNumber.get(num);
        if (!current || (!isRenderableSlideImage(current.image_url) && isRenderableSlideImage(row.image_url))) {
            byNumber.set(num, row);
        }
    }
    const ordered = [...byNumber.entries()].sort((a, b) => a[0] - b[0]).map(([, row]) => row);
    return [...ordered, ...unnumbered];
}
