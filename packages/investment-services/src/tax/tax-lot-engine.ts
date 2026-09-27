import type { Money, TaxLot } from '@repo/api-contracts';
import { addMoney, makeMoney, mulMoneyByWholeQuantity, subMoney, zeroMoney } from '../money/money';

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

    const priceBasis = mulMoneyByWholeQuantity(lot.acquisitionUnitPrice, take);
    const costsBasis = proRataCosts(lot.acquisitionCosts, take, lot.acquisitionQuantity);
    const costBasis = addMoney(priceBasis, costsBasis);
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
 * Pro-rata share of a lot's acquisition costs for `take` of `acquisitionQuantity`
 * units. The allocation is `round(costs * take / qty)` computed in BigInt with
 * half-up rounding — NOT floor-per-unit-then-multiply, which silently dropped
 * remainder cents (understating cost basis and overstating the taxable gain).
 * Full-lot consumption (`take === qty`) is exact.
 */
function proRataCosts(acquisitionCosts: Money, take: number, acquisitionQuantity: number): Money {
  const qty = Math.floor(acquisitionQuantity);
  if (qty <= 0) {
    return zeroMoney(acquisitionCosts.currency, acquisitionCosts.scale);
  }
  const sign = acquisitionCosts.minorUnits < 0 ? -1 : 1;
  const raw = BigInt(Math.abs(acquisitionCosts.minorUnits)) * BigInt(take);
  const denom = BigInt(qty);
  const quotient = raw / denom;
  const remainder = raw % denom;
  const roundedAbs = remainder * 2n >= denom ? quotient + 1n : quotient;
  return makeMoney(Number(roundedAbs) * sign, acquisitionCosts.currency, acquisitionCosts.scale);
}
