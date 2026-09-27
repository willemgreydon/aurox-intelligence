import type { Money, TaxLot } from '@repo/api-contracts';
import { addMoney, mulMoneyByWholeQuantity, subMoney, zeroMoney } from '../money/money';

export type LotMatchMethod = 'fifo';

export interface MatchedLotSlice {
  lotId: string;
  quantity: number;
  costBasis: Money;
  proceeds: Money;
  realizedGain: Money;
}

export interface DisposalMatchResult {
  method: LotMatchMethod;
  matched: MatchedLotSlice[];
  totalCostBasis: Money;
  totalProceeds: Money;
  totalRealizedGain: Money;
  unmatchedQuantity: number;
}

/**
 * Match a disposal against acquisition lots to produce a deterministic realised
 * gain. Matching METHOD is policy-driven (FIFO implemented); it is never a
 * hardcoded global assumption.
 *
 * Quantities are whole units — fractional-share cost-basis precision is a later
 * pass, and passing a fractional quantity throws rather than silently rounding.
 */
export function matchDisposal(
  lots: TaxLot[],
  disposalQuantity: number,
  disposalUnitPrice: Money,
  method: LotMatchMethod = 'fifo',
): DisposalMatchResult {
  if (!Number.isInteger(disposalQuantity) || disposalQuantity < 0) {
    throw new Error(`disposalQuantity must be a non-negative integer, got ${disposalQuantity}`);
  }

  const ordered = [...lots].sort((a, b) => (a.acquisitionDate < b.acquisitionDate ? -1 : 1));
  const currency = disposalUnitPrice.currency;
  const scale = disposalUnitPrice.scale;

  let remaining = disposalQuantity;
  const matched: MatchedLotSlice[] = [];
  let totalCostBasis = zeroMoney(currency, scale);
  let totalProceeds = zeroMoney(currency, scale);
  let totalRealizedGain = zeroMoney(currency, scale);

  for (const lot of ordered) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, Math.floor(lot.remainingQuantity));
    if (take <= 0) continue;

    const unitCost = addMoney(
      lot.acquisitionUnitPrice,
      perUnitCosts(lot.acquisitionCosts, lot.acquisitionQuantity),
    );
    const costBasis = mulMoneyByWholeQuantity(unitCost, take);
    const proceeds = mulMoneyByWholeQuantity(disposalUnitPrice, take);
    const realizedGain = subMoney(proceeds, costBasis);

    matched.push({ lotId: lot.lotId, quantity: take, costBasis, proceeds, realizedGain });
    totalCostBasis = addMoney(totalCostBasis, costBasis);
    totalProceeds = addMoney(totalProceeds, proceeds);
    totalRealizedGain = addMoney(totalRealizedGain, realizedGain);
    remaining -= take;
  }

  return {
    method,
    matched,
    totalCostBasis,
    totalProceeds,
    totalRealizedGain,
    unmatchedQuantity: remaining,
  };
}

/**
 * Pro-rata acquisition cost per unit, rounded down to the minor unit (integer
 * division) so the total never over-allocates cost.
 */
function perUnitCosts(acquisitionCosts: Money, acquisitionQuantity: number): Money {
  const qty = Math.floor(acquisitionQuantity);
  if (qty <= 0) {
    return zeroMoney(acquisitionCosts.currency, acquisitionCosts.scale);
  }
  const perUnitMinor = Math.floor(acquisitionCosts.minorUnits / qty);
  return { minorUnits: perUnitMinor, currency: acquisitionCosts.currency, scale: acquisitionCosts.scale };
}
