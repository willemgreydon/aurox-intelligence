import type { CostBreakdown, CostComponent, Money, MoneyCurrency } from '@repo/api-contracts';
import { addMoney, subMoney, zeroMoney } from '../money/money';

export interface AggregateCostOptions {
  grossReturn?: Money | null;
  tax?: Money | null;
}

/**
 * Aggregate cost components into a canonical `CostBreakdown`, keeping the four
 * disclosure axes (explicit/implicit, one-off/recurring, service/product,
 * ex-ante/ex-post) and the gross → net-before-tax → net-after-tax chain
 * separate. Tax is never folded into service/product cost.
 */
export function aggregateCosts(
  components: CostComponent[],
  currency: MoneyCurrency,
  scale: number,
  options: AggregateCostOptions = {},
): CostBreakdown {
  const zero = zeroMoney(currency, scale);

  let totalExplicit = zero;
  let totalImplicit = zero;
  let totalOneOff = zero;
  let totalRecurring = zero;
  let totalServiceCost = zero;
  let totalProductCost = zero;
  let totalCost = zero;

  for (const component of components) {
    if (component.amount.currency !== currency || component.amount.scale !== scale) {
      throw new Error('aggregateCosts requires all components to share currency and scale.');
    }
    totalCost = addMoney(totalCost, component.amount);
    if (component.explicit) totalExplicit = addMoney(totalExplicit, component.amount);
    else totalImplicit = addMoney(totalImplicit, component.amount);
    if (component.recurring) totalRecurring = addMoney(totalRecurring, component.amount);
    else totalOneOff = addMoney(totalOneOff, component.amount);
    if (component.productLevel) totalProductCost = addMoney(totalProductCost, component.amount);
    else totalServiceCost = addMoney(totalServiceCost, component.amount);
  }

  const grossReturn = options.grossReturn ?? null;
  const netBeforeTaxReturn = grossReturn ? subMoney(grossReturn, totalCost) : null;
  const netAfterTaxReturn = netBeforeTaxReturn && options.tax
    ? subMoney(netBeforeTaxReturn, options.tax)
    : netBeforeTaxReturn;

  return {
    currency,
    components,
    totalExplicit,
    totalImplicit,
    totalOneOff,
    totalRecurring,
    totalServiceCost,
    totalProductCost,
    totalCost,
    grossReturn,
    costImpact: totalCost,
    netBeforeTaxReturn,
    netAfterTaxReturn,
  };
}
