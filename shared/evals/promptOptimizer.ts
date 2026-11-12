export interface PromptVariantStats {
  id: string;
  elo: number;
  wins: number;
  losses: number;
  ties: number;
}

export function expectedEloScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Updates ELO ratings for prompt variant A vs B after a test-case comparison.
 * outcomeA: 1 = A wins, 0.5 = tie, 0 = B wins.
 */
export function updateEloPair(
  ratingA: number,
  ratingB: number,
  outcomeA: 1 | 0.5 | 0,
  kFactor = 32
): [number, number] {
  const expA = expectedEloScore(ratingA, ratingB);
  const expB = 1 - expA;
  const nextA = Math.round((ratingA + kFactor * (outcomeA - expA)) * 10) / 10;
  const nextB = Math.round((ratingB + kFactor * ((1 - outcomeA) - expB)) * 10) / 10;
  return [nextA, nextB];
}

export function rankPromptVariants(
  variants: PromptVariantStats[]
): PromptVariantStats[] {
  return [...variants].sort(
    (a, b) => b.elo - a.elo || b.wins - a.wins || a.losses - b.losses
  );
}

