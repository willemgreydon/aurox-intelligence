import Link from 'next/link';
import type { StocksOverviewViewModel } from '../../server/mappers/stocks-mapper';
import type { getMarketGraphData } from '../../server/services/market-graph-service';
import { Card } from '../ui/card';
import { Section } from '../ui/section';
import { StatusBadge } from '../ui/status-badge';
import { Disclosure } from '../ui/disclosure';
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
    explainability: {
      eyebrow: string;
      title: string;
      description: string;
      dataFlowEyebrow: string;
      kpis: Array<{ label: string; value: string }>;
      flow: Array<{ title: string; description: string; value: string }>;
    };
    home: {
      viewAllMarkets: string;
      featuredModuleCta: string;
      showMoreLanes: string;
      showAllCapabilities: string;
      finalCtaTitle: string;
      finalCtaSubtitle: string;
      workflowEyebrow: string;
      trustLineLabel: string;
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

export function HomeFancySections({ marketGraph, portfolioSnapshot, labels, common }: HomeFancySectionsProps) {
  const movers = [...marketGraph.assets]
    .sort((left, right) => (right.snapshot?.changePercent ?? -Infinity) - (left.snapshot?.changePercent ?? -Infinity))
    .slice(0, 6);

  const featureCards = labels.capabilities.items.slice(0, 3);
  const extraCapabilities = labels.capabilities.items.slice(3);
  const featuredModule = labels.modules.items[0];
  const flowSteps = labels.explainability.flow.slice(0, 4);

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

      {/* Market Pulse Preview — compact proof the system is live, one outbound link. */}
      <Section className="home-fancy home-fancy--pulse section section--tinted">
        <header className="home-fancy__header">
          <div className="section__eyebrow">Live pulse</div>
          <h2 className="section__title">Top movers right now</h2>
          <p className="section__description">
            A fast scan of the strongest live moves loaded into the workspace.
          </p>
        </header>

        <div className="home-fancy-pulse-grid">
          {movers.map((asset) => {
            const tone = toTone(asset.snapshot?.changePercent ?? null);
            const moveLabel =
              typeof asset.snapshot?.changePercent === 'number'
                ? `${asset.snapshot.changePercent > 0 ? '+' : ''}${asset.snapshot.changePercent.toFixed(2)}%`
                : common.unavailable;
            const directionWord = tone === 'up' ? 'up' : tone === 'down' ? 'down' : 'unchanged';
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
                    <span
                      className={`home-pulse-card__move home-pulse-card__move--${tone}`}
                      aria-label={`${asset.symbol} ${directionWord} ${moveLabel}`}
                    >
                      {moveLabel}
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

        <div className="home-fancy__footer-link">
          <Link href="/market" className="module-card__link">
            {labels.home.viewAllMarkets}
          </Link>
        </div>
      </Section>

      {/* What Aurox Does — 3 feature cards, rest behind a disclosure. */}
      <Section className="home-fancy home-fancy--capabilities">
        <header className="home-fancy__header">
          <div className="section__eyebrow">{labels.capabilities.eyebrow}</div>
          <h2 className="section__title">{labels.capabilities.title}</h2>
          <p className="section__description">{labels.capabilities.description}</p>
        </header>

        <div className="home-feature-grid">
          {featureCards.map((item) => (
            <Card key={item.title} className="home-feature-card">
              <article>
                <h3 className="home-feature-card__title">{item.title}</h3>
                <p className="home-feature-card__body">{item.description}</p>
              </article>
            </Card>
          ))}
        </div>

        {extraCapabilities.length > 0 ? (
          <Disclosure summary={labels.home.showAllCapabilities} className="home-fancy__disclosure">
            <div className="home-feature-grid">
              {extraCapabilities.map((item) => (
                <Card key={item.title} className="home-feature-card" tone="ghost">
                  <article>
                    <h3 className="home-feature-card__title">{item.title}</h3>
                    <p className="home-feature-card__body">{item.description}</p>
                  </article>
                </Card>
              ))}
            </div>
          </Disclosure>
        ) : null}
      </Section>

      {/* Workflow strip — Data → Signals → Risk → Decision. */}
      <Section className="home-fancy home-fancy--workflow section section--tinted">
        <header className="home-fancy__header">
          <div className="section__eyebrow">{labels.home.workflowEyebrow}</div>
          <h2 className="section__title">{labels.explainability.title}</h2>
        </header>
        <ol className="home-workflow-strip">
          {flowSteps.map((step, index) => (
            <li key={step.title} className="home-workflow-step">
              <span className="home-workflow-step__index" aria-hidden="true">
                {index + 1}
              </span>
              <h3 className="home-workflow-step__title">{step.title}</h3>
              <span className="home-workflow-step__value">{step.value}</span>
            </li>
          ))}
        </ol>
      </Section>

      {/* One featured module — a single guided next step, not a competing grid. */}
      {featuredModule ? (
        <Section className="home-fancy home-fancy--featured">
          <Card tone="accent" className="home-featured-band">
            <div className="home-featured-band__content">
              <div className="module-card__eyebrow">{featuredModule.eyebrow}</div>
              <h2 className="section__title">{featuredModule.title}</h2>
              <p className="home-featured-band__body">{featuredModule.description}</p>
            </div>
            <div className="home-featured-band__action">
              <Link href={featuredModule.href} className="button button--primary">
                {labels.home.featuredModuleCta}
              </Link>
            </div>
          </Card>
        </Section>
      ) : null}

      {/* Compact trust line — one claim + 3 method chips, full method behind disclosure. */}
      <Section className="home-fancy home-fancy--trust section section--tinted">
        <div className="home-trust-line">
          <span className="home-trust-line__label">{labels.home.trustLineLabel}</span>
          <div className="home-trust-line__chips">
            {labels.explainability.kpis.map((kpi) => (
              <span key={kpi.value} className="home-trust-line__chip">
                <strong>{kpi.value}</strong>
                <span>{kpi.label}</span>
              </span>
            ))}
          </div>
        </div>

        <Disclosure summary={labels.lanes.eyebrow} className="home-fancy__disclosure">
          <div className="home-lane-mosaic">
            {labels.lanes.items.map((lane) => (
              <Card key={lane.title} className="home-lane-card" tone="ghost">
                <article>
                  <div className="home-lane-card__head">
                    <div className="module-card__eyebrow">{lane.label}</div>
                    <StatusBadge tone={toStatusTone(lane.statusLabel)}>{lane.statusLabel}</StatusBadge>
                  </div>
                  <h3 className="home-lane-card__title">{lane.title}</h3>
                  <p className="home-lane-card__body">{lane.description}</p>
                  <Link href={lane.href} className="module-card__link">
                    {labels.lanes.enterLane}
                  </Link>
                </article>
              </Card>
            ))}
          </div>
        </Disclosure>
      </Section>

      {/* Single closing CTA. */}
      <Section className="home-fancy home-fancy--final">
        <Card tone="accent" className="home-final-cta">
          <h2 className="section__title">{labels.home.finalCtaTitle}</h2>
          <p className="home-final-cta__body">{labels.home.finalCtaSubtitle}</p>
          <Link href="/invest/simulation" className="button button--primary">
            {labels.home.featuredModuleCta}
          </Link>
        </Card>
      </Section>
    </>
  );
}
