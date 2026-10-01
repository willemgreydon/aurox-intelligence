'use client';

import { useMemo, useState } from 'react';
import { deriveSignalSnapshot } from '@repo/signals';

/**
 * Signal X-Ray — explainability view for the deterministic signal engine.
 *
 * DB-free: it runs the real `deriveSignalSnapshot` from @repo/signals on a
 * transparent, user-chosen illustrative price scenario (clearly labelled — not
 * real market data), then decomposes the composite score into its three factor
 * contributions (MA spread, momentum, trend) as a waterfall. Deterministic:
 * same scenario + noise + seed → identical decomposition.
 */

const CW = 760;
const CH = 260;
const CPAD = { top: 20, right: 16, bottom: 28, left: 16 };
const PLOT_W = CW - CPAD.left - CPAD.right;
const PLOT_H = CH - CPAD.top - CPAD.bottom;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Scenario = { id: string; label: string; build: (rng: () => number, noise: number) => number[] };

const BARS = 64;

const SCENARIOS: Scenario[] = [
  {
    id: 'uptrend',
    label: 'Strong uptrend',
    build: (rng, noise) => series(100, (i) => 0.7, rng, noise),
  },
  {
    id: 'downtrend',
    label: 'Downtrend',
    build: (rng, noise) => series(140, () => -0.7, rng, noise),
  },
  {
    id: 'choppy',
    label: 'Choppy range',
    build: (rng, noise) => series(100, (i) => Math.sin(i * 0.55) * 0.9 - (i > 0 ? 0 : 0), rng, noise),
  },
  {
    id: 'reversal',
    label: 'Volatile reversal',
    build: (rng, noise) => series(100, (i) => (i < BARS / 2 ? 0.9 : -1.1), rng, noise * 1.6),
  },
  {
    id: 'breakout',
    label: 'Breakout',
    build: (rng, noise) => series(100, (i) => (i < BARS * 0.62 ? 0.02 : 1.4), rng, noise),
  },
  {
    id: 'fade',
    label: 'Momentum fade',
    build: (rng, noise) => series(100, (i) => (i < BARS * 0.45 ? 1.2 : 0.05), rng, noise),
  },
];

function series(start: number, drift: (i: number) => number, rng: () => number, noise: number): number[] {
  const out: number[] = [];
  let v = start;
  for (let i = 0; i < BARS; i += 1) {
    v += drift(i) + (rng() - 0.5) * noise;
    if (v < 1) v = 1;
    out.push(Number(v.toFixed(4)));
  }
  return out;
}

const FACTOR_META = [
  {
    key: 'movingAverageContrib' as const,
    label: 'MA spread',
    explain: 'Short (5) vs long (20) moving-average gap — positive when the fast average leads.',
  },
  {
    key: 'momentumContrib' as const,
    label: 'Momentum',
    explain: 'Net price change over the window, normalized by price.',
  },
  {
    key: 'trendContrib' as const,
    label: 'Trend strength',
    explain: 'Directional push relative to volatility (signal-to-noise).',
  },
];

const num = (v: number, digits = 3) => (v >= 0 ? '+' : '') + v.toFixed(digits);

