import Link from 'next/link';
import type { StocksOverviewViewModel } from '../../server/mappers/stocks-mapper';
import type { getMarketGraphData } from '../../server/services/market-graph-service';
import { Card } from '../ui/card';
import { Section } from '../ui/section';
import { StatusBadge } from '../ui/status-badge';
import { CompactStatCard } from '../stats/compact-stat-card';

type HomeFancySectionsProps = {
  stocks: StocksOverviewViewModel;
  marketGraph: Awaited<ReturnType<typeof getMarketGraphData>>;
  portfolioSnapshot: {
    portfolioValue: number;
    investedCapital: number;
    unrealizedPnl: number;
    realizedPnl: number;
  } | null;
  labels: {
    lanes: {
      eyebrow: string;
      title: string;
      description: string;
      enterLane: string;
      items: Array<{
        label: string;
        title: string;
        description: string;
        features: string[];
        href: string;
        statusLabel: string;
      }>;
    };
    capabilities: {
      eyebrow: string;
      title: string;
      description: string;
      items: Array<{
        title: string;
        description: string;
      }>;
    };
    modules: {
      eyebrow: string;
      title: string;
      description: string;
      enterModule: string;
      items: Array<{
        eyebrow: string;
        title: string;
        description: string;
        href: string;
      }>;
    };
  };
  common: {
    unavailable: string;
  };
};

function toTone(value: number | null | undefined): 'up' | 'down' | 'flat' {
  if (typeof value !== 'number') {
    return 'flat';
  }
  if (value > 0) {
    return 'up';
  }
  if (value < 0) {
    return 'down';
  }
  return 'flat';
}

function toStatusTone(statusLabel: string): 'success' | 'warning' | 'danger' | 'info' {
  const normalized = statusLabel.toLowerCase();
  if (normalized.includes('warning')) {
    return 'warning';
  }
  if (normalized.includes('danger') || normalized.includes('risk') || normalized.includes('blocked')) {
    return 'danger';
  }
  if (normalized.includes('gated') || normalized.includes('planned')) {
    return 'info';
  }
  return 'success';
}

