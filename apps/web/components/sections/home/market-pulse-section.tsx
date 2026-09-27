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
};

function formatPercent(value: number | null, unavailable: string): string {
  if (value === null || Number.isNaN(value)) return unavailable;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Market breadth at a glance — advancers vs decliners as a proportional bar plus
 * the average move and the day's strongest / weakest symbol. First data band and
 * the page's primary heading (h1).
 */
export function MarketPulseSection({
  snapshot,
  labels,
}: {
  snapshot: MarketPulseSnapshot;
  labels: MarketPulseLabels;
}) {
  const total = snapshot.advancers + snapshot.decliners + snapshot.unchanged;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  const isEmpty = total === 0;
  const avgTone = (snapshot.averageMovePercent ?? 0) >= 0 ? 'is-positive' : 'is-negative';

  return (
    <Section className="home-live home-pulse">
      <header className="home-live__header">
          <div className="section__eyebrow">{labels.eyebrow}</div>
          <h1 className="section__title home-live__title">{labels.title}</h1>
        </header>

        {isEmpty ? (
          <p className="home-live__empty">{labels.empty}</p>
        ) : (
          <div className="home-pulse__body">
            <div className="home-pulse__breadth" role="img" aria-label={`${snapshot.advancers} ${labels.advancing}, ${snapshot.decliners} ${labels.declining}, ${snapshot.unchanged} ${labels.unchanged}`}>
              <div className="home-pulse__bar">
                <span className="home-pulse__seg home-pulse__seg--up" style={{ width: `${pct(snapshot.advancers)}%` }} />
                <span className="home-pulse__seg home-pulse__seg--flat" style={{ width: `${pct(snapshot.unchanged)}%` }} />
                <span className="home-pulse__seg home-pulse__seg--down" style={{ width: `${pct(snapshot.decliners)}%` }} />
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
                <dd className="is-positive">{snapshot.strongestSymbol ?? labels.unavailable}</dd>
              </div>
              <div className="home-pulse__stat">
                <dt>{labels.weakest}</dt>
                <dd className="is-negative">{snapshot.weakestSymbol ?? labels.unavailable}</dd>
              </div>
            </dl>
          </div>
        )}
    </Section>
  );
}