export function SignalXRay() {
  const [scenarioId, setScenarioId] = useState('uptrend');
  const [noise, setNoise] = useState(0.6);
  const [seed, setSeed] = useState(7);

  const prices = useMemo(() => {
    const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0]!;
    return scenario.build(mulberry32(seed), noise);
  }, [scenarioId, noise, seed]);

  const snapshot = useMemo(() => deriveSignalSnapshot('SAMPLE', prices), [prices]);

  // Composite = mean of the three factors, so each contributes value / 3.
  const contribs = FACTOR_META.map((f) => ({
    ...f,
    value: snapshot.scoreBreakdown[f.key],
    delta: snapshot.scoreBreakdown[f.key] / 3,
  }));
  const composite = snapshot.compositeScoreValue;

  const toneClass =
    snapshot.interpretation === 'bullish'
      ? 'positive'
      : snapshot.interpretation === 'bearish'
        ? 'negative'
        : 'neutral';

  return (
    <div className="signal-xray">
      {/* Controls */}
      <div className="surface">
        <div className="surface__inner signal-xray__controls">
          <div className="path-explorer__presets">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`path-chip${scenarioId === s.id ? ' path-chip--active' : ''}`}
                onClick={() => setScenarioId(s.id)}
                aria-pressed={scenarioId === s.id}
              >
                {s.label}
              </button>
            ))}
            <button
              type="button"
              className="path-chip path-chip--ghost"
              onClick={() => setSeed((s) => (s * 1103515245 + 12345) >>> 0)}
              title="Redraw the illustrative series with new noise"
            >
              ↻ Reshuffle
            </button>
          </div>
          <div className="path-slider signal-xray__noise">
            <label htmlFor="xray-noise" className="path-slider__label">
              <span>Noise</span>
              <span className="path-slider__value">{noise.toFixed(1)}</span>
            </label>
            <input
              id="xray-noise"
              type="range"
              min={0}
              max={3}
              step={0.1}
              value={noise}
              onChange={(e) => setNoise(Number(e.target.value))}
              className="path-slider__input"
            />
          </div>
        </div>
      </div>

      <div className="signal-xray__grid">
        {/* Price chart — what the engine sees */}
        <figure className="surface signal-xray__panel">
          <div className="surface__inner">
            <h3 className="signal-xray__panel-title">Illustrative price series</h3>
            <PriceChart prices={prices} shortMa={snapshot.shortMovingAverage} longMa={snapshot.longMovingAverage} />
            <p className="path-explorer__readout">
              Latest {snapshot.latestPrice?.toFixed(2) ?? '—'} · MA5 {snapshot.shortMovingAverage?.toFixed(2) ?? '—'} ·
              MA20 {snapshot.longMovingAverage?.toFixed(2) ?? '—'}
            </p>
          </div>
        </figure>

        {/* Verdict */}
        <div className="surface signal-xray__panel">
          <div className="surface__inner signal-xray__verdict">
            <span className={`signal-xray__badge signal-xray__badge--${toneClass}`}>{snapshot.interpretation.toUpperCase()}</span>
            <div className="signal-xray__composite">
              <span className="path-stat__label">Composite score</span>
              <span className={`signal-xray__composite-value signal-xray__composite-value--${toneClass}`}>
                {num(composite, 2)}
              </span>
              <span className="path-stat__label">range −1 … +1</span>
            </div>
            <div className="signal-xray__confidence">
              <div className="signal-xray__confidence-head">
                <span className="path-stat__label">Confidence</span>
                <span className="path-slider__value">{Math.round(snapshot.confidenceScore * 100)}%</span>
              </div>
              <div className="signal-xray__confidence-track">
                <div className="signal-xray__confidence-fill" style={{ width: `${snapshot.confidenceScore * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Factor waterfall */}
      <figure className="surface signal-xray__panel">
        <div className="surface__inner">
          <h3 className="signal-xray__panel-title">Factor contribution → composite</h3>
          <Waterfall contribs={contribs} composite={composite} />
        </div>
      </figure>

      {/* Factor explanations */}
      <ul className="signal-xray__factors">
        {contribs.map((c) => (
          <li key={c.key} className="signal-xray__factor">
            <div className="signal-xray__factor-head">
              <span className="signal-xray__factor-label">{c.label}</span>
              <span className={`signal-xray__factor-value signal-xray__factor-value--${c.value >= 0 ? 'positive' : 'negative'}`}>
                {num(c.value)}
              </span>
            </div>
            <p className="signal-xray__factor-explain">{c.explain}</p>
          </li>
        ))}
      </ul>

      <p className="path-explorer__disclaimer">
        Illustrative scenarios only — synthetic price paths, not real market data. This runs the production
        deterministic signal engine (`deriveSignalSnapshot`) so the decomposition is exactly what Aurox computes.
        Same scenario, noise, and seed always reproduce the same result. Runs entirely in your browser.
      </p>
    </div>
  );
}

function PriceChart({ prices, shortMa, longMa }: { prices: number[]; shortMa: number | null; longMa: number | null }) {
  const min = Math.min(...prices, shortMa ?? Infinity, longMa ?? Infinity);
  const max = Math.max(...prices, shortMa ?? -Infinity, longMa ?? -Infinity);
  const range = max - min || 1;
  const x = (i: number) => CPAD.left + (i / (prices.length - 1)) * PLOT_W;
  const y = (v: number) => CPAD.top + (1 - (v - min) / range) * PLOT_H;
  const line = prices.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} className="path-explorer__svg" role="img" aria-label="Illustrative price series with moving averages" preserveAspectRatio="xMidYMid meet">
      <polyline points={line} className="path-explorer__median" />
      {shortMa != null ? <line x1={CPAD.left} y1={y(shortMa)} x2={CW - CPAD.right} y2={y(shortMa)} className="signal-xray__ma signal-xray__ma--short" /> : null}
      {longMa != null ? <line x1={CPAD.left} y1={y(longMa)} x2={CW - CPAD.right} y2={y(longMa)} className="signal-xray__ma signal-xray__ma--long" /> : null}
    </svg>
  );
}

function Waterfall({
  contribs,
  composite,
}: {
  contribs: Array<{ key: string; label: string; delta: number }>;
  composite: number;
}) {
  const W = 760;
  const H = 260;
  const pad = { top: 20, right: 16, bottom: 34, left: 16 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  // Columns: three deltas (running) + composite total.
  const cols: Array<{ label: string; from: number; to: number; kind: 'delta' | 'total' }> = [];
  let cum = 0;
  for (const c of contribs) {
    cols.push({ label: c.label, from: cum, to: cum + c.delta, kind: 'delta' });
    cum += c.delta;
  }
  cols.push({ label: 'Composite', from: 0, to: composite, kind: 'total' });

  const maxAbs = Math.max(0.05, ...cols.flatMap((c) => [Math.abs(c.from), Math.abs(c.to)]));
  const range = maxAbs * 1.15;
  const midY = pad.top + plotH / 2;
  const y = (v: number) => midY - (v / range) * (plotH / 2);
  const colW = plotW / cols.length;
  const barW = colW * 0.5;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="path-explorer__svg" role="img" aria-label="Factor contribution waterfall to the composite signal score" preserveAspectRatio="xMidYMid meet">
      {/* zero baseline */}
      <line x1={pad.left} y1={midY} x2={W - pad.right} y2={midY} className="path-explorer__grid" />
      {cols.map((c, i) => {
        const cx = pad.left + colW * i + colW / 2;
        const yTop = y(Math.max(c.from, c.to));
        const yBot = y(Math.min(c.from, c.to));
        const height = Math.max(1, yBot - yTop);
        const positive = c.to >= c.from;
        const cls =
          c.kind === 'total'
            ? 'signal-xray__bar signal-xray__bar--total'
            : `signal-xray__bar signal-xray__bar--${positive ? 'positive' : 'negative'}`;
        return (
          <g key={c.label}>
            {/* connector from previous cumulative */}
            {i > 0 && c.kind === 'delta' ? (
              <line x1={pad.left + colW * (i - 1) + colW / 2 + barW / 2} y1={y(c.from)} x2={cx - barW / 2} y2={y(c.from)} className="signal-xray__connector" />
            ) : null}
            <rect x={cx - barW / 2} y={yTop} width={barW} height={height} rx={2} className={cls} />
            <text x={cx} y={H - 16} textAnchor="middle" className="path-explorer__axis">
              {c.label}
            </text>
            <text x={cx} y={(c.to >= c.from ? yTop - 6 : yBot + 14)} textAnchor="middle" className="signal-xray__bar-value">
              {num(c.to - c.from, 3)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
