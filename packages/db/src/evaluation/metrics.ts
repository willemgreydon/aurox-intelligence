/**
 * Pure, deterministic evaluation metrics for the evidence-chain outcome layer.
 * No I/O. Same inputs → same outputs. These are the canonical formulas used to
 * score matured signals/forecasts against the realized price path; the one-off
 * backfill script mirrors them inline, and any recompute job should import these.
 */

export type Direction = 'bullish' | 'bearish' | 'neutral';

export interface ScenarioWeights {
  bullish: number;
  base: number;
  bearish: number;
}

/** Simple forward return from entry to exit. */
export function forwardReturn(entry: number, exit: number): number {
  if (!Number.isFinite(entry) || entry === 0) return 0;
  return (exit - entry) / entry;
}

/** Classify a realized return into a direction with a symmetric neutral deadband. */
export function realizedDirection(ret: number, deadband = 0.0005): Direction {
  if (ret > deadband) return 'bullish';
  if (ret < -deadband) return 'bearish';
  return 'neutral';
}

/** Max favorable / adverse excursion over the horizon window, relative to entry. */
export function excursions(entry: number, window: readonly number[]): { mfe: number | null; mae: number | null } {
  if (!Number.isFinite(entry) || entry === 0 || window.length === 0) return { mfe: null, mae: null };
  return {
    mfe: (Math.max(...window) - entry) / entry,
    mae: (Math.min(...window) - entry) / entry,
  };
}

/** A prediction is correct when the predicted direction equals the realized one. */
export function directionCorrect(predicted: Direction, realized: Direction): boolean {
  return predicted === realized;
}

/**
 * Brier score across {bullish, base, bearish}. The realized outcome is one-hot
 * (neutral maps to `base`). Range [0, 2]; lower is better (0 = perfect).
 */
export function brierScore(weights: ScenarioWeights, realized: Direction): number {
  const outcome = { bullish: 0, base: 0, bearish: 0 };
  outcome[realized === 'neutral' ? 'base' : realized] = 1;
  return (
    (weights.bullish - outcome.bullish) ** 2 +
    (weights.base - outcome.base) ** 2 +
    (weights.bearish - outcome.bearish) ** 2
  );
}
