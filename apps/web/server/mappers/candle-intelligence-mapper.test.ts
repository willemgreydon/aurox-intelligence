import { describe, expect, it } from 'vitest';
import {
  buildCandleIntelligenceViewModel,
  type CandleIntelligenceMapperInput,
} from './candle-intelligence-mapper';

type Bar = CandleIntelligenceMapperInput['bars'][number];

function buildBars(count = 30): Bar[] {
  const bars: Bar[] = [];
  const start = Date.UTC(2024, 0, 1);
  for (let i = 0; i < count; i += 1) {
    const timestamp = new Date(start + i * 86_400_000).toISOString().slice(0, 10);
    const base = 100 + i * 0.6; // gentle uptrend
    const up = i % 2 === 0;
    const open = base;
    const close = up ? base + 1.2 : base - 0.4;
    const high = Math.max(open, close) + 0.5;
    const low = Math.min(open, close) - 0.5;
    bars.push({ timestamp, open, high, low, close, volume: 1_000_000 });
  }
  return bars;
}

const GENERATED_AT = '2024-02-01T00:00:00.000Z';

describe('buildCandleIntelligenceViewModel', () => {
  it('returns an insufficient-data view model when bars are too few', () => {
    const vm = buildCandleIntelligenceViewModel({
      symbol: 'TEST',
      assetClass: 'stock',
      bars: buildBars(5),
      generatedAt: GENERATED_AT,
    });
    expect(vm.available).toBe(false);
    expect(vm.headline).toBe('Insufficient data');
    expect(vm.scoreDisplay).toBe('—');
    expect(vm.insufficientMessage).not.toBeNull();
  });

  it('returns a display-ready view model for sufficient data', () => {
    const vm = buildCandleIntelligenceViewModel({
      symbol: 'TEST',
      assetClass: 'stock',
      bars: buildBars(30),
      generatedAt: GENERATED_AT,
    });
    expect(vm.available).toBe(true);
    expect(['Bullish', 'Bearish', 'Neutral']).toContain(vm.directionLabel);
    expect(vm.confidencePct).toBeGreaterThanOrEqual(0);
    expect(vm.confidencePct).toBeLessThanOrEqual(100);
    expect(vm.summaryRows.length).toBeGreaterThan(0);
    expect(vm.disclaimer).toMatch(/not a prediction/i);
    expect(vm.scoreDisplay).toMatch(/^[+-]/);
  });

  it('is deterministic for identical input', () => {
    const args: CandleIntelligenceMapperInput = {
      symbol: 'TEST',
      assetClass: 'stock',
      bars: buildBars(30),
      generatedAt: GENERATED_AT,
    };
    expect(buildCandleIntelligenceViewModel(args)).toEqual(buildCandleIntelligenceViewModel(args));
  });
});
