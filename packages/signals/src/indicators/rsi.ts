/**
 * Relative Strength Index (Wilder's smoothing). Pure and deterministic.
 *
 * Output range 0–100. Returns null on insufficient (< period+1 bars) or
 * non-finite input — never NaN. A flat series (no losses) returns 100; a
 * monotonic decline (no gains) returns 0.
 */
export const RSI_MIN_BARS = 15; // needs period + 1 closes; default period 14

export function computeRSI(closes: readonly number[], period = 14): number | null {
  if (period <= 0 || closes.length < period + 1) return null;
  if (closes.some((value) => !Number.isFinite(value))) return null;

  let avgGain = 0;
  let avgLoss = 0;

  // Seed with the first `period` changes.
  for (let i = 1; i <= period; i += 1) {
    const change = closes[i]! - closes[i - 1]!;
    if (change >= 0) avgGain += change;
    else avgLoss += -change;
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder smoothing across the remaining changes.
  for (let i = period + 1; i < closes.length; i += 1) {
    const change = closes[i]! - closes[i - 1]!;
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
