import type { CandlePatternName } from '@repo/api-contracts';
import { isFiniteNumber, mean } from '../util/clamp';
import type { CandleBar } from './types';

/**
 * Empirical validation harness for candlestick patterns.
 *
 * IMPORTANT (anti-overfitting doctrine): pattern DETECTION is a geometric fact.
 * Whether a detected pattern has PREDICTIVE POWER is a separate empirical
 * question. This module intentionally lives apart from detection/confluence and
 * computes forward-looking statistics that a backtest can later evaluate. It
 * asserts nothing about predictive power on its own — it only measures.
 *
 * Pure and deterministic: given the same occurrences and bars, identical stats.
 */

export interface PatternOccurrence {
  /** index of the confirming (last) candle of the pattern within `bars` */
  index: number;
  pattern: CandlePatternName;
  /** conventional bias of the pattern shape at detection time */
  direction: 'bullish' | 'bearish' | 'neutral';
}

export interface ForwardOutcome {
  pattern: CandlePatternName;
  direction: 'bullish' | 'bearish' | 'neutral';
  /** close-to-close return over `horizon` bars, as a fraction */
  forwardReturn: number;
  /** max favorable excursion over the horizon (fraction, signed toward direction) */
  maxFavorableExcursion: number;
  /** max adverse excursion over the horizon (fraction, signed against direction) */
  maxAdverseExcursion: number;
}

/** Compute the forward outcome for one occurrence over `horizon` future bars. */
export function computeForwardOutcome(
  bars: readonly CandleBar[],
  occurrence: PatternOccurrence,
  horizon: number,
): ForwardOutcome | null {
  const entryBar = bars[occurrence.index];
  const exitBar = bars[occurrence.index + horizon];
  if (!entryBar || !exitBar || !isFiniteNumber(entryBar.close) || entryBar.close === 0) return null;

  const entry = entryBar.close;
  const forwardReturn = (exitBar.close - entry) / entry;

  let maxHigh = entry;
  let minLow = entry;
  for (let i = occurrence.index + 1; i <= occurrence.index + horizon && i < bars.length; i += 1) {
    const b = bars[i]!;
    if (isFiniteNumber(b.high)) maxHigh = Math.max(maxHigh, b.high);
    if (isFiniteNumber(b.low)) minLow = Math.min(minLow, b.low);
  }
  const upMove = (maxHigh - entry) / entry;
  const downMove = (minLow - entry) / entry;
  const dir = occurrence.direction === 'bearish' ? -1 : 1;

  return {
    pattern: occurrence.pattern,
    direction: occurrence.direction,
    forwardReturn,
    maxFavorableExcursion: dir >= 0 ? upMove : -downMove,
    maxAdverseExcursion: dir >= 0 ? downMove : -upMove,
  };
}

export interface PatternStats {
  pattern: CandlePatternName;
  sampleSize: number;
  /** fraction of occurrences whose forward return moved in the pattern's direction */
  hitRate: number | null;
  /** mean direction-adjusted forward return */
  expectancy: number | null;
  meanMaxFavorableExcursion: number | null;
  meanMaxAdverseExcursion: number | null;
}

/** Aggregate forward outcomes into per-pattern statistics. Pure. */
export function aggregatePatternStats(outcomes: readonly ForwardOutcome[]): PatternStats[] {
  const byPattern = new Map<CandlePatternName, ForwardOutcome[]>();
  for (const o of outcomes) {
    const list = byPattern.get(o.pattern) ?? [];
    list.push(o);
    byPattern.set(o.pattern, list);
  }

  const stats: PatternStats[] = [];
  for (const [pattern, list] of byPattern) {
    const adjusted = list.map((o) => (o.direction === 'bearish' ? -o.forwardReturn : o.forwardReturn));
    const hits = adjusted.filter((r) => r > 0).length;
    stats.push({
      pattern,
      sampleSize: list.length,
      hitRate: list.length > 0 ? hits / list.length : null,
      expectancy: mean(adjusted),
      meanMaxFavorableExcursion: mean(list.map((o) => o.maxFavorableExcursion)),
      meanMaxAdverseExcursion: mean(list.map((o) => o.maxAdverseExcursion)),
    });
  }
  return stats.sort((a, b) => a.pattern.localeCompare(b.pattern));
}
