// Deterministic, illustrative OHLC scenario builders + a curated scenario set
// for the Aurox Lab "Candlestick Annotator". Pure and reproducible: no
// Math.random(), no Date.now() — timestamps derive from a fixed epoch so every
// series is byte-for-byte identical on every run (see no-fake-market-data.md:
// these are CLEARLY-LABELLED SYNTHETIC scenarios, never presented as real
// market data). The builders here are the single source of truth; the test
// fixtures re-export them so tests and the Lab share identical geometry.
import type { CandleBar } from './types';

const EPOCH = Date.UTC(2025, 0, 1); // fixed anchor — deterministic, not Date.now()
const DAY_MS = 86_400_000;

export interface BarSpec {
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number | null;
}

/** Build daily bars with sequential UTC timestamps from the fixed epoch. */
export function mkBars(specs: BarSpec[], startIndex = 0): CandleBar[] {
  return specs.map((s, i) => ({
    timestamp: new Date(EPOCH + (startIndex + i) * DAY_MS).toISOString(),
    open: s.o,
    high: s.h,
    low: s.l,
    close: s.c,
    volume: s.v === undefined ? 1_000 : s.v,
  }));
}

/** A flat/quiet base of `count` doji-ish bars around `price` (no trend). */
export function flatBase(count: number, price = 100, volume = 1_000): BarSpec[] {
  return Array.from({ length: count }, () => ({ o: price, h: price + 0.5, l: price - 0.5, c: price, v: volume }));
}

/** A monotonic up series of `count` bullish bars starting at `start`, step per bar. */
export function upSeries(count: number, start = 100, step = 2, volume = 1_000): BarSpec[] {
  return Array.from({ length: count }, (_, i) => {
    const open = start + i * step;
    const close = open + step * 0.8;
    return { o: open, h: close + step * 0.2, l: open - step * 0.1, c: close, v: volume };
  });
}

/** A monotonic down series of `count` bearish bars starting at `start`. */
export function downSeries(count: number, start = 160, step = 2, volume = 1_000): BarSpec[] {
  return Array.from({ length: count }, (_, i) => {
    const open = start - i * step;
    const close = open - step * 0.8;
    return { o: open, h: open + step * 0.1, l: close - step * 0.2, c: close, v: volume };
  });
}

/** A zig-zag series producing alternating swing highs/lows around `mid`. */
export function zigzag(count: number, mid = 100, amp = 8): BarSpec[] {
  return Array.from({ length: count }, (_, i) => {
    const phase = i % 4;
    const c = phase === 0 ? mid + amp : phase === 2 ? mid - amp : mid;
    const o = i === 0 ? mid : mid;
    return { o, h: Math.max(o, c) + 1, l: Math.min(o, c) - 1, c, v: 1_000 };
  });
}

// ---------------------------------------------------------------------------
// Richer builders for structured trends with pullbacks (so the market-structure
// swing detector finds genuine higher-highs / lower-lows sequences).
// ---------------------------------------------------------------------------

/**
 * Turn a path of closing prices into candles. Each bar carries a small body
 * around its own close, oriented by the local slope, with symmetric wick
 * padding. Keeping the body local (rather than spanning the prior close) means
 * every pivot close is a UNIQUE local extreme, so the market-structure swing
 * detector reads clean higher-highs / lower-lows sequences instead of flat
 * double-tops. sanitizeBars normalizes any degenerate high/low.
 */
export function fromCloses(closes: number[], body = 0.5, wick = 0.4, volume = 1_000): BarSpec[] {
  return closes.map((close, i) => {
    const prev = i === 0 ? close : closes[i - 1]!;
    const up = close >= prev;
    const open = up ? close - body : close + body;
    return {
      o: Number(open.toFixed(4)),
      h: Math.max(open, close) + wick,
      l: Math.min(open, close) - wick,
      c: close,
      v: volume,
    };
  });
}

/**
 * Linearly interpolate a sequence of pivot prices into a dense closes[] path.
 * Each pivot becomes a local swing turning point; `barsPerLeg` controls how many
 * bars connect consecutive pivots (>= 3 keeps pivots outside the ±2 swing window).
 */
export function pivotCloses(pivots: number[], barsPerLeg = 5): number[] {
  if (pivots.length === 0) return [];
  const out: number[] = [pivots[0]!];
  for (let p = 0; p < pivots.length - 1; p += 1) {
    const a = pivots[p]!;
    const b = pivots[p + 1]!;
    for (let i = 1; i <= barsPerLeg; i += 1) {
      out.push(a + (b - a) * (i / barsPerLeg));
    }
  }
  return out.map((v) => Number(v.toFixed(4)));
}

// ---------------------------------------------------------------------------
// Curated scenarios. Each ends in a specific geometry so the engine's real
// detectors surface a clean, correctly-labelled read for teaching purposes.
// ---------------------------------------------------------------------------

export type LabAssetClass = 'stock' | 'etf' | 'crypto' | 'fx' | 'index';

