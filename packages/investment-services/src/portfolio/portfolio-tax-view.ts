import type { MoneyCurrency, PortfolioTaxView, TaxJurisdiction } from '@repo/api-contracts';
import { clampNonNegative, makeMoney, scaleFor, subMoney } from '../money/money';
import { AUSTRIAN_TAX_POLICY } from '../tax/austrian-tax-policy';
import { computeTaxReserve } from '../tax/tax-reserve-engine';

/**
 * Inputs for a portfolio-wide tax view. Amounts arrive as decimal majors (the
 * simulation ledger's float figures) and are converted to decimal-safe integer
 * minor units at this single boundary — the simulation's own accounting is never
 * mutated. `realizedPnl` is the only taxable figure; `unrealizedPnl` is passed as
 * context and is NEVER taxed.
 */
export interface PortfolioTaxViewInput {
  currency: MoneyCurrency;
  portfolioValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  taxResidency: string | null;
  asOfIso: string;
}

function toMinor(value: number, scale: number): number {
  return Math.round(value * 10 ** scale);
}

/**
 * Build a portfolio-wide tax view. Distinguishes economic value, unrealised vs
 * realised P&L, the estimated liability, tax already withheld, the recommended
 * reserve and the estimated after-tax wealth — so the UI can never present the
 * paper gain as spendable, tax-settled money.
 *
 * The realised gain is treated as a securities capital gain at portfolio level
 * (a documented P1 approximation; per-lot, per-asset-class precision is a later
 * pass). A non-AT tax residency degrades to `requires_review`, never a guess.
 */
export function buildPortfolioTaxView(input: PortfolioTaxViewInput): PortfolioTaxView {
  const scale = scaleFor(input.currency);
  const money = (value: number) => makeMoney(toMinor(value, scale), input.currency, scale);
  const jurisdiction: TaxJurisdiction = input.taxResidency === 'AT' ? 'AT' : 'OTHER';

  const grossPortfolioValue = money(input.portfolioValue);
  const unrealizedPnl = money(input.unrealizedPnl);
  const realizedPnl = money(input.realizedPnl);

  const reserve = computeTaxReserve(
    {
      jurisdiction,
      taxAssetClass: 'securities_capital_gain',
      realizationDate: input.asOfIso,
      grossRealizedGain: realizedPnl,
      offsettableLosses: null,
      domesticTaxWithheld: null,
      foreignWithholdingTax: null,
      creditableForeignWithholding: null,
      unrealizedGain: unrealizedPnl,
    },
    AUSTRIAN_TAX_POLICY,
    input.asOfIso,
  );

  const estimatedAfterTaxWealth = clampNonNegative(
    subMoney(grossPortfolioValue, reserve.recommendedReserve),
  );

  return {
    currency: input.currency,
    grossPortfolioValue,
    unrealizedPnl,
    realizedPnl,
    estimatedTaxLiability: reserve.estimatedTax,
    taxAlreadyWithheld: reserve.taxAlreadyWithheld,
    taxReserve: reserve.recommendedReserve,
    estimatedAfterTaxWealth,
    status: reserve.status,
    computedAt: input.asOfIso,
  };
}
