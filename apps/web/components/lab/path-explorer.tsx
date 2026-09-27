'use client';

import { useId, useMemo, useState } from 'react';
import type { MonteCarloParams } from '@repo/api-contracts';
import { runMonteCarloSimulation } from '@repo/forecasting';

/**
 * Path Explorer — deterministic Monte Carlo portfolio simulator.
 *
 * DB-free by construction: the simulation is pure and runs in the browser on
 * user-set assumptions, so sliders update instantly with no server round-trip and
 * the tool works even during a database outage. Seeded → fully reproducible.
 */

const W = 1000;
const H = 460;
const PAD = { top: 24, right: 20, bottom: 34, left: 64 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const pct = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 });

type Preset = { id: string; label: string; ret: number; vol: number };
const PRESETS: Preset[] = [
  { id: 'conservative', label: 'Conservative', ret: 4, vol: 8 },
  { id: 'balanced', label: 'Balanced', ret: 7, vol: 15 },
  { id: 'aggressive', label: 'Aggressive', ret: 11, vol: 26 },
];

export function PathExplorer() {
  const [startingCapital, setStartingCapital] = useState(10_000);
  const [annualReturnPct, setAnnualReturnPct] = useState(7);
  const [annualVolatilityPct, setAnnualVolatilityPct] = useState(15);
  const [years, setYears] = useState(20);
  const [monthlyContribution, setMonthlyContribution] = useState(250);
  const [targetValue, setTargetValue] = useState(250_000);
  const [seed, setSeed] = useState(42);
  const [hoverStep, setHoverStep] = useState<number | null>(null);
  const [generatedAt] = useState(() => new Date().toISOString());
  const baseId = useId();

  const params: MonteCarloParams = {
    startingCapital,
    annualReturnPct,
    annualVolatilityPct,
    years,
    monthlyContribution,
    paths: 800,
    seed,
    targetValue: targetValue > 0 ? targetValue : null,
  };

  const result = useMemo(
    () => runMonteCarloSimulation(params, generatedAt),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [startingCapital, annualReturnPct, annualVolatilityPct, years, monthlyContribution, targetValue, seed, generatedAt],
  );

  const { bands, steps } = result;
  const yMax = Math.max(...bands.map((b) => b.p95), 1);

  const x = (step: number) => PAD.left + (steps === 0 ? 0 : step / steps) * PLOT_W;
  const y = (value: number) => PAD.top + (1 - value / yMax) * PLOT_H;

  const bandPath = (upper: (b: (typeof bands)[number]) => number, lower: (b: (typeof bands)[number]) => number) => {
    const up = bands.map((b) => `${x(b.step).toFixed(1)},${y(upper(b)).toFixed(1)}`);
    const down = bands
      .slice()
      .reverse()
      .map((b) => `${x(b.step).toFixed(1)},${y(lower(b)).toFixed(1)}`);
    return `M${up.join(' L')} L${down.join(' L')} Z`;
  };

  const linePath = (pick: (b: (typeof bands)[number]) => number) =>
    `M${bands.map((b) => `${x(b.step).toFixed(1)},${y(pick(b)).toFixed(1)}`).join(' L')}`;

  const contributedLine = bands
    .map((b) => `${x(b.step).toFixed(1)},${y(Math.min(startingCapital + monthlyContribution * b.step, yMax)).toFixed(1)}`)
    .join(' L');

  // y-axis ticks (5 gridlines)
  const yTicks = Array.from({ length: 5 }, (_, i) => (yMax * i) / 4);
  const xTickYears = Array.from({ length: Math.min(years, 8) + 1 }, (_, i) =>
    Math.round((years / Math.min(years, 8)) * i),
  ).filter((v, i, arr) => arr.indexOf(v) === i && v <= years);

  const hovered = hoverStep != null ? bands[hoverStep] : null;

  function handleMove(event: React.MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const relX = ((event.clientX - rect.left) / rect.width) * W;
    const ratio = Math.max(0, Math.min(1, (relX - PAD.left) / PLOT_W));
    setHoverStep(Math.round(ratio * steps));
  }

  const applyPreset = (p: Preset) => {
    setAnnualReturnPct(p.ret);
    setAnnualVolatilityPct(p.vol);
  };

  return (
    <div className="path-explorer">
      {/* Controls */}
      <div className="path-explorer__controls surface">
        <div className="surface__inner path-explorer__controls-inner">
          <div className="path-explorer__presets">
            {PRESETS.map((p) => {
              const active = annualReturnPct === p.ret && annualVolatilityPct === p.vol;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`path-chip${active ? ' path-chip--active' : ''}`}
                  onClick={() => applyPreset(p)}
                  aria-pressed={active}
                >
                  {p.label}
                </button>
              );
            })}
            <button
              type="button"
              className="path-chip path-chip--ghost"
              onClick={() => setSeed((s) => (s * 1103515245 + 12345) >>> 0)}
              title="Draw a new set of random paths (changes the seed)"
            >
              ↻ Reshuffle
            </button>
          </div>

          <div className="path-explorer__sliders">
            <Slider id={`${baseId}-cap`} label="Starting capital" value={startingCapital} min={0} max={500_000} step={1_000} display={currency.format(startingCapital)} onChange={setStartingCapital} />
            <Slider id={`${baseId}-contrib`} label="Monthly contribution" value={monthlyContribution} min={0} max={5_000} step={50} display={currency.format(monthlyContribution)} onChange={setMonthlyContribution} />
            <Slider id={`${baseId}-ret`} label="Expected return (annual)" value={annualReturnPct} min={-5} max={20} step={0.5} display={`${annualReturnPct}%`} onChange={setAnnualReturnPct} />
            <Slider id={`${baseId}-vol`} label="Volatility (annual)" value={annualVolatilityPct} min={0} max={60} step={1} display={`${annualVolatilityPct}%`} onChange={setAnnualVolatilityPct} />
            <Slider id={`${baseId}-years`} label="Horizon" value={years} min={1} max={40} step={1} display={`${years} yr`} onChange={setYears} />
            <Slider id={`${baseId}-target`} label="Target value" value={targetValue} min={0} max={2_000_000} step={10_000} display={targetValue > 0 ? currency.format(targetValue) : 'None'} onChange={setTargetValue} />
          </div>
        </div>
      </div>

      {/* Chart */}
      <figure className="path-explorer__chart surface">
        <div className="surface__inner">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="path-explorer__svg"
            role="img"
            aria-label={result.summary}
            preserveAspectRatio="xMidYMid meet"
            onMouseMove={handleMove}
            onMouseLeave={() => setHoverStep(null)}
          >
            {/* gridlines + y labels */}
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} y1={y(t)} x2={W - PAD.right} y2={y(t)} className="path-explorer__grid" />
                <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="path-explorer__axis">
                  {compact.format(t)}
                </text>
              </g>
            ))}
            {/* x-axis year ticks */}
            {xTickYears.map((yr) => (
              <text key={yr} x={x(yr * 12)} y={H - 10} textAnchor="middle" className="path-explorer__axis">
                {yr}y
              </text>
            ))}

            {/* bands */}
            <path d={bandPath((b) => b.p95, (b) => b.p5)} className="path-explorer__band path-explorer__band--outer" />
            <path d={bandPath((b) => b.p75, (b) => b.p25)} className="path-explorer__band path-explorer__band--inner" />

            {/* sample paths */}
            {result.samplePaths.map((path, i) => (
              <polyline
                key={i}
                points={path.map((v, s) => `${x(s).toFixed(1)},${y(Math.min(v, yMax)).toFixed(1)}`).join(' ')}
                className="path-explorer__sample"
              />
            ))}

            {/* contributed reference */}
            <polyline points={contributedLine} className="path-explorer__contributed" />

            {/* median */}
            <path d={linePath((b) => b.p50)} className="path-explorer__median" />

            {/* target line */}
            {targetValue > 0 && targetValue <= yMax ? (
              <line x1={PAD.left} y1={y(targetValue)} x2={W - PAD.right} y2={y(targetValue)} className="path-explorer__target" />
            ) : null}

            {/* hover guide */}
            {hovered ? (
              <g>
                <line x1={x(hovered.step)} y1={PAD.top} x2={x(hovered.step)} y2={H - PAD.bottom} className="path-explorer__cursor" />
                <circle cx={x(hovered.step)} cy={y(hovered.p50)} r={4} className="path-explorer__cursor-dot" />
              </g>
            ) : null}
          </svg>

          {/* legend */}
          <ul className="path-explorer__legend">
            <li><span className="path-swatch path-swatch--median" /> Median (p50)</li>
            <li><span className="path-swatch path-swatch--inner" /> 50% range (p25–p75)</li>
            <li><span className="path-swatch path-swatch--outer" /> 90% range (p5–p95)</li>
            <li><span className="path-swatch path-swatch--contributed" /> Contributed</li>
          </ul>

          <p className="path-explorer__readout" role="status" aria-live="polite">
            {hovered
              ? `Year ${hovered.yearFraction.toFixed(1)} — median ${currency.format(hovered.p50)} · 90% range ${currency.format(hovered.p5)} to ${currency.format(hovered.p95)}`
              : 'Hover the chart to inspect the distribution at any point in time.'}
          </p>
        </div>
      </figure>

      {/* Stats */}
      <div className="path-explorer__stats">
        <Stat label="Median outcome" value={currency.format(result.endValues.p50)} tone="neutral" />
        <Stat label="90% range" value={`${compact.format(result.endValues.p5)} – ${compact.format(result.endValues.p95)}`} tone="neutral" />
        <Stat label="Total contributed" value={currency.format(result.totalContributed)} tone="neutral" />
        <Stat label="Median multiple" value={`${result.medianMultiple.toFixed(2)}×`} tone={result.medianMultiple >= 1 ? 'positive' : 'negative'} />
        <Stat
          label={targetValue > 0 ? `Reach ${compact.format(targetValue)}` : 'Set a target'}
          value={result.probabilityOfTarget != null ? pct.format(result.probabilityOfTarget) : '—'}
          tone={result.probabilityOfTarget != null && result.probabilityOfTarget >= 0.5 ? 'positive' : 'neutral'}
        />
      </div>

      <p className="path-explorer__disclaimer">
        Illustrative simulation on your assumptions only — not a forecast, not financial advice. Same inputs and
        seed always reproduce the same paths (deterministic). Runs entirely in your browser; no market data or
        database required.
      </p>
    </div>
  );
}

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

function Stat({ label, value, tone }: { label: string; value: string; tone: 'positive' | 'negative' | 'neutral' }) {
  return (
    <div className={`path-stat path-stat--${tone}`}>
      <span className="path-stat__label">{label}</span>
      <span className="path-stat__value">{value}</span>
    </div>
  );
}
