import Link from 'next/link';
import { Section } from '../../ui/section';

type Bias = 'bullish' | 'bearish' | 'neutral';

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
};

function biasLabel(bias: Bias | null, labels: MoversLabels): string | null {
  if (bias === 'bullish') return labels.bullish;
  if (bias === 'bearish') return labels.bearish;
  if (bias === 'neutral') return labels.neutral;
  return null;
}

/**
 * The biggest movers, scannable: symbol + name, price, % change (color +
 * tabular), and the deterministic forecast bias chip. Each row links to the
 * asset workspace — a decision starting point, not a marketing tile.
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
  const confidenceBySymbol = new Map(forecasts.map((f) => [f.symbol, f.confidence]));
  const rows = movers.slice(0, 6);

  return (
    <Section className="section home-live home-movers">
      <div className="shell-container">
        <header className="home-live__header">
          <div className="section__eyebrow">{labels.eyebrow}</div>
          <h2 className="section__title home-live__title">{labels.title}</h2>
          <p className="home-live__subtitle">{labels.subtitle}</p>
        </header>

        {rows.length === 0 ? (
          <p className="home-live__empty">{labels.empty}</p>
        ) : (
          <ul className="home-movers__list">
            <li className="home-movers__row home-movers__row--head" aria-hidden="true">
              <span />
              <span className="home-movers__col-price">{/* price */}</span>
              <span className="home-movers__col-change">{/* change */}</span>
              <span className="home-movers__col-signal">{labels.signalHeading}</span>
            </li>
            {rows.map((item) => {
              const up = (item.changePercent ?? 0) >= 0;
              const bias = biasLabel(item.forecastBias, labels);
              const confidence = confidenceBySymbol.get(item.symbol);
              return (
                <li key={item.symbol} className="home-movers__row">
                  <Link href={`/stocks/${item.symbol}`} className="home-movers__cell home-movers__cell--asset">
                    <span className="home-movers__symbol">{item.symbol}</span>
                    <span className="home-movers__name">{item.name}</span>
                  </Link>
                  <span className="home-movers__cell home-movers__col-price tabular-nums">{item.priceLabel}</span>
                  <span className={`home-movers__cell home-movers__col-change tabular-nums ${up ? 'is-positive' : 'is-negative'}`}>
                    {item.changeLabel}
                  </span>
                  <span className="home-movers__cell home-movers__col-signal">
                    {bias ? (
                      <span className={`home-chip home-chip--${item.forecastBias}`}>
                        {bias}
                        {confidence !== undefined ? (
                          <span className="home-chip__conf tabular-nums">{Math.round(confidence * 100)}%</span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="home-chip home-chip--muted">—</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Section>
  );
}
