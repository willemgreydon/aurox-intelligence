import { describe, expect, it } from 'vitest';
import { buildPortfolioTaxView } from '../portfolio/portfolio-tax-view';
import { eur } from './fixtures';

const AS_OF = '2026-02-01';

describe('buildPortfolioTaxView', () => {
  it('reserves 27.5% of realised gains and never taxes unrealised P&L (AT)', () => {
    const view = buildPortfolioTaxView({
      currency: 'EUR',
      portfolioValue: 10_000,
      unrealizedPnl: 800, // must NOT be taxed
      realizedPnl: 1_000,
      taxResidency: 'AT',
      asOfIso: AS_OF,
    });
    expect(view.status).toBe('calculated');
    expect(view.realizedPnl).toEqual(eur(1000));
    expect(view.unrealizedPnl).toEqual(eur(800));
    expect(view.estimatedTaxLiability).toEqual(eur(275));
    expect(view.taxReserve).toEqual(eur(275));
    // After-tax wealth = portfolio value − reserve (unrealised gain untouched).
    expect(view.estimatedAfterTaxWealth).toEqual(eur(9_725));
  });

  it('produces no reserve when realised P&L is a loss', () => {
    const view = buildPortfolioTaxView({
      currency: 'EUR',
      portfolioValue: 8_000,
      unrealizedPnl: 0,
      realizedPnl: -500,
      taxResidency: 'AT',
      asOfIso: AS_OF,
    });
    expect(view.estimatedTaxLiability).toEqual(eur(0));
    expect(view.taxReserve).toEqual(eur(0));
    expect(view.estimatedAfterTaxWealth).toEqual(eur(8_000));
  });

  it('degrades to requires_review for a non-AT tax residency (no guessed rate)', () => {
    const view = buildPortfolioTaxView({
      currency: 'USD',
      portfolioValue: 5_000,
      unrealizedPnl: 0,
      realizedPnl: 1_000,
      taxResidency: 'US',
      asOfIso: AS_OF,
    });
    expect(view.status).toBe('requires_review');
    expect(view.estimatedTaxLiability.minorUnits).toBe(0);
    expect(view.currency).toBe('USD');
  });

  it('converts decimal majors to exact minor units (no float drift)', () => {
    const view = buildPortfolioTaxView({
      currency: 'EUR',
      portfolioValue: 1_234.56,
      unrealizedPnl: 0,
      realizedPnl: 100.1, // 27.5% = 27.5275 → €27.53
      taxResidency: 'AT',
      asOfIso: AS_OF,
    });
    expect(view.grossPortfolioValue.minorUnits).toBe(123_456);
    expect(view.estimatedTaxLiability.minorUnits).toBe(2_753); // round(10010 * 0.275)
  });
});