function toSparklinePath(values: number[]): string {
  if (values.length < 2) {
    return '';
  }
  const width = 140;
  const height = 42;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export function HomeFancySections({ stocks, marketGraph, portfolioSnapshot, labels, common }: HomeFancySectionsProps) {
  const movers = [...marketGraph.assets]
    .sort((left, right) => (right.snapshot?.changePercent ?? -Infinity) - (left.snapshot?.changePercent ?? -Infinity))
    .slice(0, 6);

  return (
    <>
      {portfolioSnapshot ? (
        <Section className="home-fancy home-fancy--portfolio">
          <header className="home-fancy__header">
            <div className="section__eyebrow">Portfolio metrics</div>
            <h2 className="section__title">Simulation portfolio pulse</h2>
            <p className="section__description">
              Live snapshot of your simulated portfolio value and deployed capital.
            </p>
          </header>
          <div className="analytics-strip">
            <CompactStatCard
              label="Portfolio value"
              value={`$${portfolioSnapshot.portfolioValue.toFixed(2)}`}
              valueTone={portfolioSnapshot.portfolioValue > 0 ? 'positive' : portfolioSnapshot.portfolioValue < 0 ? 'negative' : 'neutral'}
              detail="Current market value of active simulated positions."
            />
            <CompactStatCard
              label="Invested capital"
              value={`$${portfolioSnapshot.investedCapital.toFixed(2)}`}
              valueTone={portfolioSnapshot.investedCapital > 0 ? 'positive' : portfolioSnapshot.investedCapital < 0 ? 'negative' : 'neutral'}
              detail="Capital currently allocated across open positions."
            />
            <CompactStatCard
              label="Unrealized P&L"
              value={`${portfolioSnapshot.unrealizedPnl >= 0 ? '+' : ''}$${Math.abs(portfolioSnapshot.unrealizedPnl).toFixed(2)}`}
              valueTone={portfolioSnapshot.unrealizedPnl > 0 ? 'positive' : portfolioSnapshot.unrealizedPnl < 0 ? 'negative' : 'neutral'}
              detail="Mark-to-market gain/loss on currently open positions."
            />
            <CompactStatCard
              label="Realized P&L"
              value={`${portfolioSnapshot.realizedPnl >= 0 ? '+' : ''}$${Math.abs(portfolioSnapshot.realizedPnl).toFixed(2)}`}
              valueTone={portfolioSnapshot.realizedPnl > 0 ? 'positive' : portfolioSnapshot.realizedPnl < 0 ? 'negative' : 'neutral'}
              detail="Locked-in gain/loss from completed simulated trades."
            />
          </div>
        </Section>
      ) : null}

      <Section className="home-fancy home-fancy--pulse section section--tinted">
        <header className="home-fancy__header">
          <div className="section__eyebrow">Live pulse</div>
          <h2 className="section__title">Momentum radar and top movers</h2>
          <p className="section__description">
            Fast scan of the strongest live moves loaded into the market workspace.
          </p>
        </header>

        <div className="home-fancy-pulse-grid">
          {movers.map((asset) => {
            const tone = toTone(asset.snapshot?.changePercent ?? null);
            const sparklinePath = toSparklinePath(
              asset.history.slice(-20).map((point: { close: number }) => point.close),
            );

            return (
              <Card key={asset.assetId} className={`home-pulse-card home-pulse-card--${tone}`}>
                <article>
                  <div className="home-pulse-card__meta">
                    <div>
                      <div className="home-pulse-card__symbol">{asset.symbol}</div>
                      <h3>{asset.name}</h3>
                    </div>
                    <span className={`home-pulse-card__move home-pulse-card__move--${tone}`}>
                      {typeof asset.snapshot?.changePercent === 'number'
                        ? `${asset.snapshot.changePercent > 0 ? '+' : ''}${asset.snapshot.changePercent.toFixed(2)}%`
                        : common.unavailable}
                    </span>
                  </div>
                  <div className="home-pulse-card__price">
                    {typeof asset.snapshot?.price === 'number'
                      ? `$${asset.snapshot.price.toFixed(2)}`
                      : common.unavailable}
                  </div>
                  <div className="home-pulse-card__sparkline" aria-hidden="true">
                    {sparklinePath ? (
                      <svg viewBox="0 0 140 42" preserveAspectRatio="none">
                        <path d={sparklinePath} />
                      </svg>
                    ) : (
                      <span />
                    )}
                  </div>
                </article>
              </Card>
            );
          })}
        </div>
      </Section>

      <Section className="home-fancy home-fancy--lanes">
        <header className="home-fancy__header">
          <div className="section__eyebrow">{labels.lanes.eyebrow}</div>
          <h2 className="section__title">{labels.lanes.title}</h2>
          <p className="section__description">{labels.lanes.description}</p>
        </header>
        <div className="home-lane-mosaic">
          {labels.lanes.items.slice(0, 3).map((lane) => (
            <Card key={lane.title} className="home-lane-card" tone="ghost">
              <article>
                <div className="home-lane-card__head">
                  <div className="module-card__eyebrow">{lane.label}</div>
                  <StatusBadge tone={toStatusTone(lane.statusLabel)}>{lane.statusLabel}</StatusBadge>
                </div>
                <h3 className="home-lane-card__title">{lane.title}</h3>
                <p className="home-lane-card__body">{lane.description}</p>
                <div className="home-lane-card__pills">
                  {lane.features.slice(0, 3).map((feature) => (
                    <span key={feature} className="pill">
                      {feature}
                    </span>
                  ))}
                </div>
                <Link href={lane.href} className="module-card__link">
                  {labels.lanes.enterLane}
                </Link>
              </article>
            </Card>
          ))}
        </div>
      </Section>

      <Section className="home-fancy home-fancy--ops section section--tinted">
        <header className="home-fancy__header">
          <div className="section__eyebrow home-ops-header__eyebrow">{labels.modules.eyebrow}</div>
          <h2 className="section__title home-ops-header__title">{labels.modules.title}</h2>
          <p className="section__description home-ops-header__description">{labels.modules.description}</p>
        </header>
        <div className="home-ops-grid">
          <Card className="home-ops-card">
            <h3 className="home-ops-card__title">{labels.capabilities.title}</h3>
            <p className="home-ops-card__body">{labels.capabilities.description}</p>
            <div className="home-ops-card__list">
              {labels.capabilities.items.slice(0, 4).map((item) => (
                <article key={item.title} className="home-ops-card__item">
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </Card>
          <div className="home-ops-module-list">
            {labels.modules.items.slice(0, 4).map((module) => (
              <Card key={module.title} className="home-ops-module" tone="ghost">
                <article>
                  <div className="module-card__eyebrow">{module.eyebrow}</div>
                  <h3>{module.title}</h3>
                  <p>{module.description}</p>
                  <Link href={module.href} className="module-card__link">
                    {labels.modules.enterModule}
                  </Link>
                </article>
              </Card>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
