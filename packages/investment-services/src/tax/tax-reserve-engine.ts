import type {
  Money,
  MoneyCurrency,
  TaxConfidence,
  TaxPolicy,
  TaxReserveInput,
  TaxReserveResult,
} from '@repo/api-contracts';
import {
  addMoney,
  applyRatePpm,
  clampNonNegative,
  minMoney,
  scaleFor,
  subMoney,
  zeroMoney,
} from '../money/money';
import { getApplicableRule, isPolicyStale, sourcesForRule } from './austrian-tax-policy';

/**
 * Compute a tax reserve for a single realised, taxable amount.
 *
 * The chain is explicit and can never collapse into one number:
 *   grossRealizedGain → taxableGain → lossOffset → adjustedTaxBase →
 *   estimatedTax → taxAlreadyWithheld → remainingLiability → reserve →
 *   afterTaxProfit.
 *
 * Determinism: no `Date.now()`. The caller supplies `asOfIso` (used for policy
 * freshness and as `computedAt`). Unrealized gains are NEVER taxed here.
 */
export function computeTaxReserve(
  input: TaxReserveInput,
  policy: TaxPolicy,
  asOfIso: string,
): TaxReserveResult {
  const currency = pickCurrency(input);
  const scale = pickScale(input, currency);
  const zero = zeroMoney(currency, scale);
  const taxYear = yearOf(input.realizationDate);

  const base: Omit<TaxReserveResult, 'status' | 'confidence'> & {
    status: TaxReserveResult['status'];
    confidence: TaxReserveResult['confidence'];
  } = {
    jurisdiction: input.jurisdiction,
    taxYear,
    status: 'insufficient_information',
    grossRealizedGain: zero,
    taxableGain: zero,
    lossOffsetApplied: zero,
    adjustedTaxBase: zero,
    appliedRatePpm: null,
    estimatedTax: zero,
    taxAlreadyWithheld: zero,
    creditableWithholding: zero,
    remainingTaxLiability: zero,
    recommendedReserve: zero,
    afterTaxProfit: zero,
    confidence: 'none',
    assumptions: [],
    warnings: [],
    missingInformation: [],
    policyVersion: null,
    appliedRuleIds: [],
    sources: [],
    computedAt: asOfIso,
  };

  // 1. Missing the realised amount → we cannot compute anything.
  if (input.grossRealizedGain === null) {
    return {
      ...base,
      status: 'insufficient_information',
      missingInformation: ['grossRealizedGain'],
    };
  }

  const gross = input.grossRealizedGain;
  base.grossRealizedGain = gross;

  // 2. Find the applicable rule for this class as of the realisation date.
  const rule = getApplicableRule(policy, input.taxAssetClass, input.realizationDate);
  if (rule === null) {
    return {
      ...base,
      status: 'requires_review',
      afterTaxProfit: gross,
      policyVersion: policy.version,
      warnings: [
        `Tax treatment for asset class "${input.taxAssetClass}" is not modelled in policy ${policy.version}; no tax applied. Manual review required.`,
      ],
      sources: policy.sources,
    };
  }

  const assumptions: string[] = [];
  const warnings: string[] = [];
  const missingInformation: string[] = [];

  // 3. Only positive realised amounts are taxable; a negative gross is a loss.
  const taxableGain = clampNonNegative(gross);
  if (gross.minorUnits < 0) {
    assumptions.push('Gross realised amount is a loss; taxable gain treated as 0.');
  }

  // 4. Loss offsetting (within compatible income category — assumed by caller).
  const offsettable = input.offsettableLosses ? clampNonNegative(input.offsettableLosses) : zero;
  const lossOffsetApplied = minMoney(offsettable, taxableGain);
  if (lossOffsetApplied.minorUnits > 0) {
    assumptions.push(
      'Provided losses assumed offsettable within the same income category (capital income, special rate).',
    );
  }

  const adjustedTaxBase = clampNonNegative(subMoney(taxableGain, lossOffsetApplied));

  // 5. Estimated tax at the effective-dated rate.
  const estimatedTax = applyRatePpm(adjustedTaxBase, rule.rate.ratePpm, 'half_up');

  // 6. Withholding: domestic KESt + creditable foreign WHT reduce the liability.
  const domesticWithheld = input.domesticTaxWithheld ?? zero;
  const creditableForeign = input.creditableForeignWithholding
    ? clampNonNegative(input.creditableForeignWithholding)
    : zero;
  if (creditableForeign.minorUnits > 0) {
    assumptions.push('Foreign withholding tax assumed creditable against the Austrian liability.');
  }
  if (
    input.foreignWithholdingTax &&
    input.foreignWithholdingTax.minorUnits > 0 &&
    creditableForeign.minorUnits === 0
  ) {
    warnings.push(
      'Foreign withholding tax is present but not marked creditable; it is tracked separately and not netted here.',
    );
  }

  const remainingTaxLiability = clampNonNegative(
    subMoney(subMoney(estimatedTax, domesticWithheld), creditableForeign),
  );

  // 7. Reserve = what still has to be set aside. After-tax profit = gross − full estimated tax.
  const recommendedReserve = remainingTaxLiability;
  const afterTaxProfit = subMoney(gross, estimatedTax);

  // 8. Confidence — honest, downgraded when the policy is stale.
  let confidence: TaxConfidence = assumptions.length === 0 ? 'high' : 'moderate';
  if (isPolicyStale(policy, asOfIso)) {
    confidence = 'low';
    warnings.push(
      `Tax policy ${policy.version} requires re-verification (last verified ${policy.lastVerifiedAt ?? 'never'}).`,
    );
  }

  return {
    jurisdiction: input.jurisdiction,
    taxYear,
    status: 'calculated',
    grossRealizedGain: gross,
    taxableGain,
    lossOffsetApplied,
    adjustedTaxBase,
    appliedRatePpm: rule.rate.ratePpm,
    estimatedTax,
    taxAlreadyWithheld: domesticWithheld,
    creditableWithholding: creditableForeign,
    remainingTaxLiability,
    recommendedReserve,
    afterTaxProfit,
    confidence,
    assumptions,
    warnings,
    missingInformation,
    policyVersion: policy.version,
    appliedRuleIds: [rule.ruleId],
    sources: sourcesForRule(policy, rule),
    computedAt: asOfIso,
  };
}

function pickCurrency(input: TaxReserveInput): MoneyCurrency {
  const candidates: (Money | null)[] = [
    input.grossRealizedGain,
    input.offsettableLosses,
    input.domesticTaxWithheld,
    input.foreignWithholdingTax,
    input.creditableForeignWithholding,
    input.unrealizedGain,
  ];
  for (const candidate of candidates) {
    if (candidate) return candidate.currency;
  }
  return 'EUR';
}

function pickScale(input: TaxReserveInput, currency: MoneyCurrency): number {
  if (input.grossRealizedGain) return input.grossRealizedGain.scale;
  return scaleFor(currency);
}

function yearOf(isoDate: string): number {
  const year = Number.parseInt(isoDate.slice(0, 4), 10);
  if (Number.isNaN(year)) {
    throw new Error(`Cannot parse tax year from date "${isoDate}"`);
  }
  return year;
}

// Re-exported so callers assembling portfolio-wide views can sum reserves safely.
export { addMoney };
