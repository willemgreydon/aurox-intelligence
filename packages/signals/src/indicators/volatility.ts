export function volatility(values: number[]): number {
  if (values.length < 2) return 0;
  // Non-finite input (NaN/Infinity) must not propagate into the volatility/risk
  // overlay — treat invalid series as zero-volatility rather than emitting NaN.
  if (values.some((value) => !Number.isFinite(value))) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
