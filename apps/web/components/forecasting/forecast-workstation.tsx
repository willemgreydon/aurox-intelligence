import Link from 'next/link';
import { Card } from '../ui/card';
import type {
  ForecastWorkstationData,
  LaneComparisonRow,
  ForecastBiasBucket,
  ForecastWorkstationStat,
  ForecastWorkstationInsight,
} from '../../server/services/forecast-workstation-service';

type Props = {
  data: ForecastWorkstationData;
  forecastStack: React.ReactNode;
};

function statToneClass(tone: ForecastWorkstationStat['tone']): string {
  if (tone === 'positive') return 'forecast-stat__value--positive';
  if (tone === 'negative') return 'forecast-stat__value--negative';
  return '';
}

function insightToneClass(tone: ForecastWorkstationInsight['tone']): string {
  return `forecast-insight forecast-insight--${tone}`;
}

function StatsGrid({ stats }: { stats: ForecastWorkstationStat[] }) {
  if (stats.length === 0) return null;
  return (
    <div className="forecast-stat-grid">
      {stats.map((stat) => (
        <Card key={stat.id} className="forecast-stat">
          <div className="forecast-stat__label">{stat.label}</div>
          <div className={`forecast-stat__value ${statToneClass(stat.tone)}`}>{stat.value}</div>
          <p className="forecast-stat__detail">{stat.detail}</p>
        </Card>
      ))}
    </div>
  );
}

function LaneComparisonChart({ lanes }: { lanes: LaneComparisonRow[] }) {
  const maxCapital = Math.max(1, ...lanes.map((lane) => lane.capitalLimit));
  return (
    <div className="forecast-lane-chart">
      {lanes.map((lane) => {
        const limitWidth = Math.round((lane.capitalLimit / maxCapital) * 100);
        const allocatedWidth = lane.capitalLimit > 0
          ? Math.round((lane.allocatedCapital / maxCapital) * 100)
          : 0;
        return (
          <div key={lane.id} className="forecast-lane-row">
            <div className="forecast-lane-row__head">
              <span className="forecast-lane-row__label">{lane.label}</span>
              <span className={`status-pill status-pill--${lane.status === 'active' ? 'success' : lane.status === 'limited' ? 'warning' : 'neutral'}`}>
                {lane.status}
              </span>
            </div>
            <div className="forecast-lane-row__track" role="img" aria-label={`${lane.label}: ${lane.allocatedLabel} allocated of ${lane.capitalLimitLabel} capacity`}>
              <div className="forecast-lane-row__capacity" style={{ width: `${limitWidth}%` }}>
                <div className="forecast-lane-row__allocated" style={{ width: `${limitWidth > 0 ? Math.round((allocatedWidth / limitWidth) * 100) : 0}%` }} />
              </div>
            </div>
            <div className="forecast-lane-row__meta">
              <span>{lane.allocatedLabel} deployed</span>
              <span className="text-muted">{lane.availableLabel} available</span>
              <span className="text-muted">{lane.activePositions} pos · {lane.utilizationLabel} used</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BiasDistribution({ buckets, total }: { buckets: ForecastBiasBucket[]; total: number }) {
  return (
    <div className="forecast-bias">
      <div className="forecast-bias__bar" role="img" aria-label={`Forecast bias across ${total} assets`}>
        {buckets.map((bucket) =>
          bucket.pct > 0 ? (
            <span
              key={bucket.bias}
              className={`forecast-bias__segment forecast-bias__segment--${bucket.bias}`}
              style={{ width: `${bucket.pct}%` }}
            />
          ) : null,
        )}
      </div>
      <ul className="forecast-bias__legend">
        {buckets.map((bucket) => (
          <li key={bucket.bias} className="forecast-bias__legend-item">
            <span className={`forecast-bias__dot forecast-bias__dot--${bucket.bias}`} aria-hidden="true" />
            <span>{bucket.label}</span>
            <strong>{bucket.count}</strong>
            <span className="text-muted">{bucket.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ForecastWorkstation({ data, forecastStack }: Props) {
  const totalForecasts = data.forecasts.length;

  return (
    <>
      {data.stats.length > 0 ? (
        <section className="dashboard-section">
          <div className="shell-container">
            <StatsGrid stats={data.stats} />
          </div>
        </section>
      ) : null}

      {data.insights.length > 0 ? (
        <section className="dashboard-section">
          <div className="shell-container">
            <div className="forecast-insight-grid">
              {data.insights.map((insight) => (
                <div key={insight.id} className={insightToneClass(insight.tone)}>
                  <h3 className="forecast-insight__title">{insight.title}</h3>
                  <p className="forecast-insight__body">{insight.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="dashboard-section">
        <div className="shell-container">
          <div className="forecast-analytics-grid">
            <Card className="forecast-analytics-card">
              <div className="section__header">
                <div className="section__eyebrow">Lane comparison</div>
                <h2 className="section__title">Capital deployed by simulation lane</h2>
                <p className="section__description">
                  Allocated vs. available simulated capital across your trading lanes. Bars are scaled to the largest lane capacity.
                </p>
              </div>
              {data.lanes.length > 0 ? (
                <LaneComparisonChart lanes={data.lanes} />
              ) : (
                <div className="aurox-empty-state aurox-empty-state--inline">
                  <p className="aurox-empty-state__title">No lane data yet</p>
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                    {data.isAuthenticated
                      ? 'Start a simulation session to deploy capital into a lane.'
                      : 'Sign in and start a simulation session to compare lane investments.'}
                  </p>
                  <Link href="/invest/simulation" className="button button--secondary">Open simulation</Link>
                </div>
              )}
            </Card>

            <Card className="forecast-analytics-card">
              <div className="section__header">
                <div className="section__eyebrow">Forecast bias</div>
                <h2 className="section__title">Directional skew</h2>
                <p className="section__description">
                  Short-horizon directional bias across {totalForecasts} tracked asset{totalForecasts === 1 ? '' : 's'}. Context only — not a directive.
                </p>
              </div>
              {totalForecasts > 0 ? (
                <BiasDistribution buckets={data.biasDistribution} total={totalForecasts} />
              ) : (
                <div className="aurox-empty-state aurox-empty-state--inline">
                  <p className="aurox-empty-state__title">No forecasts available</p>
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                    Tracked assets need sufficient history before forecasts can be derived.
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="shell-container">
          <div className="section__header">
            <div className="section__eyebrow">Forecast stack</div>
            <h2 className="section__title">Explainable per-asset forecasts</h2>
            <p className="section__description">
              Deterministic, signal-driven forecasts. Each output is transparent about calibration maturity and risk assumptions.
            </p>
          </div>
          {forecastStack}
        </div>
      </section>
    </>
  );
}
