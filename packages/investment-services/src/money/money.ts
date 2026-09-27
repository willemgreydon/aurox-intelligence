import type { Money, MoneyCurrency } from '@repo/api-contracts';

/**
 * Decimal-safe money arithmetic.
 *
 * Every authoritative amount is an integer count of a currency's minor unit.
 * There is exactly ONE place binary floating point could sneak in — applying a
 * fractional rate — and that path uses BigInt, not `number` multiplication. If
 * a value would leave the JS safe-integer range we throw rather than silently
 * lose precision.
 */

const DEFAULT_SCALE: Record<MoneyCurrency, number> = {
  EUR: 2,
  USD: 2,
  GBP: 2,
  CHF: 2,
  JPY: 0,
};

export type Rounding = 'half_up' | 'half_even' | 'floor';

export function scaleFor(currency: MoneyCurrency): number {
  return DEFAULT_SCALE[currency];
}

export function makeMoney(
  minorUnits: number,
  currency: MoneyCurrency,
  scale: number = scaleFor(currency),
): Money {
  if (!Number.isInteger(minorUnits)) {
    throw new Error(`Money.minorUnits must be an integer, got ${minorUnits}`);
  }
  if (!Number.isSafeInteger(minorUnits)) {
    throw new Error(`Money.minorUnits ${minorUnits} exceeds the safe integer range`);
  }
  return { minorUnits, currency, scale };
}

/** Build money from whole major units (e.g. euros). Rejects fractional input. */
export function fromMajorUnits(
  wholeUnits: number,
  currency: MoneyCurrency,
  scale: number = scaleFor(currency),
): Money {
  if (!Number.isInteger(wholeUnits)) {
    throw new Error(`fromMajorUnits expects whole units, got ${wholeUnits}`);
  }
  return makeMoney(wholeUnits * 10 ** scale, currency, scale);
}

export function zeroMoney(currency: MoneyCurrency, scale: number = scaleFor(currency)): Money {
  return makeMoney(0, currency, scale);
}

function assertSameShape(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
  if (a.scale !== b.scale) {
    throw new Error(`Scale mismatch for ${a.currency}: ${a.scale} vs ${b.scale}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameShape(a, b);
  return makeMoney(a.minorUnits + b.minorUnits, a.currency, a.scale);
}

export function subMoney(a: Money, b: Money): Money {
  assertSameShape(a, b);
  return makeMoney(a.minorUnits - b.minorUnits, a.currency, a.scale);
}

export function negateMoney(a: Money): Money {
  return makeMoney(-a.minorUnits, a.currency, a.scale);
}

/** Compare by minor units; requires matching currency/scale. */
export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  assertSameShape(a, b);
  if (a.minorUnits < b.minorUnits) return -1;
  if (a.minorUnits > b.minorUnits) return 1;
  return 0;
}

export function maxMoney(a: Money, b: Money): Money {
  return compareMoney(a, b) >= 0 ? a : b;
}

export function minMoney(a: Money, b: Money): Money {
  return compareMoney(a, b) <= 0 ? a : b;
}

export function isZeroMoney(a: Money): boolean {
  return a.minorUnits === 0;
}

export function isNegativeMoney(a: Money): boolean {
  return a.minorUnits < 0;
}

/** Clamp to >= 0 while preserving currency/scale. */
export function clampNonNegative(a: Money): Money {
  return a.minorUnits < 0 ? zeroMoney(a.currency, a.scale) : a;
}

/**
 * Multiply money by a whole quantity (exact integer math). Fractional
 * quantities are rejected here on purpose — fractional-share cost-basis
 * precision is a later pass; this keeps lot matching authoritative.
 */
export function mulMoneyByWholeQuantity(a: Money, quantity: number): Money {
  if (!Number.isInteger(quantity)) {
    throw new Error(`mulMoneyByWholeQuantity expects an integer quantity, got ${quantity}`);
  }
  return makeMoney(a.minorUnits * quantity, a.currency, a.scale);
}

/**
 * Apply a rate expressed in integer parts-per-million. The multiplication is
 * performed in BigInt so it is exact regardless of magnitude; rounding is then
 * applied deterministically to the minor unit. Sign is handled by rounding the
 * magnitude, so `half_up` means "away from zero at the halfway point".
 */
export function applyRatePpm(base: Money, ratePpm: number, rounding: Rounding = 'half_up'): Money {
  if (!Number.isInteger(ratePpm) || ratePpm < 0) {
    throw new Error(`ratePpm must be a non-negative integer, got ${ratePpm}`);
  }
  const sign = base.minorUnits < 0 ? -1 : 1;
  const absMinor = BigInt(Math.abs(base.minorUnits));
  const denom = 1_000_000n;
  const raw = absMinor * BigInt(ratePpm);
  const quotient = raw / denom;
  const remainder = raw % denom;

  let roundedAbs: bigint;
  if (rounding === 'floor') {
    roundedAbs = quotient;
  } else if (rounding === 'half_even') {
    const doubled = remainder * 2n;
    if (doubled > denom) {
      roundedAbs = quotient + 1n;
    } else if (doubled < denom) {
      roundedAbs = quotient;
    } else {
      roundedAbs = quotient % 2n === 0n ? quotient : quotient + 1n;
    }
  } else {
    // half_up (away from zero)
    roundedAbs = remainder * 2n >= denom ? quotient + 1n : quotient;
  }

  const signed = roundedAbs * BigInt(sign);
  if (signed > BigInt(Number.MAX_SAFE_INTEGER) || signed < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error('applyRatePpm result exceeds the safe integer range');
  }
  return makeMoney(Number(signed), base.currency, base.scale);
}

/**
 * Deterministic, locale-free decimal string for provenance/debugging. Display
 * formatting (locale, symbols, grouping) belongs in a mapper, not here.
 */
export function toDecimalString(a: Money): string {
  const sign = a.minorUnits < 0 ? '-' : '';
  const absStr = Math.abs(a.minorUnits).toString().padStart(a.scale + 1, '0');
  if (a.scale === 0) {
    return `${sign}${absStr}`;
  }
  const intPart = absStr.slice(0, absStr.length - a.scale);
  const fracPart = absStr.slice(absStr.length - a.scale);
  return `${sign}${intPart}.${fracPart}`;
}
