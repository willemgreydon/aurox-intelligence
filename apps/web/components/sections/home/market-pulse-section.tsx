import Link from 'next/link';
import { Section } from '../../ui/section';

export type MarketPulseSnapshot = {
  advancers: number;
  decliners: number;
  unchanged: number;
  averageMovePercent: number | null;
  strongestSymbol: string | null;
  weakestSymbol: string | null;
};

export type MarketPulseLabels = {
  eyebrow: string;
  title: string;
  advancing: string;
  declining: string;
  unchanged: string;
  averageMove: string;
  strongest: string;
  weakest: string;
  empty: string;
  unavailable: string;
  breadth: string;
  instruments: string;
  sentimentRiskOn: string;
  sentimentConstructive: string;
  sentimentMixed: string;
  sentimentRiskOff: string;
};

function formatPercent(value: number | null, unavailable: string): string {
  if (value === null || Number.isNaN(value)) return unavailable;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function deriveSentiment(breadth: number, labels: MarketPulseLabels): { label: string; tone: 'positive' | 'neutral' | 'negative' } {
  if (breadth >= 0.6) return { label: labels.sentimentRiskOn, tone: 'positive' };
  if (breadth >= 0.52) return { label: labels.sentimentConstructive, tone: 'positive' };
  if (breadth >= 0.45) return { label: labels.sentimentMixed, tone: 'neutral' };
  return { label: labels.sentimentRiskOff, tone: 'negative' };
}

/**
 * Market breadth at a glance — a derived risk-on/off regime badge, a proportional
 * breadth bar with per-segment tooltips, and the average move plus clickable
 * strongest / weakest symbols. First data band and the page's primary heading.
 */
export function MarketPulseSection({
  snapshot,
  labels,
}: {
  snapshot: MarketPulseSnapshot;
  labels: MarketPulseLabels;
}) {
  const total = snapshot.advancers + snapshot.decliners + snapshot.unchanged;
  const decidable = snapshot.advancers + snapshot.decliners;
  const breadth = decidable > 0 ? snapshot.advancers / decidable : 0.5;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const isEmpty = total === 0;
  const sentiment = deriveSentiment(breadth, labels);
  const avgTone = (snapshot.averageMovePercent ?? 0) >= 0 ? 'is-positive' : 'is-negative';

  return (
    <Section className="home-live home-pulse">
      <header className="home-live__header home-live__header--split">
        <div>
          <div className="section__eyebrow">{labels.eyebrow}</div>
          <h1 className="section__title home-live__title">{labels.title}</h1>
        </div>
        {!isEmpty ? (
          <div className={`home-pulse__sentiment home-pulse__sentiment--${sentiment.tone}`}>
            <span className="home-pulse__sentiment-dot" aria-hidden="true" />
            <span className="home-pulse__sentiment-label">{sentiment.label}</span>
            <span className="home-pulse__sentiment-value tabular-nums">{Math.round(breadth * 100)}%</span>
          </div>
        ) : null}
      </header>

      {isEmpty ? (
        <p className="home-live__empty">{labels.empty}</p>
      ) : (
        <div className="home-pulse__body">
          <div className="home-pulse__breadth">
            <div className="home-pulse__bar-head">
              <span className="home-pulse__bar-label">{labels.breadth}</span>
              <span className="home-pulse__bar-total tabular-nums">
                {total} {labels.instruments}
              </span>
            </div>
            <div className="home-pulse__bar" role="img" aria-label={`${snapshot.advancers} ${labels.advancing}, ${snapshot.unchanged} ${labels.unchanged}, ${snapshot.decliners} ${labels.declining}`}>
              <span className="home-pulse__seg home-pulse__seg--up" style={{ width: `${pct(snapshot.advancers)}%` }} title={`${snapshot.advancers} ${labels.advancing}`} />
              <span className="home-pulse__seg home-pulse__seg--flat" style={{ width: `${pct(snapshot.unchanged)}%` }} title={`${snapshot.unchanged} ${labels.unchanged}`} />
              <span className="home-pulse__seg home-pulse__seg--down" style={{ width: `${pct(snapshot.decliners)}%` }} title={`${snapshot.decliners} ${labels.declining}`} />
            </div>
            <div className="home-pulse__legend">
              <span className="home-pulse__legend-item is-positive">
                <strong className="tabular-nums">{snapshot.advancers}</strong> {labels.advancing}
              </span>
              <span className="home-pulse__legend-item is-muted">
                <strong className="tabular-nums">{snapshot.unchanged}</strong> {labels.unchanged}
              </span>
              <span className="home-pulse__legend-item is-negative">
                <strong className="tabular-nums">{snapshot.decliners}</strong> {labels.declining}
              </span>
            </div>
          </div>

          <dl className="home-pulse__stats">
            <div className="home-pulse__stat">
              <dt>{labels.averageMove}</dt>
              <dd className={`tabular-nums ${avgTone}`}>{formatPercent(snapshot.averageMovePercent, labels.unavailable)}</dd>
            </div>
            <div className="home-pulse__stat">
              <dt>{labels.strongest}</dt>
              <dd>
                {snapshot.strongestSymbol ? (
                  <Link href={`/stocks/${snapshot.strongestSymbol}`} className="home-pulse__ticker is-positive">
                    {snapshot.strongestSymbol}
                  </Link>
                ) : (
                  <span className="is-muted">{labels.unavailable}</span>
                )}
              </dd>
            </div>
            <div className="home-pulse__stat">
              <dt>{labels.weakest}</dt>
              <dd>
                {snapshot.weakestSymbol ? (
                  <Link href={`/stocks/${snapshot.weakestSymbol}`} className="home-pulse__ticker is-negative">
                    {snapshot.weakestSymbol}
                  </Link>
                ) : (
                  <span className="is-muted">{labels.unavailable}</span>
                )}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </Section>
  );
}
