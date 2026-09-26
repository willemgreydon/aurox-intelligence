import { describe, expect, it } from 'vitest';
import {
  indexToX,
  priceToY,
  projectChartIntelligence,
  type ProjectionScale,
} from './chart-intelligence-projection';
import type {
  ChartIntelligenceOverlay,
  ChartOverlayPattern,
} from '../server/mappers/chart-intelligence-overlay-mapper';

// --- Fixtures -------------------------------------------------------------

const TIMESTAMPS = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05'];

// Candle-mode scale: prices ~[90,110] map to y in [400,40].
const CANDLE_SCALE: ProjectionScale = {
  timestamps: TIMESTAMPS,
  mode: 'candles',
  minPrice: 90,
  priceRange: 20,
  closeMin: 90,
  closeRange: 20,
};

const LINE_SCALE: ProjectionScale = { ...CANDLE_SCALE, mode: 'line' };

function pattern(overrides: Partial<ChartOverlayPattern>): ChartOverlayPattern {
  return {
    key: 'k',
    pattern: 'hammer',
    label: 'Hammer',
    glyph: 'HM',
    direction: 'bullish',
    strength: 'moderate',
    strengthLabel: 'Moderate',
    confidence: 0.6,
    anchorTimestamp: TIMESTAMPS[2]!,
    candleTimestamps: [TIMESTAMPS[2]!],
    anchorPrice: 100,
    placement: 'below',
    explanation: 'Long lower wick.',
    context: null,
    supporting: [],
    counter: [],
    ...overrides,
  };
}

function overlay(overrides: Partial<ChartIntelligenceOverlay>): ChartIntelligenceOverlay {
  return {
    available: true,
    hasInsufficientData: false,
    symbol: 'TEST',
    generatedAt: '2024-01-05T00:00:00.000Z',
    direction: 'bullish',
    headline: 'Moderate bullish evidence',
    confidence: 0.6,
    levels: [],
    swings: [],
    patterns: [],
    events: [],
    disclaimer: 'x',
    unavailableReason: null,
    ...overrides,
  };
}

// --- Geometry primitives --------------------------------------------------

describe('priceToY / indexToX', () => {
  it('maps prices to candle-mode Y deterministically', () => {
    expect(priceToY(100, CANDLE_SCALE)).toBeCloseTo(220, 5);
    expect(priceToY(90, CANDLE_SCALE)).toBeCloseTo(400, 5);
  });

  it('maps prices to line-mode Y deterministically', () => {
    expect(priceToY(90, LINE_SCALE)).toBeCloseTo(420, 5);
    expect(priceToY(110, LINE_SCALE)).toBeCloseTo(0, 5);
  });

  it('returns null on a degenerate (zero) range', () => {
    expect(priceToY(100, { ...CANDLE_SCALE, priceRange: 0 })).toBeNull();
  });

  it('offsets candle X by the 20px left margin, line X uses full width', () => {
    expect(indexToX(0, 5, 'candles')).toBe(20);
    expect(indexToX(4, 5, 'candles')).toBe(960);
    expect(indexToX(0, 5, 'line')).toBe(0);
    expect(indexToX(4, 5, 'line')).toBe(980);
  });
});

// --- OFF / empty behaviour ------------------------------------------------

describe('projectChartIntelligence — guards', () => {
  it('returns empty primitives when the overlay is unavailable', () => {
    const result = projectChartIntelligence(overlay({ available: false, levels: [{ kind: 'support', price: 100, label: 'S', touches: 3, distancePct: -0.02 }] }), CANDLE_SCALE);
    expect(result).toEqual({ levels: [], swings: [], patterns: [], events: [] });
  });

  it('returns empty primitives with fewer than two visible bars', () => {
    const result = projectChartIntelligence(
      overlay({ levels: [{ kind: 'support', price: 100, label: 'S', touches: 3, distancePct: -0.02 }] }),
      { ...CANDLE_SCALE, timestamps: ['2024-01-01'] },
    );
    expect(result.levels).toHaveLength(0);
  });
});

// --- Levels ---------------------------------------------------------------

describe('projectChartIntelligence — levels', () => {
  it('projects support and resistance to their Y coordinates', () => {
    const result = projectChartIntelligence(
      overlay({
        levels: [
          { kind: 'support', price: 95, label: 'S', touches: 2, distancePct: -0.05 },
          { kind: 'resistance', price: 105, label: 'R', touches: 4, distancePct: 0.05 },
        ],
      }),
      CANDLE_SCALE,
    );
    expect(result.levels).toHaveLength(2);
    const support = result.levels.find((l) => l.kind === 'support');
    expect(support?.y).toBeCloseTo(priceToY(95, CANDLE_SCALE)!, 5);
  });

  it('clips a level whose price falls outside the visible band', () => {
    const result = projectChartIntelligence(
      overlay({ levels: [{ kind: 'support', price: 500, label: 'S', touches: 2, distancePct: 4 }] }),
      CANDLE_SCALE,
    );
    expect(result.levels).toHaveLength(0);
  });

  it('de-dupes near-identical same-kind levels, keeping the higher touch count', () => {
    const result = projectChartIntelligence(
      overlay({
        levels: [
          { kind: 'support', price: 100.0, label: 'S', touches: 2, distancePct: 0 },
          { kind: 'support', price: 100.05, label: 'S', touches: 5, distancePct: 0 },
        ],
      }),
      CANDLE_SCALE,
    );
    expect(result.levels).toHaveLength(1);
    expect(result.levels[0]!.touches).toBe(5);
  });
});

