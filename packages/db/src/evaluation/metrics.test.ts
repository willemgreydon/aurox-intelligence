import { describe, expect, it } from 'vitest';
import { brierScore, directionCorrect, excursions, forwardReturn, realizedDirection } from './metrics';

describe('forwardReturn', () => {
  it('computes simple return', () => {
    expect(forwardReturn(100, 110)).toBeCloseTo(0.1, 10);
    expect(forwardReturn(100, 90)).toBeCloseTo(-0.1, 10);
  });
  it('is safe on zero/invalid entry', () => {
    expect(forwardReturn(0, 100)).toBe(0);
    expect(forwardReturn(Number.NaN, 100)).toBe(0);
  });
});

describe('realizedDirection', () => {
  it('classifies with the default deadband', () => {
    expect(realizedDirection(0.02)).toBe('bullish');
    expect(realizedDirection(-0.02)).toBe('bearish');
    expect(realizedDirection(0.0001)).toBe('neutral');
    expect(realizedDirection(0)).toBe('neutral');
  });
  it('respects a custom deadband at the boundary', () => {
    expect(realizedDirection(0.01, 0.01)).toBe('neutral'); // strictly greater required
    expect(realizedDirection(0.0101, 0.01)).toBe('bullish');
  });
});

describe('excursions', () => {
  it('computes MFE/MAE relative to entry', () => {
    const { mfe, mae } = excursions(100, [102, 98, 105, 97]);
    expect(mfe).toBeCloseTo(0.05, 10);
    expect(mae).toBeCloseTo(-0.03, 10);
  });
  it('returns nulls on empty window', () => {
    expect(excursions(100, [])).toEqual({ mfe: null, mae: null });
  });
});

describe('directionCorrect', () => {
  it('matches exact direction including neutral', () => {
    expect(directionCorrect('bullish', 'bullish')).toBe(true);
    expect(directionCorrect('bullish', 'bearish')).toBe(false);
    expect(directionCorrect('neutral', 'neutral')).toBe(true);
  });
});

describe('brierScore', () => {
  it('is 0 for a perfect confident forecast', () => {
    expect(brierScore({ bullish: 1, base: 0, bearish: 0 }, 'bullish')).toBeCloseTo(0, 10);
  });
  it('maps neutral realized to the base class', () => {
    expect(brierScore({ bullish: 0, base: 1, bearish: 0 }, 'neutral')).toBeCloseTo(0, 10);
  });
  it('penalizes a confident wrong forecast maximally', () => {
    // predicted all-bullish, realized bearish → (1-0)^2 + (0-0)^2 + (0-1)^2 = 2
    expect(brierScore({ bullish: 1, base: 0, bearish: 0 }, 'bearish')).toBeCloseTo(2, 10);
  });
  it('scores a hedged forecast between the extremes', () => {
    // weights 0.5/0.3/0.2, realized bullish → (0.5-1)^2 + 0.3^2 + 0.2^2 = 0.25+0.09+0.04 = 0.38
    expect(brierScore({ bullish: 0.5, base: 0.3, bearish: 0.2 }, 'bullish')).toBeCloseTo(0.38, 10);
  });
});
