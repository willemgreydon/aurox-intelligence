import { describe, expect, it } from 'vitest';
import {
  buildAreaPath,
  buildLinePath,
  buildPointsAttr,
  clamp,
  computeBounds,
  inferTrend,
  movingAverage,
  normalizeUnit,
  projectSeries,
  sanitizeSeries,
  scaleLinear,
  trendFromSignalScore,
  xAt,
  yFor,
} from './chart-geometry';

describe('sanitizeSeries', () => {
  it('drops NaN/Infinity/null but keeps finite values in order', () => {
    expect(sanitizeSeries([1, NaN, 2, Infinity, -Infinity, 3])).toEqual([1, 2, 3]);
    expect(sanitizeSeries(null)).toEqual([]);
    expect(sanitizeSeries(undefined)).toEqual([]);
  });
});

describe('computeBounds', () => {
  it('floors range at 1 for a flat series (no divide-by-zero)', () => {
    expect(computeBounds([100, 100, 100])).toEqual({ min: 100, max: 100, range: 1 });
  });

  it('computes true range for a varying series', () => {
    expect(computeBounds([10, 30, 20])).toEqual({ min: 10, max: 30, range: 20 });
  });

  it('applies symmetric padding when requested', () => {
    expect(computeBounds([0, 100], 0.1)).toEqual({ min: -10, max: 110, range: 120 });
  });

  it('returns a safe unit domain for empty input', () => {
    expect(computeBounds([])).toEqual({ min: 0, max: 1, range: 1 });
  });
});

describe('projection primitives', () => {
  it('xAt spaces points evenly and is stable for a single point', () => {
    expect(xAt(0, 5, 100)).toBe(0);
    expect(xAt(4, 5, 100)).toBe(100);
    expect(xAt(0, 1, 100)).toBe(0); // count-1 floored to 1
  });

  it('yFor inverts the axis (max at top, min at bottom)', () => {
    const bounds = { min: 0, max: 100, range: 100 };
    expect(yFor(100, bounds, 50)).toBe(0);
    expect(yFor(0, bounds, 50)).toBe(50);
    expect(yFor(50, bounds, 50)).toBe(25);
  });

  it('yFor clamps only when asked', () => {
    const bounds = { min: 0, max: 10, range: 10 };
    expect(yFor(20, bounds, 50)).toBeLessThan(0); // unclamped overshoot
    expect(yFor(20, bounds, 50, true)).toBe(0); // clamped
  });
});

describe('projectSeries matches legacy inline math', () => {
  it('projects the endpoints to the corners', () => {
    const points = projectSeries([10, 20], { width: 100, height: 40 });
    expect(points[0]).toEqual({ x: 0, y: 40 });
    expect(points[1]).toEqual({ x: 100, y: 0 });
  });

  it('returns empty for empty/insufficient input', () => {
    expect(projectSeries([], { width: 100, height: 40 })).toEqual([]);
  });

  it('honours a shared bounds override', () => {
    const shared = { min: 0, max: 100, range: 100 };
    const points = projectSeries([50], { width: 10, height: 100, bounds: shared });
    expect(points[0]?.y).toBe(50);
  });
});

describe('path builders', () => {
  it('buildLinePath emits M then L commands', () => {
    expect(buildLinePath([0, 10, 5], { width: 20, height: 10 })).toBe('M 0 10 L 10 0 L 20 5');
  });

  it('buildAreaPath closes the path to the baseline', () => {
    const area = buildAreaPath([0, 10], { width: 20, height: 10 });
    expect(area.endsWith('L 20 10 L 0 10 Z')).toBe(true);
  });

  it('builders return empty string for empty series', () => {
    expect(buildLinePath([], { width: 10, height: 10 })).toBe('');
    expect(buildAreaPath([], { width: 10, height: 10 })).toBe('');
    expect(buildPointsAttr([], { width: 10, height: 10 })).toBe('');
  });

  it('buildPointsAttr emits comma-joined coordinate pairs', () => {
    expect(buildPointsAttr([0, 10], { width: 20, height: 10 })).toBe('0,10 20,0');
  });
});

describe('movingAverage', () => {
  it('computes a trailing average and clamps the window', () => {
    expect(movingAverage([2, 4, 6], 2)).toEqual([2, 3, 5]);
    expect(movingAverage([5], 10)).toEqual([5]);
    expect(movingAverage([], 3)).toEqual([]);
  });
});

describe('trend inference', () => {
  it('infers price direction from first→last', () => {
    expect(inferTrend([1, 2, 3])).toBe('up');
    expect(inferTrend([3, 2, 1])).toBe('down');
    expect(inferTrend([2, 2, 2])).toBe('flat');
    expect(inferTrend([5])).toBe('flat');
  });

  it('lets a signal score drive tone with a deadzone', () => {
    expect(trendFromSignalScore(0.5)).toBe('up');
    expect(trendFromSignalScore(-0.5)).toBe('down');
    expect(trendFromSignalScore(0.05)).toBe('flat');
    expect(trendFromSignalScore(NaN)).toBe('flat');
  });
});

describe('scaleLinear', () => {
  it('maps domain endpoints to range endpoints', () => {
    const s = scaleLinear([0, 10], [0, 100]);
    expect(s(0)).toBe(0);
    expect(s(10)).toBe(100);
    expect(s(5)).toBe(50);
  });

  it('supports inverted ranges (SVG y-axis)', () => {
    const s = scaleLinear([-1, 1], [200, 0]);
    expect(s(-1)).toBe(200);
    expect(s(1)).toBe(0);
    expect(s(0)).toBe(100);
  });

  it('collapses a degenerate domain to the range midpoint', () => {
    const s = scaleLinear([5, 5], [0, 100]);
    expect(s(5)).toBe(50);
    expect(s(999)).toBe(50);
  });

  it('clamps out-of-domain input to the range when requested', () => {
    const s = scaleLinear([0, 10], [0, 100], true);
    expect(s(20)).toBe(100);
    expect(s(-5)).toBe(0);
  });
});

describe('normalizeUnit', () => {
  it('normalizes into [0,1] and clamps', () => {
    expect(normalizeUnit(5, 0, 10)).toBe(0.5);
    expect(normalizeUnit(-5, 0, 10)).toBe(0);
    expect(normalizeUnit(50, 0, 10)).toBe(1);
    expect(normalizeUnit(5, 5, 5)).toBe(0); // degenerate domain
  });
});

describe('clamp', () => {
  it('bounds a value', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});
