'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Section } from '../../ui/section';

type Bias = 'bullish' | 'bearish' | 'neutral';
type Filter = 'all' | 'gainers' | 'losers';

export type MoverItem = {
  symbol: string;
  name: string;
  priceLabel: string;
  changeLabel: string;
  changePercent: number | null;
  forecastBias: Bias | null;
};

export type ForecastHint = {
  symbol: string;
  directionalBias: Bias;
  confidence: number;
};

export type MoversLabels = {
  eyebrow: string;
  title: string;
  subtitle: string;
  empty: string;
  bullish: string;
  bearish: string;
  neutral: string;
  signalHeading: string;
  filterAll: string;
  filterGainers: string;
  filterLosers: string;
};

function biasLabel(bias: Bias | null, labels: MoversLabels): string | null {
  if (bias === 'bullish') return labels.bullish;
  if (bias === 'bearish') return labels.bearish;
  if (bias === 'neutral') return labels.neutral;
  return null;
}

/**
 * The biggest movers — scannable and filterable (All / Gainers / Losers). Each
 * row: rank, symbol + name (links to the asset), price, directional % change,
 * and the deterministic forecast chip with a confidence meter.
 */
export function MoversSignalsSection({
  movers,
  forecasts,
  labels,
}: {
  movers: MoverItem[];
  forecasts: ForecastHint[];
  labels: MoversLabels;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const confidenceBySymbol = useMemo(
    () => new Map(forecasts.map((f) => [f.symbol, f.confidence])),
    [forecasts],
  );

  const rows = useMemo(() => {
    const base = movers.filter((m) => {
      if (filter === 'gainers') return (m.changePercent ?? 0) > 0;
      if (filter === 'losers') return (m.changePercent ?? 0) < 0;
      return true;
    });
    return base.slice(0, 6);
  }, [movers, filter]);

  const filters: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: labels.filterAll },
    { id: 'gainers', label: labels.filterGainers },
    { id: 'losers', label: labels.filterLosers },
  ];

  return (
    <Section className="home-live home-movers">
      <header className="home-live__header home-live__header--split">
        <div>
          <div className="section__eyebrow">{labels.eyebrow}</div>
          <h2 className="section__title home-live__title">{labels.title}</h2>
          <p className="home-live__subtitle">{labels.subtitle}</p>
        </div>
        <div className="home-seg" role="tablist" aria-label={labels.title}>
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`home-seg__btn ${filter === f.id ? 'is-active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="home-live__empty">{labels.empty}</p>
      ) : (
        <ul className="home-movers__list">
          {rows.map((item, index) => {
            const up = (item.changePercent ?? 0) >= 0;
            const bias = biasLabel(item.forecastBias, labels);
            const confidence = confidenceBySymbol.get(item.symbol);
            return (
              <li key={item.symbol} className="home-movers__row">
                <span className="home-movers__rank tabular-nums" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Link href={`/stocks/${item.symbol}`} className="home-movers__cell home-movers__cell--asset">
                  <span className="home-movers__symbol">{item.symbol}</span>
                  <span className="home-movers__name">{item.name}</span>
                </Link>
                <span className="home-movers__cell home-movers__col-price tabular-nums">{item.priceLabel}</span>
                <span className={`home-movers__cell home-movers__col-change tabular-nums ${up ? 'is-positive' : 'is-negative'}`}>
                  <span className="home-movers__arrow" aria-hidden="true">{up ? '▲' : '▼'}</span>
                  {item.changeLabel}
                </span>
                <span className="home-movers__cell home-movers__col-signal">
                  {bias ? (
                    <span className="home-movers__signal">
                      <span className={`home-chip home-chip--${item.forecastBias}`}>{bias}</span>
                      {confidence !== undefined ? (
                        <span className="home-meter" title={`${Math.round(confidence * 100)}%`} aria-label={`${Math.round(confidence * 100)}%`}>
                          <span
                            className={`home-meter__fill home-meter__fill--${item.forecastBias}`}
                            style={{ width: `${Math.round(confidence * 100)}%` }}
                          />
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="home-chip home-chip--muted">—</span>
                  )}
                </span>
                <span className="home-movers__chevron" aria-hidden="true">→</span>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
