import type { CostComponent, TaxEvent, TaxLot } from '@repo/api-contracts';
import { describe, expect, it } from 'vitest';
import { aggregateCosts } from '../cost/cost-engine';
import { evaluateAppropriateness } from '../suitability/appropriateness-engine';
import { evaluateSuitability } from '../suitability/suitability-engine';
import { computeLossOffset } from '../tax/loss-offset-engine';
import { matchDisposal } from '../tax/tax-lot-engine';
import {
  COMPLEX_LEVERAGED_ETP,
  eur,
  makeProfile,
  NON_COMPLEX_EQUITY,
} from './fixtures';

const AT = '2026-02-01';

describe('tax-lot FIFO matching', () => {
  const lots: TaxLot[] = [
    {
      lotId: 'lot-old',
      instrumentSymbol: 'AAPL',
      jurisdiction: 'AT',
      taxAssetClass: 'securities_capital_gain',
      acquisitionDate: '2025-01-01',
      acquisitionQuantity: 10,
      acquisitionUnitPrice: eur(100),
      acquisitionCosts: eur(0),
      remainingQuantity: 10,
      currency: 'EUR',
      fxProvenance: null,
      broker: null,
    },
    {
      lotId: 'lot-new',
      instrumentSymbol: 'AAPL',
      jurisdiction: 'AT',
      taxAssetClass: 'securities_capital_gain',
      acquisitionDate: '2025-06-01',
      acquisitionUnitPrice: eur(120),
      acquisitionQuantity: 10,
      acquisitionCosts: eur(0),
      remainingQuantity: 10,
      currency: 'EUR',
      fxProvenance: null,
      broker: null,
    },
  ];

  it('consumes the oldest lot first and computes an exact realised gain', () => {
    // Sell 15 @ €150: 10 from €100 lot (+€500) and 5 from €120 lot (+€150) == €650.
    const result = matchDisposal(lots, 15, eur(150), 'fifo');
    expect(result.matched.map((m) => m.lotId)).toEqual(['lot-old', 'lot-new']);
    expect(result.matched[0]!.quantity).toBe(10);
    expect(result.matched[1]!.quantity).toBe(5);
    expect(result.totalRealizedGain).toEqual(eur(650));
    expect(result.unmatchedQuantity).toBe(0);
  });

  it('reports unmatched quantity when lots are exhausted', () => {
    const result = matchDisposal(lots, 25, eur(150), 'fifo');
    expect(result.unmatchedQuantity).toBe(5);
  });

  it('includes the full acquisition costs in cost basis without dropping remainder cents', () => {
    // €10.00 of acquisition costs over 3 units must be fully credited to cost
    // basis (regression: floor-per-unit previously dropped a cent → €9.99).
    const costed: TaxLot[] = [
      {
        lotId: 'lot-costed',
        instrumentSymbol: 'AAPL',
        jurisdiction: 'AT',
        taxAssetClass: 'securities_capital_gain',
        acquisitionDate: '2025-01-01',
        acquisitionQuantity: 3,
        acquisitionUnitPrice: eur(100),
        acquisitionCosts: eur(10),
        remainingQuantity: 3,
        currency: 'EUR',
        fxProvenance: null,
        broker: null,
      },
    ];
    const result = matchDisposal(costed, 3, eur(150), 'fifo');
    // price basis €300 + full €10 costs = €310 cost basis; proceeds €450 → gain €140.
    expect(result.matched[0]!.costBasis).toEqual(eur(310));
    expect(result.totalRealizedGain).toEqual(eur(140));
  });
});

describe('loss offsetting within income categories', () => {
  it('offsets losses against gains in the same category and carries the rest forward', () => {
    const events: TaxEvent[] = [
      { eventId: 'g1', type: 'realized_gain', instrumentSymbol: 'AAPL', taxAssetClass: 'securities_capital_gain', incomeCategory: 'capital_income_special_rate', date: '2026-01-10', amount: eur(1000) },
      { eventId: 'l1', type: 'realized_loss', instrumentSymbol: 'TSLA', taxAssetClass: 'securities_capital_gain', incomeCategory: 'capital_income_special_rate', date: '2026-01-20', amount: { minorUnits: -40_000, currency: 'EUR', scale: 2 } },
      { eventId: 'i1', type: 'interest', instrumentSymbol: 'CASH', taxAssetClass: 'bank_interest', incomeCategory: 'bank_interest', date: '2026-01-25', amount: eur(200) },
    ];
    const result = computeLossOffset(events);
    const capital = result.byCategory.find((c) => c.incomeCategory === 'capital_income_special_rate')!;
    expect(capital.offsetApplied).toEqual(eur(400));
    expect(capital.netTaxBase).toEqual(eur(600));
    // Bank interest is a separate category — untouched by the securities loss.
    const interest = result.byCategory.find((c) => c.incomeCategory === 'bank_interest')!;
    expect(interest.netTaxBase).toEqual(eur(200));
    expect(result.totalNetTaxBase).toEqual(eur(800));
  });
});

