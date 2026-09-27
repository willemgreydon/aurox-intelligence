import { describe, expect, it } from 'vitest';
import {
  addMoney,
  applyRatePpm,
  clampNonNegative,
  compareMoney,
  fromMajorUnits,
  makeMoney,
  mulMoneyByWholeQuantity,
  subMoney,
  toDecimalString,
  zeroMoney,
} from '../money/money';

describe('money primitives', () => {
  it('rejects non-integer minor units', () => {
    expect(() => makeMoney(10.5, 'EUR')).toThrow(/integer/);
  });

  it('builds from whole major units at the currency scale', () => {
    expect(fromMajorUnits(1000, 'EUR')).toEqual({ minorUnits: 100_000, currency: 'EUR', scale: 2 });
    expect(fromMajorUnits(1000, 'JPY')).toEqual({ minorUnits: 1000, currency: 'JPY', scale: 0 });
  });

  it('adds and subtracts within the same currency/scale', () => {
    expect(addMoney(fromMajorUnits(100, 'EUR'), fromMajorUnits(25, 'EUR')).minorUnits).toBe(12_500);
    expect(subMoney(fromMajorUnits(100, 'EUR'), fromMajorUnits(25, 'EUR')).minorUnits).toBe(7_500);
  });

  it('refuses cross-currency arithmetic', () => {
    expect(() => addMoney(fromMajorUnits(1, 'EUR'), fromMajorUnits(1, 'USD'))).toThrow(/Currency mismatch/);
  });

  it('applies an integer ppm rate with half-up rounding, exactly', () => {
    // 27.5% of €1,000.00 == €275.00
    expect(applyRatePpm(fromMajorUnits(1000, 'EUR'), 275_000).minorUnits).toBe(27_500);
    // 27.5% of €10.01 == 275.275 cents → 275 (half-up on the 0.275 part rounds the .5 of the cent? 2752.75 → 2753)
    expect(applyRatePpm(makeMoney(1001, 'EUR'), 275_000).minorUnits).toBe(275);
  });

  it('half-up rounds a value exactly on the boundary away from zero', () => {
    // base 2 cents * 250_000 ppm = 0.5 cent → rounds up to 1
    expect(applyRatePpm(makeMoney(2, 'EUR'), 250_000).minorUnits).toBe(1);
    // negative base rounds by magnitude
    expect(applyRatePpm(makeMoney(-2, 'EUR'), 250_000).minorUnits).toBe(-1);
  });

  it('stays exact for large amounts (no float error)', () => {
    // €90,000,000.00 → 27.5% == €24,750,000.00
    const big = fromMajorUnits(90_000_000, 'EUR');
    expect(applyRatePpm(big, 275_000).minorUnits).toBe(2_475_000_000);
  });

  it('clamps to non-negative and compares', () => {
    expect(clampNonNegative(makeMoney(-5, 'EUR')).minorUnits).toBe(0);
    expect(compareMoney(fromMajorUnits(1, 'EUR'), fromMajorUnits(2, 'EUR'))).toBe(-1);
  });

  it('multiplies by whole quantity exactly and rejects fractions', () => {
    expect(mulMoneyByWholeQuantity(makeMoney(1500, 'EUR'), 3).minorUnits).toBe(4_500);
    expect(() => mulMoneyByWholeQuantity(makeMoney(1500, 'EUR'), 2.5)).toThrow(/integer quantity/);
  });

  it('renders a deterministic, locale-free decimal string', () => {
    expect(toDecimalString(makeMoney(100_000, 'EUR'))).toBe('1000.00');
    expect(toDecimalString(makeMoney(-27_500, 'EUR'))).toBe('-275.00');
    expect(toDecimalString(makeMoney(5, 'EUR'))).toBe('0.05');
    expect(toDecimalString(zeroMoney('JPY'))).toBe('0');
  });
});
