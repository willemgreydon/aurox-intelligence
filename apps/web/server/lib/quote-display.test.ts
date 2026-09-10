import { describe, expect, it } from 'vitest';
import { formatUsdPrice, toFiniteNumber, formatPercentChange } from './quote-display';

describe('toFiniteNumber', () => {
  it('passes through finite numbers, including a genuine 0', () => {
    expect(toFiniteNumber(0)).toBe(0);
    expect(toFiniteNumber(1234.56)).toBe(1234.56);
    expect(toFiniteNumber(-42)).toBe(-42);
  });

  it('rejects non-finite and non-number inputs as null (never coerced to 0)', () => {
    expect(toFiniteNumber(Number.NaN)).toBeNull();
    expect(toFiniteNumber(Number.POSITIVE_INFINITY)).toBeNull();
    expect(toFiniteNumber(null)).toBeNull();
    expect(toFiniteNumber(undefined)).toBeNull();
  });
});

describe('formatUsdPrice', () => {
  it('renders a missing/invalid value as the unavailable label — never $0.00', () => {
    // The crux of the reported bug: an unknown value must NOT look like a real zero.
    expect(formatUsdPrice(null, 'en', '-')).toBe('-');
    expect(formatUsdPrice(undefined, 'en', '-')).toBe('-');
    expect(formatUsdPrice(Number.NaN, 'en', '-')).toBe('-');
    expect(formatUsdPrice(null, 'de', '-')).toBe('-');
  });

  it('renders a genuine zero as currency in the active locale', () => {
    expect(formatUsdPrice(0, 'en', '-')).toBe('$0.00');
    // German locale renders zero as "0,00 $" — the exact string users reported.
    expect(formatUsdPrice(0, 'de', '-')).toBe('0,00 $');
  });

  it('formats real values per locale', () => {
    expect(formatUsdPrice(1234.5, 'en', '-')).toBe('$1,234.50');
    expect(formatUsdPrice(1234.5, 'de', '-')).toBe('1.234,50 $');
  });
});

describe('formatPercentChange', () => {
  it('returns the partial label for missing values rather than 0%', () => {
    expect(formatPercentChange(null, 'Partial')).toBe('Partial');
    expect(formatPercentChange(Number.NaN, 'Partial')).toBe('Partial');
  });

  it('formats a genuine zero and signed values', () => {
    expect(formatPercentChange(0)).toBe('0.00%');
    expect(formatPercentChange(2.5)).toBe('+2.50%');
    expect(formatPercentChange(-1.25)).toBe('-1.25%');
  });
});
