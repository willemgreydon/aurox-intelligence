import type { InvestmentEvidence, SourceReference } from '@repo/api-contracts';

/** Convenience constructor for a source reference (keeps callers honest). */
export function makeSource(input: SourceReference): SourceReference {
  return input;
}

/** Convenience constructor for a piece of evidence. */
export function makeEvidence(input: InvestmentEvidence): InvestmentEvidence {
  return input;
}

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
