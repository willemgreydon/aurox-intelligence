import type { TaxReserveInput } from '@repo/api-contracts';
import { describe, expect, it } from 'vitest';
import { AUSTRIAN_TAX_POLICY } from '../tax/austrian-tax-policy';
import { computeTaxReserve } from '../tax/tax-reserve-engine';
import { eur } from './fixtures';

const AS_OF = '2026-02-01'; // within the policy freshness window (verified 2026-01-01, stale after 180d)

function baseInput(overrides: Partial<TaxReserveInput> = {}): TaxReserveInput {
  return {
    jurisdiction: 'AT',
    taxAssetClass: 'securities_capital_gain',
    realizationDate: '2026-01-15',
    grossRealizedGain: eur(1000),
    offsettableLosses: null,
    domesticTaxWithheld: null,
    foreignWithholdingTax: null,
    creditableForeignWithholding: null,
    unrealizedGain: null,
    ...overrides,
  };
}

describe('Austrian tax reserve engine', () => {
  it('reserves €275 on a €1,000 realised securities gain at 27.5%', () => {
    const result = computeTaxReserve(baseInput(), AUSTRIAN_TAX_POLICY, AS_OF);
    expect(result.status).toBe('calculated');
    expect(result.appliedRatePpm).toBe(275_000);
    expect(result.estimatedTax).toEqual(eur(275));
    expect(result.remainingTaxLiability).toEqual(eur(275));
    expect(result.recommendedReserve).toEqual(eur(275));
    expect(result.afterTaxProfit).toEqual(eur(725));
    expect(result.appliedRuleIds).toEqual(['AT-CAP-SPECIAL-275']);
    expect(result.confidence).toBe('high');
  });

  it('carries provenance: policy version, rule id and a primary BMF source', () => {
    const result = computeTaxReserve(baseInput(), AUSTRIAN_TAX_POLICY, AS_OF);
    expect(result.policyVersion).toBe('AT-2026.1');
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.sources[0]!.authority).toContain('Bundesministerium für Finanzen');
    expect(result.taxYear).toBe(2026);
  });

  it('never taxes an unrealised gain', () => {
    const result = computeTaxReserve(
      baseInput({ grossRealizedGain: eur(0), unrealizedGain: eur(5000) }),
      AUSTRIAN_TAX_POLICY,
      AS_OF,
    );
    expect(result.status).toBe('calculated');
    expect(result.estimatedTax).toEqual(eur(0));
    expect(result.recommendedReserve).toEqual(eur(0));
    expect(result.afterTaxProfit).toEqual(eur(0));
  });

  it('nets tax already withheld at source against the reserve', () => {
    const result = computeTaxReserve(
      baseInput({ domesticTaxWithheld: eur(275) }),
      AUSTRIAN_TAX_POLICY,
      AS_OF,
    );
    expect(result.estimatedTax).toEqual(eur(275));
    expect(result.taxAlreadyWithheld).toEqual(eur(275));
    expect(result.remainingTaxLiability).toEqual(eur(0));
    expect(result.recommendedReserve).toEqual(eur(0));
  });

  it('applies loss offset before the rate and records the assumption', () => {
    const result = computeTaxReserve(
      baseInput({ grossRealizedGain: eur(1000), offsettableLosses: eur(400) }),
      AUSTRIAN_TAX_POLICY,
      AS_OF,
    );
    expect(result.lossOffsetApplied).toEqual(eur(400));
    expect(result.adjustedTaxBase).toEqual(eur(600));
    expect(result.estimatedTax).toEqual(eur(165)); // 27.5% of 600
    expect(result.assumptions.some((a) => a.includes('offsettable'))).toBe(true);
    expect(result.confidence).toBe('moderate');
  });

  it('returns insufficient_information when the realised amount is unknown', () => {
    const result = computeTaxReserve(
      baseInput({ grossRealizedGain: null }),
      AUSTRIAN_TAX_POLICY,
      AS_OF,
    );
    expect(result.status).toBe('insufficient_information');
    expect(result.missingInformation).toContain('grossRealizedGain');
    expect(result.estimatedTax).toEqual(eur(0));
  });

  it('distinguishes the 25% bank-interest rate from the 27.5% securities rate', () => {
    const result = computeTaxReserve(
      baseInput({ taxAssetClass: 'bank_interest', grossRealizedGain: eur(1000) }),
      AUSTRIAN_TAX_POLICY,
      AS_OF,
    );
    expect(result.appliedRatePpm).toBe(250_000);
    expect(result.estimatedTax).toEqual(eur(250));
    expect(result.appliedRuleIds).toEqual(['AT-BANK-INTEREST-25']);
  });

  it('selects the effective-dated crypto rule only from its start date', () => {
    const before = computeTaxReserve(
      baseInput({ taxAssetClass: 'crypto', realizationDate: '2021-06-01' }),
      AUSTRIAN_TAX_POLICY,
      AS_OF,
    );
    expect(before.status).toBe('requires_review'); // crypto rule not yet effective in 2021

    const after = computeTaxReserve(
      baseInput({ taxAssetClass: 'crypto', realizationDate: '2023-06-01' }),
      AUSTRIAN_TAX_POLICY,
      AS_OF,
    );
    expect(after.status).toBe('calculated');
    expect(after.appliedRatePpm).toBe(275_000);
    expect(after.appliedRuleIds).toEqual(['AT-CRYPTO-275']);
  });

  it('flags requires_review for an unmodelled tax asset class (funds)', () => {
    const result = computeTaxReserve(
      baseInput({ taxAssetClass: 'fund' }),
      AUSTRIAN_TAX_POLICY,
      AS_OF,
    );
    expect(result.status).toBe('requires_review');
    expect(result.estimatedTax).toEqual(eur(0));
    expect(result.warnings.join(' ')).toMatch(/not modelled/);
  });

  it('downgrades confidence and warns when the policy is stale', () => {
    const result = computeTaxReserve(baseInput(), AUSTRIAN_TAX_POLICY, '2027-01-01');
    expect(result.confidence).toBe('low');
    expect(result.warnings.join(' ')).toMatch(/re-verification/);
  });

  it('tracks foreign withholding separately when not marked creditable', () => {
    const result = computeTaxReserve(
      baseInput({ foreignWithholdingTax: eur(150) }),
      AUSTRIAN_TAX_POLICY,
      AS_OF,
    );
    // Not creditable → does not reduce the reserve, but is surfaced as a warning.
    expect(result.remainingTaxLiability).toEqual(eur(275));
    expect(result.creditableWithholding).toEqual(eur(0));
    expect(result.warnings.join(' ')).toMatch(/[Ff]oreign withholding/);
  });

  it('credits foreign withholding against the liability when marked creditable', () => {
    const result = computeTaxReserve(
      baseInput({ foreignWithholdingTax: eur(150), creditableForeignWithholding: eur(150) }),
      AUSTRIAN_TAX_POLICY,
      AS_OF,
    );
    expect(result.creditableWithholding).toEqual(eur(150));
    expect(result.remainingTaxLiability).toEqual(eur(125)); // 275 − 150
  });
});
