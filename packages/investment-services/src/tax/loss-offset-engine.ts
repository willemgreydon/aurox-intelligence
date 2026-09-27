import type { Money, MoneyCurrency, TaxEvent, TaxIncomeCategory } from '@repo/api-contracts';
import { addMoney, clampNonNegative, minMoney, negateMoney, subMoney, zeroMoney } from '../money/money';

export interface CategoryOffset {
  incomeCategory: TaxIncomeCategory;
  grossGains: Money;
  grossLosses: Money; // positive magnitude
  offsetApplied: Money;
  netTaxBase: Money;
  carryforwardLoss: Money;
}

export interface LossOffsetResult {
  currency: MoneyCurrency;
  byCategory: CategoryOffset[];
  totalNetTaxBase: Money;
  totalCarryforwardLoss: Money;
}

/**
 * Offset realised losses against realised gains WITHIN each compatible income
 * category. Losses in one category do not blindly reduce gains in an
 * incompatible category — that grouping is jurisdiction policy, modelled here by
 * the event's `incomeCategory`. Positive amounts are gains/dividends; negative
 * amounts are losses.
 */
export function computeLossOffset(events: TaxEvent[]): LossOffsetResult {
  if (events.length === 0) {
    return {
      currency: 'EUR',
      byCategory: [],
      totalNetTaxBase: zeroMoney('EUR'),
      totalCarryforwardLoss: zeroMoney('EUR'),
    };
  }

  const currency = events[0]!.amount.currency;
  const scale = events[0]!.amount.scale;
  const zero = zeroMoney(currency, scale);

  const groups = new Map<TaxIncomeCategory, TaxEvent[]>();
  for (const event of events) {
    if (event.amount.currency !== currency || event.amount.scale !== scale) {
      throw new Error('computeLossOffset requires all events to share currency and scale.');
    }
    const bucket = groups.get(event.incomeCategory) ?? [];
    bucket.push(event);
    groups.set(event.incomeCategory, bucket);
  }

  const byCategory: CategoryOffset[] = [];
  let totalNetTaxBase = zero;
  let totalCarryforwardLoss = zero;

  for (const [incomeCategory, bucket] of groups) {
    let grossGains = zero;
    let grossLosses = zero; // positive magnitude
    for (const event of bucket) {
      if (event.amount.minorUnits >= 0) {
        grossGains = addMoney(grossGains, event.amount);
      } else {
        grossLosses = addMoney(grossLosses, negateMoney(event.amount));
      }
    }

    const offsetApplied = minMoney(grossGains, grossLosses);
    const netTaxBase = clampNonNegative(subMoney(grossGains, offsetApplied));
    const carryforwardLoss = clampNonNegative(subMoney(grossLosses, offsetApplied));

    byCategory.push({ incomeCategory, grossGains, grossLosses, offsetApplied, netTaxBase, carryforwardLoss });
    totalNetTaxBase = addMoney(totalNetTaxBase, netTaxBase);
    totalCarryforwardLoss = addMoney(totalCarryforwardLoss, carryforwardLoss);
  }

  return { currency, byCategory, totalNetTaxBase, totalCarryforwardLoss };
}
