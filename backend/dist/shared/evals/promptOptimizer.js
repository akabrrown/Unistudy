"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expectedEloScore = expectedEloScore;
exports.updateEloPair = updateEloPair;
exports.rankPromptVariants = rankPromptVariants;
function expectedEloScore(ratingA, ratingB) {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}
/**
 * Updates ELO ratings for prompt variant A vs B after a test-case comparison.
 * outcomeA: 1 = A wins, 0.5 = tie, 0 = B wins.
 */
function updateEloPair(ratingA, ratingB, outcomeA, kFactor = 32) {
    const expA = expectedEloScore(ratingA, ratingB);
    const expB = 1 - expA;
    const nextA = Math.round((ratingA + kFactor * (outcomeA - expA)) * 10) / 10;
    const nextB = Math.round((ratingB + kFactor * ((1 - outcomeA) - expB)) * 10) / 10;
    return [nextA, nextB];
}
function rankPromptVariants(variants) {
    return [...variants].sort((a, b) => b.elo - a.elo || b.wins - a.wins || a.losses - b.losses);
}
