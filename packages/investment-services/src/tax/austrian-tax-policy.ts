import type { SourceReference, TaxAssetClass, TaxPolicy, TaxRule } from '@repo/api-contracts';
import { daysBetweenIso } from '../provenance/provenance';

/**
 * Austrian tax policy — VERSIONED DATA, not an eternal constant.
 *
 * Baseline encoded (verified against BMF guidance current in 2026):
 *   - Special rate 27.5% (275_000 ppm) for most private capital income:
 *     realised gains on shares / securitised instruments, dividends, and crypto
 *     under the private capital-income regime.
 *   - 25% (250_000 ppm) for savings / current-account interest.
 *   - Funds and non-securitised derivatives are NOT encoded here on purpose —
 *     they have distinct treatment; the engine returns `requires_review` rather
 *     than guessing a rate.
 *
 * Every rule points at a primary BMF source and the policy carries
 * `lastVerifiedAt` + `staleAfterDays` so the runtime can detect when this
 * knowledge needs re-verification. Nothing here scrapes the web.
 */

const BMF_CAPITAL_INCOME: SourceReference = {
  sourceId: 'AT-BMF-KAPITALVERMOEGEN',
  authority: 'Bundesministerium für Finanzen (BMF)',
  title: 'Besteuerung von Kapitalvermögen (KESt / Sondersteuersatz)',
  reference: 'https://www.bmf.gv.at/themen/steuern/sparen-veranlagen/besteuerung-kapitalvermoegen.html',
  jurisdiction: 'AT',
  sourceType: 'government',
  effectiveFrom: '2016-01-01',
  effectiveUntil: null,
  retrievedAt: '2026-01-01',
  verifiedAt: '2026-01-01',
};

const BMF_CRYPTO: SourceReference = {
  sourceId: 'AT-BMF-KRYPTO',
  authority: 'Bundesministerium für Finanzen (BMF)',
  title: 'Besteuerung von Kryptowährungen',
  reference: 'https://www.bmf.gv.at/themen/steuern/sparen-veranlagen/besteuerung-kryptowaehrungen.html',
  jurisdiction: 'AT',
  sourceType: 'government',
  effectiveFrom: '2022-03-01',
  effectiveUntil: null,
  retrievedAt: '2026-01-01',
  verifiedAt: '2026-01-01',
};

const AT_RULES: TaxRule[] = [
  {
    ruleId: 'AT-CAP-SPECIAL-275',
    jurisdiction: 'AT',
    description:
      'Special tax rate of 27.5% on realised capital gains from securities, dividends and equity income.',
    appliesTo: ['securities_capital_gain', 'dividend', 'equity'],
    rate: { ratePpm: 275_000, label: '27.5% special rate', incomeCategory: 'capital_income_special_rate' },
    effectiveFrom: '2016-01-01',
    effectiveUntil: null,
    sourceIds: [BMF_CAPITAL_INCOME.sourceId],
    notes: 'Applies to most private capital income; exceptions (funds, business assets) handled separately.',
  },
  {
    ruleId: 'AT-CRYPTO-275',
    jurisdiction: 'AT',
    description: 'Special tax rate of 27.5% on income from cryptocurrencies under the private capital-income regime.',
    appliesTo: ['crypto'],
    rate: { ratePpm: 275_000, label: '27.5% special rate (crypto)', incomeCategory: 'capital_income_special_rate' },
    effectiveFrom: '2022-03-01',
    effectiveUntil: null,
    sourceIds: [BMF_CRYPTO.sourceId],
    notes: 'ÖkoStRefG 2022 regime. Old-holding / grandfathering cases require separate handling.',
  },
  {
    ruleId: 'AT-BANK-INTEREST-25',
    jurisdiction: 'AT',
    description: 'Tax rate of 25% on interest from savings and current accounts at Austrian banks.',
    appliesTo: ['bank_interest'],
    rate: { ratePpm: 250_000, label: '25% bank interest', incomeCategory: 'bank_interest' },
    effectiveFrom: '2016-01-01',
    effectiveUntil: null,
    sourceIds: [BMF_CAPITAL_INCOME.sourceId],
    notes: 'Deposit interest is taxed at 25%, distinct from the 27.5% securities rate.',
  },
];

export const AUSTRIAN_TAX_POLICY: TaxPolicy = {
  policyId: 'AT-CAPITAL-INCOME',
  jurisdiction: 'AT',
  version: 'AT-2026.1',
  rules: AT_RULES,
  sources: [BMF_CAPITAL_INCOME, BMF_CRYPTO],
  publishedAt: '2026-01-01',
  lastVerifiedAt: '2026-01-01',
  staleAfterDays: 180,
};

/**
 * Pick the rule that applied to a tax asset class at a given date. Effective
 * dating means a realisation event is taxed under the rule in force on its date,
 * not whatever is current now. Returns the most-recently-effective matching rule
 * or `null` when the class is not modelled.
 */
export function getApplicableRule(
  policy: TaxPolicy,
  taxAssetClass: TaxAssetClass,
  isoDate: string,
): TaxRule | null {
  // Compare on the calendar day only, so a datetime input (e.g. "2026-06-30T14:00Z")
  // is not lexically excluded on a rule's final date-only effective day.
  const day = isoDate.slice(0, 10);
  const candidates = policy.rules
    .filter((rule) => rule.appliesTo.includes(taxAssetClass))
    .filter((rule) => rule.effectiveFrom <= day)
    .filter((rule) => rule.effectiveUntil === null || day <= rule.effectiveUntil)
    .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1));
  return candidates[0] ?? null;
}

/**
 * Whether the policy needs re-verification as of `asOfIso`. Unverified policy is
 * treated as stale (conservative). Pure — takes the reference date as a param.
 */
export function isPolicyStale(policy: TaxPolicy, asOfIso: string): boolean {
  if (policy.lastVerifiedAt === null || policy.staleAfterDays === null) {
    return true;
  }
  return daysBetweenIso(policy.lastVerifiedAt, asOfIso) > policy.staleAfterDays;
}

/** Collect the source references backing a rule, for result provenance. */
export function sourcesForRule(policy: TaxPolicy, rule: TaxRule): SourceReference[] {
  return policy.sources.filter((source) => rule.sourceIds.includes(source.sourceId));
}
