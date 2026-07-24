"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateNextReview = calculateNextReview;
function calculateNextReview(card, rating) {
    const q = { again: 0, hard: 3, good: 4, easy: 5 }[rating];
    let { ease_factor, interval_days, repetitions } = card;
    if (q < 3) {
        repetitions = 0;
        interval_days = 1;
    }
    else {
        if (repetitions === 0)
            interval_days = 1;
        else if (repetitions === 1)
            interval_days = 6;
        else
            interval_days = Math.round(interval_days * ease_factor);
        ease_factor = ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
        ease_factor = Math.max(1.3, Math.min(2.5, ease_factor));
        repetitions += 1;
    }
    const next_review = new Date();
    next_review.setDate(next_review.getDate() + interval_days);
    return { ease_factor, interval_days, repetitions, next_review };
}
