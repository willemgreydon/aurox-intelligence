import { describe, expect, it } from 'vitest';
import { simulateFill } from '../simulation/fill-engine';

describe('simulateFill', () => {
  it('returns exact market price when slippageBps is 0', () => {
    expect(simulateFill(100, 'buy', 0)).toBe(100);
    expect(simulateFill(100, 'sell', 0)).toBe(100);
  });

  it('returns exact market price when slippageBps is omitted', () => {
    expect(simulateFill(150, 'buy')).toBe(150);
    expect(simulateFill(150, 'sell')).toBe(150);
  });

  it('buy fills at a higher price than market (adverse slippage)', () => {
    const price = simulateFill(100, 'buy', 10);
    expect(price).toBeGreaterThan(100);
  });

  it('sell fills at a lower price than market (adverse slippage)', () => {
    const price = simulateFill(100, 'sell', 10);
    expect(price).toBeLessThan(100);
  });

  it('buy applies slippage correctly: 10 bps on $100 = $100.10', () => {
    // 10 bps = 0.10% => $100 * 1.001 = $100.10
    expect(simulateFill(100, 'buy', 10)).toBeCloseTo(100.1, 5);
  });

  it('sell applies slippage correctly: 10 bps on $100 = $99.90', () => {
    // 10 bps = 0.10% => $100 * (1 - 0.001) = $99.90
    expect(simulateFill(100, 'sell', 10)).toBeCloseTo(99.9, 5);
  });

  it('is deterministic — same inputs always produce the same output', () => {
    for (let i = 0; i < 20; i++) {
      expect(simulateFill(200, 'buy', 15)).toBe(simulateFill(200, 'buy', 15));
      expect(simulateFill(200, 'sell', 15)).toBe(simulateFill(200, 'sell', 15));
    }
  });

  it('buy and sell are symmetric around market price for the same bps', () => {
    const buyPrice = simulateFill(100, 'buy', 20);
    const sellPrice = simulateFill(100, 'sell', 20);
    const buySpread = buyPrice - 100;
    const sellSpread = 100 - sellPrice;
    expect(buySpread).toBeCloseTo(sellSpread, 5);
  });

  it('larger slippageBps produces a larger price spread', () => {
    const low = simulateFill(100, 'buy', 5);
    const high = simulateFill(100, 'buy', 50);
    expect(high).toBeGreaterThan(low);
  });

  it('throws when marketPrice is zero', () => {
    expect(() => simulateFill(0, 'buy', 10)).toThrow('marketPrice must be a positive finite number.');
  });

  it('throws when marketPrice is negative', () => {
    expect(() => simulateFill(-50, 'buy', 10)).toThrow('marketPrice must be a positive finite number.');
  });

  it('throws when marketPrice is NaN', () => {
    expect(() => simulateFill(NaN, 'buy', 10)).toThrow('marketPrice must be a positive finite number.');
  });

  it('throws when slippageBps is negative', () => {
    expect(() => simulateFill(100, 'buy', -1)).toThrow('slippageBps must be a non-negative finite number.');
  });

  it('handles fractional slippageBps without throwing', () => {
    const price = simulateFill(100, 'buy', 2.5);
    expect(price).toBeGreaterThan(100);
  });

  it('handles high-precision market prices', () => {
    const price = simulateFill(0.00001523, 'buy', 10);
    expect(price).toBeGreaterThan(0.00001523);
    expect(Number.isFinite(price)).toBe(true);
  });
});
