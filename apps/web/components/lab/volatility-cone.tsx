'use client';

import { useMemo, useState } from 'react';
import type { VolatilityConeParams, VolatilityConeResult, VolatilityScenario } from '@repo/api-contracts';
import { runVolatilityConeStudy } from '@repo/forecasting';

/**
 * Volatility Cone — how annualized realized volatility is distributed across
 * rolling window lengths, with the latest reading overlaid so its position in
 * its own history is legible.
 *
 * DB-free by construction: the study runs the pure, seeded engine
 * (`runVolatilityConeStudy`) in the browser on a clearly-labelled SYNTHETIC
 * price path — never real market data — so it works even during a database
 * outage. Deterministic: the same scenario, base vol, and seed always reproduce
 * the same cone.
 */

// Fixed injected timestamp — the engine never reads ambient time.
const GENERATED_AT = '2025-01-01T00:00:00.000Z';

const W = 1000;
const H = 440;
const PAD = { top: 24, right: 20, bottom: 40, left: 52 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const SCENARIOS: Array<{ id: VolatilityScenario; label: string }> = [
  { id: 'calm', label: 'Calm' },
  { id: 'steady', label: 'Steady' },
  { id: 'clustered', label: 'Vol clustering' },
  { id: 'shock', label: 'Vol shock' },
  { id: 'trending', label: 'Trending' },
];

const volPct = (v: number | null, d = 1) => (v == null ? '—' : `${(v * 100).toFixed(d)}%`);

/** Percentile → tone: high vol = stressed (red), low = calm (green). */
function percentileTone(p: number | null): 'positive' | 'negative' | 'neutral' {
  if (p == null) return 'neutral';
  if (p >= 0.8) return 'negative';
  if (p <= 0.2) return 'positive';
  return 'neutral';
}

export function VolatilityCone() {
  const [scenario, setScenario] = useState<VolatilityScenario>('shock');
  const [baseVolPct, setBaseVolPct] = useState(20);
  const [years, setYears] = useState(3);
  const [seed, setSeed] = useState(7);
  const [hoverBand, setHoverBand] = useState<number | null>(null);

  const params: VolatilityConeParams = { scenario, baseVolPct, years, seed };

  const result = useMemo(
    () => runVolatilityConeStudy(params, GENERATED_AT),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenario, baseVolPct, years, seed],
  );

  const shortTone = percentileTone(result.bands[0]?.currentPercentile ?? null);

  return (
    <div className="vol-cone">
      {/* Controls */}
      <div className="surface">
        <div className="surface__inner path-explorer__controls-inner">
          <div className="path-explorer__presets">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`path-chip${scenario === s.id ? ' path-chip--active' : ''}`}
                onClick={() => {
                  setScenario(s.id);
                  setHoverBand(null);
                }}
                aria-pressed={scenario === s.id}
              >
                {s.label}
              </button>
            ))}
            <button
              type="button"
              className="path-chip path-chip--ghost"
              onClick={() => setSeed((s) => (s * 1103515245 + 12345) >>> 0)}
              title="Redraw the illustrative price path with a new seed"
            >
              ↻ Reshuffle
            </button>
          </div>
          <div className="path-explorer__sliders">
            <Slider id="vc-vol" label="Base volatility (annual)" value={baseVolPct} min={5} max={80} step={1} display={`${baseVolPct}%`} onChange={setBaseVolPct} />
            <Slider id="vc-years" label="History" value={years} min={1} max={10} step={1} display={`${years} yr`} onChange={setYears} />
          </div>
        </div>
      </div>

      {result.bands.length === 0 ? (
        <div className="surface">
          <div className="surface__inner candle-annotator__insufficient">{result.summary}</div>
        </div>
      ) : (
        <div className="vol-cone__grid">
          <figure className="surface vol-cone__chart-panel">
            <div className="surface__inner">
              <ConeChart result={result} hoverBand={hoverBand} onHover={setHoverBand} />
              <ConeReadout result={result} hoverBand={hoverBand} />
              <ul className="candle-annotator__legend">
                <li><span className="vol-swatch vol-swatch--outer" /> min–max</li>
                <li><span className="vol-swatch vol-swatch--mid" /> p10–p90</li>
                <li><span className="vol-swatch vol-swatch--inner" /> p25–p75</li>
                <li><span className="vol-swatch vol-swatch--median" /> median</li>
                <li><span className="vol-swatch vol-swatch--current" /> current</li>
              </ul>
            </div>
          </figure>

          <div className="surface vol-cone__side-panel">
            <div className="surface__inner vol-cone__verdict">
              <span className={`candle-badge candle-badge--${shortTone}`}>
                {shortTone === 'negative' ? 'ELEVATED' : shortTone === 'positive' ? 'COMPRESSED' : 'NORMAL'}
              </span>
              <div className="candle-annotator__composite">
                <span className="path-stat__label">Latest {result.bands[0]!.label} realized vol</span>
                <span className={`candle-annotator__composite-value candle-annotator__composite-value--${shortTone}`}>
                  {volPct(result.currentShortVol)}
                </span>
                <span className="path-stat__label">
                  {result.bands[0]!.currentPercentile == null
                    ? ''
                    : `${Math.round(result.bands[0]!.currentPercentile * 100)}th percentile of its history`}
                </span>
              </div>
              <ContextSpark path={result.path} />
              <p className="vol-cone__note">
                Synthetic {result.scenario} price path · {result.sampleBars} daily bars · annualized ×√
                {result.tradingDaysPerYear}.
              </p>
            </div>
          </div>
        </div>
      )}

      {result.bands.length > 0 && (
        <div className="surface">
          <div className="surface__inner">
            <h3 className="candle-annotator__panel-title">Realized-vol term structure</h3>
            <div className="vol-cone__table-wrap">
              <table className="vol-cone__table">
                <thead>
                  <tr>
                    <th scope="col">Window</th>
                    <th scope="col">Min</th>
                    <th scope="col">p25</th>
                    <th scope="col">Median</th>
                    <th scope="col">p75</th>
                    <th scope="col">Max</th>
                    <th scope="col">Current</th>
                    <th scope="col">Percentile</th>
                  </tr>
                </thead>
                <tbody>
                  {result.bands.map((b, i) => {
                    const tone = percentileTone(b.currentPercentile);
                    return (
                      <tr
                        key={b.window}
                        className={hoverBand === i ? 'vol-cone__row--hover' : undefined}
                        onMouseEnter={() => setHoverBand(i)}
                        onMouseLeave={() => setHoverBand(null)}
                      >
                        <th scope="row">{b.label}</th>
                        <td>{volPct(b.min)}</td>
                        <td>{volPct(b.p25)}</td>
                        <td>{volPct(b.median)}</td>
                        <td>{volPct(b.p75)}</td>
                        <td>{volPct(b.max)}</td>
                        <td className={`vol-cone__cur vol-cone__cur--${tone}`}>{volPct(b.current)}</td>
                        <td className={`vol-cone__cur vol-cone__cur--${tone}`}>
                          {b.currentPercentile == null ? '—' : `${Math.round(b.currentPercentile * 100)}%`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <p className="path-explorer__disclaimer">
        Illustrative synthetic scenarios only — not real market data and not financial advice. This runs the pure,
        deterministic volatility engine (<code>runVolatilityConeStudy</code>); the same scenario, base vol, and seed
        always reproduce the same cone. Realized vol is the sample standard deviation of daily log-returns over each
        rolling window, annualized. Runs entirely in your browser — no market data or database required.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cone chart
// ---------------------------------------------------------------------------

function ConeChart({
  result,
  hoverBand,
  onHover,
}: {
  result: VolatilityConeResult;
  hoverBand: number | null;
  onHover: (i: number | null) => void;
}) {
  const bands = result.bands;
  const n = bands.length;

  const maxVal = Math.max(...bands.map((b) => Math.max(b.max, b.current ?? 0)));
  const yMax = maxVal * 1.1 || 1;
  const slotW = PLOT_W / Math.max(1, n);
  const x = (i: number) => PAD.left + (i + 0.5) * slotW;
  const y = (v: number) => PAD.top + (1 - v / yMax) * PLOT_H;

  const area = (upper: (b: (typeof bands)[number]) => number, lower: (b: (typeof bands)[number]) => number) => {
    const up = bands.map((b, i) => `${x(i).toFixed(1)},${y(upper(b)).toFixed(1)}`);
    const down = bands
      .map((b, i) => ({ b, i }))
      .reverse()
      .map(({ b, i }) => `${x(i).toFixed(1)},${y(lower(b)).toFixed(1)}`);
    return `M${up.join(' L')} L${down.join(' L')} Z`;
  };
  const line = (pick: (b: (typeof bands)[number]) => number) =>
    `M${bands.map((b, i) => `${x(i).toFixed(1)},${y(pick(b)).toFixed(1)}`).join(' L')}`;

  const yTicks = Array.from({ length: 5 }, (_, i) => (yMax * i) / 4);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="candle-annotator__svg"
      role="img"
      aria-label={result.summary}
      preserveAspectRatio="xMidYMid meet"
      onMouseLeave={() => onHover(null)}
    >
      <title>Volatility cone — {result.scenario} scenario</title>

      {/* gridlines + y labels */}
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} y1={y(t)} x2={W - PAD.right} y2={y(t)} className="candle-chart__grid" />
          <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="candle-chart__axis">
            {(t * 100).toFixed(0)}%
          </text>
        </g>
      ))}

      {/* cone bands, widest first */}
      <path d={area((b) => b.max, (b) => b.min)} className="vol-cone__band vol-cone__band--outer" />
      <path d={area((b) => b.p90, (b) => b.p10)} className="vol-cone__band vol-cone__band--mid" />
      <path d={area((b) => b.p75, (b) => b.p25)} className="vol-cone__band vol-cone__band--inner" />
      <path d={line((b) => b.median)} className="vol-cone__median" />

      {/* current term structure */}
      <path d={line((b) => b.current ?? b.median)} className="vol-cone__current-line" />

      {/* per-window hit targets + current markers */}
      {bands.map((b, i) => {
        const tone = percentileTone(b.currentPercentile);
        const cur = b.current ?? b.median;
        const isHover = hoverBand === i;
        return (
          <g key={b.window} onMouseEnter={() => onHover(i)}>
            <rect x={PAD.left + i * slotW} y={PAD.top} width={slotW} height={PLOT_H} className="candle__hit" />
            {isHover ? (
              <line x1={x(i)} y1={PAD.top} x2={x(i)} y2={H - PAD.bottom} className="vol-cone__cursor" />
            ) : null}
            <circle cx={x(i)} cy={y(cur)} r={isHover ? 5.5 : 4} className={`vol-cone__marker vol-cone__marker--${tone}`} />
            <text x={x(i)} y={H - 14} textAnchor="middle" className="candle-chart__axis">
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ConeReadout({ result, hoverBand }: { result: VolatilityConeResult; hoverBand: number | null }) {
  if (hoverBand != null && result.bands[hoverBand]) {
    const b = result.bands[hoverBand];
    return (
      <p className="path-explorer__readout" role="status" aria-live="polite">
        {b.label} window — median {volPct(b.median)} · p25–p75 {volPct(b.p25)}–{volPct(b.p75)} · current{' '}
        {volPct(b.current)}
        {b.currentPercentile != null ? ` (${Math.round(b.currentPercentile * 100)}th pct)` : ''} · {b.sampleSize} samples
      </p>
    );
  }
  return (
    <p className="path-explorer__readout" role="status" aria-live="polite">
      Hover a window to inspect its realized-vol distribution. The line tracks the latest reading across horizons.
    </p>
  );
}

function ContextSpark({ path }: { path: number[] }) {
  if (path.length < 2) return null;
  const w = 260;
  const h = 56;
  const min = Math.min(...path);
  const max = Math.max(...path);
  const range = max - min || 1;
  const x = (i: number) => (i / (path.length - 1)) * w;
  const y = (v: number) => h - ((v - min) / range) * h;
  const points = path.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="vol-cone__spark" role="img" aria-label="Synthetic price path used for the study" preserveAspectRatio="none">
      <polyline points={points} className="vol-cone__spark-line" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Slider (mirrors Path Explorer)
// ---------------------------------------------------------------------------

function Slider(props: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="path-slider">
      <label htmlFor={props.id} className="path-slider__label">
        <span>{props.label}</span>
        <span className="path-slider__value">{props.display}</span>
      </label>
      <input
        id={props.id}
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="path-slider__input"
      />
    </div>
  );
}