export interface CandleLabScenario {
  id: string;
  /** Short human label for the scenario chip. */
  label: string;
  /** One-line description of the structure/pattern to look for. */
  summary: string;
  /** Illustrative symbol shown on the chart (clearly synthetic). */
  symbol: string;
  assetClass: LabAssetClass;
  /** Builds the deterministic daily OHLC series. */
  build: () => CandleBar[];
}

/** Hammer forming at support after a stepped decline (bullish reversal context). */
function hammerAtSupport(): CandleBar[] {
  // Lower highs (150 → 138 → 128) and lower lows (128 → 116 → 106): a downtrend.
  const path = pivotCloses([150, 128, 138, 116, 128, 106], 5);
  const base = fromCloses(path);
  // Terminal hammer near the low: small bullish body, long lower wick, tiny upper wick.
  const hammer: BarSpec = { o: 105, h: 106.6, l: 99, c: 106.2, v: 1_600 };
  return mkBars([...base, hammer]);
}

/** Bearish engulfing at resistance after a stepped advance (bearish reversal context). */
function bearishEngulfingAtResistance(): CandleBar[] {
  // Higher highs (120 → 132 → 144) and higher lows (110 → 122 → 134): an uptrend.
  const path = pivotCloses([100, 120, 110, 132, 122, 144], 5);
  const base = fromCloses(path);
  // Small up bar, then a large down bar whose body fully engulfs it.
  const smallUp: BarSpec = { o: 143.5, h: 145.5, l: 143, c: 145, v: 1_100 };
  const engulf: BarSpec = { o: 145.6, h: 146, l: 140.5, c: 141, v: 2_000 };
  return mkBars([...base, smallUp, engulf]);
}

/** Full-body bullish marubozu breaking above prior resistance (breakout continuation). */
function bullishBreakoutMarubozu(): CandleBar[] {
  // Uptrend that keeps stalling just under ~130 resistance, then breaks it.
  const path = pivotCloses([100, 118, 108, 128, 118, 128], 5);
  const base = fromCloses(path);
  // Marubozu: open at ~prior close, close well above resistance, negligible wicks.
  const maru: BarSpec = { o: 128.2, h: 139.3, l: 128.1, c: 139, v: 2_400 };
  return mkBars([...base, maru]);
}

/** Range-bound chop resolving in a long-legged doji (indecision). */
function rangeDojiIndecision(): CandleBar[] {
  // Repeated swings between ~95 support and ~105 resistance → range regime.
  const path = pivotCloses([100, 105, 95, 105, 95, 105, 95, 100], 4);
  const base = fromCloses(path);
  // Long-legged doji: open ≈ close mid-range, long wicks both sides.
  const doji: BarSpec = { o: 100, h: 104.5, l: 95.5, c: 100.1, v: 900 };
  return mkBars([...base, doji]);
}

/** Evening star topping pattern after an advance (three-bar bearish reversal). */
function eveningStarTop(): CandleBar[] {
  const path = pivotCloses([100, 118, 110, 130, 122, 138], 5);
  const base = fromCloses(path);
  // A: strong up (body >= 50% range). B: small star gapping up. C: strong down below A's midpoint.
  const strongUp: BarSpec = { o: 137, h: 144.4, l: 136.6, c: 144, v: 1_500 };
  const star: BarSpec = { o: 145, h: 146.4, l: 144.6, c: 145.2, v: 1_100 };
  const strongDown: BarSpec = { o: 145, h: 145.4, l: 138.6, c: 139, v: 2_100 };
  return mkBars([...base, strongUp, star, strongDown]);
}

/**
 * Curated, clearly-synthetic scenarios for the Candlestick Annotator. Order is
 * stable (the first is the default). Determinism is guaranteed by the builders.
 */
export const CANDLE_LAB_SCENARIOS: readonly CandleLabScenario[] = [
  {
    id: 'hammer-support',
    label: 'Hammer after decline',
    summary: 'A stepped downtrend prints a hammer rejecting lower prices — watch how the engine weighs one reversal candle against the trend.',
    symbol: 'DEMO-A',
    assetClass: 'stock',
    build: hammerAtSupport,
  },
  {
    id: 'bearish-engulfing-resistance',
    label: 'Bearish engulfing at resistance',
    summary: 'Advance into resistance, then a down bar engulfing the prior up bar — a bearish reversal context.',
    symbol: 'DEMO-B',
    assetClass: 'stock',
    build: bearishEngulfingAtResistance,
  },
  {
    id: 'bullish-breakout',
    label: 'Bullish breakout',
    summary: 'Repeated tests of resistance resolve in a full-body marubozu that breaks out and holds.',
    symbol: 'DEMO-C',
    assetClass: 'crypto',
    build: bullishBreakoutMarubozu,
  },
  {
    id: 'range-doji',
    label: 'Range indecision',
    summary: 'Price oscillates in a defined range and prints a long-legged doji — no directional edge.',
    symbol: 'DEMO-D',
    assetClass: 'etf',
    build: rangeDojiIndecision,
  },
  {
    id: 'evening-star',
    label: 'Evening star top',
    summary: 'Advance, a small indecision star, then a strong down close — a three-bar bearish reversal.',
    symbol: 'DEMO-E',
    assetClass: 'stock',
    build: eveningStarTop,
  },
] as const;
