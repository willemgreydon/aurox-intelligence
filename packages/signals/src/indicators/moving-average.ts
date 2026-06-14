export function movingAverage(values: number[], period: number): number | null {
  if (values.length < period || period <= 0) return null;
  const slice = values.slice(-period);
  // Non-finite input (NaN/Infinity) must not propagate a NaN score into the
  // signal pipeline — return null (insufficient/invalid data) instead.
  if (slice.some((value) => !Number.isFinite(value))) return null;
  return slice.reduce((sum, value) => sum + value, 0) / period;
}
