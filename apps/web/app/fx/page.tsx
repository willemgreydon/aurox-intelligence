import type { TableColumn } from '../../lib/dashboard/analytics-fixtures';
import { DetailSlotCard } from '../../components/asset/detail-slot-card';
import { WorkstationPageHeader } from '../../components/asset/workstation-page-header';
import { WorkspaceLinkCard } from '../../components/asset/workspace-link-card';
import { InsightCallout } from '../../components/analytics/insight-callout';
import { ComparisonBarPanel } from '../../components/charts/comparison-bar-panel';
import { DistributionChartCard } from '../../components/charts/distribution-chart-card';
import { AnalysisToolbar } from '../../components/filters/analysis-toolbar';
import { CompactStatCard } from '../../components/stats/compact-stat-card';
import { AnalyticsTable } from '../../components/tables/analytics-table';
import { Section } from '../../components/ui/section';
import { buildChangeDistribution, buildComparisonBars, countDirectionalMoves } from '../../lib/market-surface';
import { getFxOverviewData } from '../../server/services/fx-service';

export const dynamic = 'force-dynamic';

type FxRow = {
  pair: string;
  quote: string;
  move: string;
  bias: string;
  freshness: string;
};

const trackedPairColumns: Array<TableColumn<FxRow>> = [
  { key: 'pair', label: 'Pair' },
  { key: 'quote', label: 'Quote', align: 'right' },
  { key: 'move', label: 'Move', align: 'right' },
  { key: 'bias', label: 'Bias' },
  { key: 'freshness', label: 'Freshness', align: 'right' },
];

export default async function FxPage() {
  const fx = await getFxOverviewData();
  const directionalCounts = countDirectionalMoves(fx.trackedPairs.map((item) => item.changePercent));
  const strongestBars = buildComparisonBars(
    fx.strongestPairs.map((item) => ({
      label: item.pair,
      value: item.changePercent,
    })),
    4,
  );
  const moveDistribution = buildChangeDistribution(fx.trackedPairs.map((item) => item.changePercent));
  const trackedRows = fx.trackedPairs.map((item) => ({
    pair: item.pair,
    quote: item.priceLabel,
    move: item.changeLabel,
    bias: item.directionalBias ?? 'Pending',
    freshness: item.freshnessLabel,
  }));

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow="FX workstation"
          title={fx.title}
          description={fx.description}
          summary={fx.freshnessSummary}
          statusLabel={fx.statusLabel}
          statusTone={fx.statusTone}
          meta={[
            { label: 'Last updated', value: fx.lastUpdatedLabel },
            { label: 'Freshness', value: fx.freshnessLabel },
            { label: 'Provider path', value: fx.metrics.find((metric) => metric.id === 'provider')?.value ?? 'Unavailable' },
          ]}
          actions={[
            { href: '/dashboard', label: 'Open dashboard' },
            { href: '/stocks', label: 'Review stocks' },
            { href: '/admin', label: 'Check admin' },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <AnalysisToolbar
          title="Pair monitoring, trend reading, and cross-rate workspaces"
          subtitle="This route is prepared for deeper pair history, regime panels, and macro context while staying honest about what the current provider path can support today."
        />
      </Section>

      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Pair summary</div>
            <h2 className="dashboard-section-heading__title">Tracked pairs, directional spread, and forecast overlap</h2>
          </div>
        </header>
        <div className="analytics-strip">
          <CompactStatCard
            label="Positive pairs"
            value={String(directionalCounts.positive)}
            detail="Monitored pairs currently printing a positive session move."
          />
          <CompactStatCard
            label="Negative pairs"
            value={String(directionalCounts.negative)}
            detail="Monitored pairs currently moving lower inside the tracked set."
          />
          <CompactStatCard
            label="Forecast-linked"
            value={String(fx.trackedPairs.filter((item) => item.directionalBias !== null).length)}
            detail="Pairs already intersecting with persisted FX forecast coverage."
          />
          <CompactStatCard
            label="Unavailable quotes"
            value={String(directionalCounts.unknown)}
            detail="Pairs with partial quote state that still require operational attention."
          />
        </div>
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <div className="analytics-main-grid">
          <ComparisonBarPanel
            title="Strongest monitored pair trends"
            subtitle="Largest current pair moves across the tracked FX set."
            items={strongestBars}
          />
          <div className="analytics-side-stack">
            <DistributionChartCard
              title="Pair move distribution"
              subtitle="Current clustering of pair moves across the monitored set."
              buckets={moveDistribution}
            />
            <InsightCallout title="FX route is provider-backed" body={fx.insights[0] ?? 'The FX surface is already reaching through the provider boundary for live pair snapshots.'} />
          </div>
        </div>
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-two-grid analytics-two-grid--tables">
          <AnalyticsTable
            title="Tracked pair watchlist"
            subtitle="Operational pair table for quote, move, directional bias, and freshness."
            columns={trackedPairColumns}
            rows={trackedRows}
            emptyMessage={fx.emptyStateMessage ?? 'No FX pairs are currently available.'}
          />
          <DetailSlotCard
            eyebrow="Macro interpretation"
            title="FX insight and regime area"
            description="This block is reserved for macro commentary, volatility summaries, and cross-rate interpretation once those reads are persisted."
            items={fx.insights}
          />
        </div>
      </Section>

      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Pair workspaces</div>
            <h2 className="dashboard-section-heading__title">Detail-ready pair routes for deeper trend and scenario review</h2>
          </div>
        </header>
        <div className="dashboard-module-grid">
          {fx.trackedPairs.slice(0, 3).map((item) => (
            <WorkspaceLinkCard
              key={item.pair}
              eyebrow="Pair workspace"
              title={item.pair}
              description={`Detail route for quote context, scenario framing, signal overlays, and macro slots for ${item.pair}.`}
              href={`/fx/${item.pair.replace('/', '')}`}
              linkLabel="Open pair"
              statusLabel={item.directionalBias ? 'Forecast-linked' : 'Live only'}
              statusTone={item.directionalBias ? 'success' : 'info'}
              meta={[
                { label: 'Quote', value: item.priceLabel },
                { label: 'Move', value: item.changeLabel },
                { label: 'Freshness', value: item.freshnessLabel },
              ]}
            />
          ))}
        </div>
      </Section>
    </>
  );
}