describe('suitability engine', () => {
  it('is suitable when all hard dimensions fit', () => {
    const result = evaluateSuitability(makeProfile(), NON_COMPLEX_EQUITY, AT);
    expect(result.status).toBe('suitable');
    expect(result.confidence).toBeNull(); // no fabricated score
  });

  it('is not_suitable when loss capacity is below the instrument requirement', () => {
    const result = evaluateSuitability(
      makeProfile({ lossBearingCapacity: 'none', riskTolerance: 'very_high' }),
      COMPLEX_LEVERAGED_ETP,
      AT,
    );
    expect(result.status).toBe('not_suitable');
  });

  it('is conditionally_suitable when the only non-fit is instrument complexity', () => {
    // A merely-complex structured product whose risk/capacity/knowledge all fit
    // the default profile — the complexity dimension is the lone `partial`.
    const complexStructured = {
      ...COMPLEX_LEVERAGED_ETP,
      complexity: 'complex' as const,
      assetClass: 'structured_product' as const,
      isDerivative: false,
      leverage: null,
    };
    const result = evaluateSuitability(makeProfile(), complexStructured, AT);
    expect(result.status).toBe('conditionally_suitable');
  });

  it('is insufficient_information when a hard dimension is missing', () => {
    const result = evaluateSuitability(makeProfile({ riskTolerance: null }), NON_COMPLEX_EQUITY, AT);
    expect(result.status).toBe('insufficient_information');
    expect(result.missingInformation).toContain('riskTolerance');
  });

  it('does not conclude suitable when objective or horizon is unknown', () => {
    const result = evaluateSuitability(
      makeProfile({ objective: null, horizon: null }),
      NON_COMPLEX_EQUITY,
      AT,
    );
    expect(result.status).toBe('insufficient_information');
    expect(result.missingInformation).toEqual(expect.arrayContaining(['objective', 'horizon']));
  });

  it('scores a derivative-class instrument as high risk (not cash-equivalent)', () => {
    // Regression: assetClass 'derivative' with isDerivative:false previously fell
    // through instrumentRiskBand to band 0 and was scored as suitable for low risk.
    const derivativeInstrument = {
      ...NON_COMPLEX_EQUITY,
      assetClass: 'derivative' as const,
      isDerivative: false,
      leverage: null,
    };
    const result = evaluateSuitability(
      makeProfile({ riskTolerance: 'low' }),
      derivativeInstrument,
      AT,
    );
    expect(result.status).toBe('not_suitable');
    expect(result.dimensions.find((d) => d.dimension === 'risk')!.verdict).toBe('mismatch');
  });

  it('models risk tolerance and loss capacity independently', () => {
    // High willingness, zero ability → must not be suitable for a risky product.
    const result = evaluateSuitability(
      makeProfile({ riskTolerance: 'very_high', lossBearingCapacity: 'none' }),
      COMPLEX_LEVERAGED_ETP,
      AT,
    );
    expect(result.status).toBe('not_suitable');
  });
});

describe('appropriateness engine', () => {
  it('is not_required for a non-complex instrument', () => {
    const result = evaluateAppropriateness(makeProfile(), NON_COMPLEX_EQUITY, AT);
    expect(result.status).toBe('not_required');
  });

  it('is appropriate for a complex instrument with sufficient knowledge/experience', () => {
    const result = evaluateAppropriateness(makeProfile(), COMPLEX_LEVERAGED_ETP, AT);
    expect(result.status).toBe('appropriate');
  });

  it('is not_appropriate when knowledge/experience is too low', () => {
    const result = evaluateAppropriateness(
      makeProfile({ knowledge: 'basic', experience: 'none' }),
      COMPLEX_LEVERAGED_ETP,
      AT,
    );
    expect(result.status).toBe('not_appropriate');
  });

  it('is insufficient_information when knowledge/experience is missing', () => {
    const result = evaluateAppropriateness(
      makeProfile({ knowledge: null, experience: null }),
      COMPLEX_LEVERAGED_ETP,
      AT,
    );
    expect(result.status).toBe('insufficient_information');
    expect(result.missingInformation).toEqual(['knowledge', 'experience']);
  });

  it('shares the knowledge threshold with the suitability engine (no divergence)', () => {
    const atThreshold = makeProfile({ knowledge: 'advanced', experience: 'moderate' });
    const belowThreshold = makeProfile({ knowledge: 'informed', experience: 'moderate' });
    expect(evaluateAppropriateness(atThreshold, COMPLEX_LEVERAGED_ETP, AT).status).toBe('appropriate');
    expect(evaluateAppropriateness(belowThreshold, COMPLEX_LEVERAGED_ETP, AT).status).toBe('not_appropriate');
    // Suitability reads the same required index → 'informed' is a knowledge mismatch.
    const suit = evaluateSuitability(belowThreshold, COMPLEX_LEVERAGED_ETP, AT);
    expect(suit.dimensions.find((d) => d.dimension === 'knowledge')!.verdict).toBe('mismatch');
  });
});

describe('cost aggregation', () => {
  it('aggregates explicit + implicit costs and computes the gross → net chain', () => {
    const components: CostComponent[] = [
      { category: 'broker_commission', amount: eur(10), explicit: true, recurring: false, productLevel: false, estimated: false, exAnte: false, label: null },
      { category: 'spread', amount: eur(5), explicit: false, recurring: false, productLevel: false, estimated: true, exAnte: true, label: null },
      { category: 'product_management_fee', amount: eur(20), explicit: true, recurring: true, productLevel: true, estimated: true, exAnte: true, label: null },
    ];
    const breakdown = aggregateCosts(components, 'EUR', 2, { grossReturn: eur(1000), tax: eur(275) });
    expect(breakdown.totalExplicit).toEqual(eur(30));
    expect(breakdown.totalImplicit).toEqual(eur(5));
    expect(breakdown.totalRecurring).toEqual(eur(20));
    expect(breakdown.totalServiceCost).toEqual(eur(15));
    expect(breakdown.totalProductCost).toEqual(eur(20));
    expect(breakdown.totalCost).toEqual(eur(35));
    expect(breakdown.netBeforeTaxReturn).toEqual(eur(965));
    expect(breakdown.netAfterTaxReturn).toEqual(eur(690)); // 965 − 275
  });
});
