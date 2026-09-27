/**
 * @repo/investment-services — pure, deterministic engines for the Investment
 * Services Intelligence domain.
 *
 * No I/O, no hidden state, no `Date.now()`/`Math.random()`. Every function is a
 * typed transform over contracts from `@repo/api-contracts`. Money math is
 * integer/BigInt (never binary float). Tax policy is versioned, source-backed,
 * effective-dated data — the 27.5% Austrian rate is policy DATA (AT-2026.1), not
 * an eternal constant.
 */

// Money primitives
export {
  addMoney,
  applyRatePpm,
  clampNonNegative,
  compareMoney,
  fromMajorUnits,
  isNegativeMoney,
  isZeroMoney,
  makeMoney,
  maxMoney,
  minMoney,
  mulMoneyByWholeQuantity,
  negateMoney,
  scaleFor,
  subMoney,
  toDecimalString,
  zeroMoney,
} from './money/money';
export type { Rounding } from './money/money';

// Provenance helpers
export { daysBetweenIso } from './provenance/provenance';

// Tax
export {
  AUSTRIAN_TAX_POLICY,
  getApplicableRule,
  isPolicyStale,
  sourcesForRule,
} from './tax/austrian-tax-policy';
export { computeTaxReserve } from './tax/tax-reserve-engine';
export { matchDisposal } from './tax/tax-lot-engine';
export type { DisposalMatchResult, LotMatchMethod, MatchedLotSlice } from './tax/tax-lot-engine';
export { computeLossOffset } from './tax/loss-offset-engine';
export type { CategoryOffset, LossOffsetResult } from './tax/loss-offset-engine';

// Suitability & appropriateness
export { evaluateSuitability, SUITABILITY_POLICY_VERSION } from './suitability/suitability-engine';
export {
  APPROPRIATENESS_POLICY_VERSION,
  evaluateAppropriateness,
} from './suitability/appropriateness-engine';

// Cost
export { aggregateCosts } from './cost/cost-engine';
export type { AggregateCostOptions } from './cost/cost-engine';

// Shared policy (auditable single source of truth)
export { COMPLEXITY_REQUIREMENTS } from './policy/complexity-policy';
