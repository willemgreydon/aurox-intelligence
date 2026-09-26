import { describe, expect, it } from 'vitest';
import { mapSignalAccuracy } from './signal-accuracy-mapper';
import type { SignalAccuracyRow } from '@repo/db';

describe('mapSignalAccuracy', () => {
  it('is unavailable (accumulating) with no rows', () => {
    const vm = mapSignalAccuracy([], 10);
    expect(vm.available).toBe(false);
    expect(vm.emptyReason).toMatch(/accumulating/i);
    expect(vm.buckets).toHaveLength(0);
  });

  it('is unavailable when totals are zero', () => {
    const rows: SignalAccuracyRow[] = [
      { interpretation: 'bullish', total: 0, avgForwardReturnPct: 0, directionalHits: 0 },
    ];
    expect(mapSignalAccuracy(rows, 10).available).toBe(false);
  });

  it('hides the hit rate below the minimum sample (N < 20)', () => {
    const rows: SignalAccuracyRow[] = [
      { interpretation: 'bullish', total: 8, avgForwardReturnPct: 1.2, directionalHits: 6 },
    ];
    const vm = mapSignalAccuracy(rows, 10);
    expect(vm.available).toBe(true);
    const bullish = vm.buckets[0]!;
    expect(bullish.reliability).toBe('insufficient');
    expect(bullish.hitRatePct).toBeNull();
    expect(bullish.hitRateDisplay).toBe('—');
    expect(bullish.sampleSize).toBe(8);
    expect(bullish.avgReturnDisplay).toBe('+1.20%');
  });

  it('shows the hit rate and bands reliability by sample size', () => {
    const rows: SignalAccuracyRow[] = [
      { interpretation: 'bullish', total: 60, avgForwardReturnPct: 0.98, directionalHits: 39 },
      { interpretation: 'bearish', total: 250, avgForwardReturnPct: -1.4, directionalHits: 150 },
    ];
    const vm = mapSignalAccuracy(rows, 10);
    const bullish = vm.buckets.find((b) => b.interpretation === 'bullish')!;
    const bearish = vm.buckets.find((b) => b.interpretation === 'bearish')!;
    expect(bullish.hitRateDisplay).toBe('65%'); // 39/60
    expect(bullish.reliability).toBe('moderate'); // 50..200
    expect(bearish.hitRateDisplay).toBe('60%'); // 150/250
    expect(bearish.reliability).toBe('high'); // >=200
    expect(bearish.avgReturnDisplay).toBe('-1.40%');
    expect(vm.totalSamples).toBe(310);
  });
});