// --- Swings ---------------------------------------------------------------

describe('projectChartIntelligence — swings', () => {
  it('projects a swing to its price Y', () => {
    const result = projectChartIntelligence(
      overlay({ swings: [{ kind: 'high', price: 108, label: 'HH', description: 'Higher high' }] }),
      CANDLE_SCALE,
    );
    expect(result.swings).toHaveLength(1);
    expect(result.swings[0]!.label).toBe('HH');
  });

  it('suppresses a swing chip that collides with an S/R level', () => {
    const result = projectChartIntelligence(
      overlay({
        levels: [{ kind: 'resistance', price: 105, label: 'R', touches: 3, distancePct: 0.05 }],
        swings: [{ kind: 'high', price: 105, label: 'HH', description: 'Higher high' }],
      }),
      CANDLE_SCALE,
    );
    expect(result.levels).toHaveLength(1);
    expect(result.swings).toHaveLength(0);
  });
});

// --- Patterns -------------------------------------------------------------

describe('projectChartIntelligence — patterns', () => {
  it('projects a pattern glyph in candle mode at the anchored candle', () => {
    const result = projectChartIntelligence(overlay({ patterns: [pattern({})] }), CANDLE_SCALE);
    expect(result.patterns).toHaveLength(1);
    expect(result.patterns[0]!.x).toBeCloseTo(indexToX(2, 5, 'candles'), 5);
    // placement 'below' offsets downward from the anchor price Y
    expect(result.patterns[0]!.y).toBeGreaterThan(priceToY(100, CANDLE_SCALE)!);
  });

  it('renders NO pattern glyphs in line mode', () => {
    const result = projectChartIntelligence(overlay({ patterns: [pattern({})] }), LINE_SCALE);
    expect(result.patterns).toHaveLength(0);
  });

  it('drops a pattern whose confirming timestamp is not in the viewport', () => {
    const result = projectChartIntelligence(
      overlay({ patterns: [pattern({ anchorTimestamp: '2099-01-01' })] }),
      CANDLE_SCALE,
    );
    expect(result.patterns).toHaveLength(0);
  });

  it('keeps the strongest pattern when several land on the same candle', () => {
    const result = projectChartIntelligence(
      overlay({
        patterns: [
          pattern({ key: 'weak', strength: 'weak', confidence: 0.9, glyph: 'W' }),
          pattern({ key: 'strong', strength: 'strong', confidence: 0.5, glyph: 'S' }),
        ],
      }),
      CANDLE_SCALE,
    );
    expect(result.patterns).toHaveLength(1);
    expect(result.patterns[0]!.glyph).toBe('S');
  });

  it('caps the number of rendered patterns', () => {
    const patterns = TIMESTAMPS.map((ts, i) => pattern({ key: `p${i}`, anchorTimestamp: ts }));
    const result = projectChartIntelligence(overlay({ patterns }), { ...CANDLE_SCALE, maxPatterns: 2 });
    expect(result.patterns).toHaveLength(2);
  });
});

// --- Events ---------------------------------------------------------------

describe('projectChartIntelligence — events', () => {
  it('projects a breakout event anchored to its candle', () => {
    const result = projectChartIntelligence(
      overlay({
        events: [
          {
            kind: 'breakout',
            direction: 'bullish',
            label: 'Breakout ↑',
            price: 104,
            anchorTimestamp: TIMESTAMPS[4]!,
            explanation: 'held above prior swing high',
          },
        ],
      }),
      CANDLE_SCALE,
    );
    expect(result.events).toHaveLength(1);
    expect(result.events[0]!.direction).toBe('bullish');
  });

  it('drops an event whose timestamp is not in the viewport', () => {
    const result = projectChartIntelligence(
      overlay({
        events: [
          { kind: 'breakout', direction: 'bullish', label: 'x', price: 104, anchorTimestamp: '2099-01-01', explanation: 'x' },
        ],
      }),
      CANDLE_SCALE,
    );
    expect(result.events).toHaveLength(0);
  });
});

// --- Determinism ----------------------------------------------------------

describe('projectChartIntelligence — determinism', () => {
  it('produces identical output for identical input', () => {
    const vm = overlay({
      levels: [{ kind: 'support', price: 95, label: 'S', touches: 2, distancePct: -0.05 }],
      swings: [{ kind: 'high', price: 108, label: 'HH', description: 'Higher high' }],
      patterns: [pattern({})],
      events: [
        { kind: 'breakout', direction: 'bullish', label: 'Breakout ↑', price: 104, anchorTimestamp: TIMESTAMPS[4]!, explanation: 'x' },
      ],
    });
    expect(projectChartIntelligence(vm, CANDLE_SCALE)).toEqual(projectChartIntelligence(vm, CANDLE_SCALE));
  });
});
