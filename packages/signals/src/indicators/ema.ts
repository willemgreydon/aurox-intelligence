/**
 * Exponential Moving Average. Pure and deterministic.
 *
 * Seeds with the SMA of the first `period` values (Wilder-compatible seeding is
 * used by ATR/RSI separately). Returns the final EMA value, or null when there
 * is insufficient or non-finite data — never NaN.
 */
export const EMA_MIN_BARS = 2;

export function ema(values: readonly number[], period: number): number | null {
  if (period <= 0 || values.length < period) return null;
  if (values.some((value) => !Number.isFinite(value))) return null;

  const seedSlice = values.slice(0, period);
  let emaValue = seedSlice.reduce((sum, value) => sum + value, 0) / period;
  const multiplier = 2 / (period + 1);

  for (let i = period; i < values.length; i += 1) {
    const value = values[i]!;
    emaValue = (value - emaValue) * multiplier + emaValue;
  }

  return emaValue;
}

/** Full EMA series aligned to `values`; entries before the seed window are null. */
export function emaSeries(values: readonly number[], period: number): (number | null)[] {
  const out: (number | null)[] = values.map(() => null);
  if (period <= 0 || values.length < period) return out;
  if (values.some((value) => !Number.isFinite(value))) return out;

  const multiplier = 2 / (period + 1);
  let emaValue = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  out[period - 1] = emaValue;
  for (let i = period; i < values.length; i += 1) {
    emaValue = (values[i]! - emaValue) * multiplier + emaValue;
    out[i] = emaValue;
  }
  return out;
}
