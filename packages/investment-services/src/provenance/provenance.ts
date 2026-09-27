/**
 * Whole days between two ISO dates (b - a), UTC, deterministic. Uses `Date.parse`
 * on explicit strings only — never `Date.now()` — so it stays pure/reproducible.
 */
export function daysBetweenIso(aIso: string, bIso: string): number {
  const a = Date.parse(aIso);
  const b = Date.parse(bIso);
  if (Number.isNaN(a) || Number.isNaN(b)) {
    throw new Error(`Invalid ISO date in daysBetweenIso: "${aIso}" / "${bIso}"`);
  }
  return Math.floor((b - a) / 86_400_000);
}
