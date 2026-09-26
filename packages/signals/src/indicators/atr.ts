/**
 * Average True Range (Wilder). Pure and deterministic. Measures volatility in
 * price units. Returns null on insufficient (< period+1 bars) or non-finite
 * input — never NaN.
 */
export const ATR_MIN_BARS = 15; // period + 1 by default (period 14)

export interface AtrBar {
  high: number;
  low: number;
  close: number;
}

function trueRange(current: AtrBar, previousClose: number): number {
  const highLow = current.high - current.low;
  const highClose = Math.abs(current.high - previousClose);
  const lowClose = Math.abs(current.low - previousClose);
  return Math.max(highLow, highClose, lowClose);
}

export function computeATR(bars: readonly AtrBar[], period = 14): number | null {
  if (period <= 0 || bars.length < period + 1) return null;
  if (
    bars.some(
      (bar) => !Number.isFinite(bar.high) || !Number.isFinite(bar.low) || !Number.isFinite(bar.close),
    )
  ) {
    return null;
  }

  const trueRanges: number[] = [];
  for (let i = 1; i < bars.length; i += 1) {
    trueRanges.push(trueRange(bars[i]!, bars[i - 1]!.close));
  }

  // Seed ATR with the simple average of the first `period` true ranges.
  let atr = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;
  for (let i = period; i < trueRanges.length; i += 1) {
    atr = (atr * (period - 1) + trueRanges[i]!) / period;
  }
  return atr;
}
