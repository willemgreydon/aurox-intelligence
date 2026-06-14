export function momentum(values: number[]): number | null {
  if (values.length < 2) return null;

  const first = values[0];
  const last = values.at(-1);

  // Guard non-finite endpoints (NaN/Infinity) so momentum never returns NaN.
  if (first === undefined || last === undefined || !Number.isFinite(first) || !Number.isFinite(last)) {
    return null;
  }

  return last - first;
}
