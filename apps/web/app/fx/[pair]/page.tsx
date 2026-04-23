import { DetailSlotCard } from '../../../components/asset/detail-slot-card';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { PriceHistoryPanel } from '../../../components/charts/price-history-panel';
import { CompactStatCard } from '../../../components/stats/compact-stat-card';
import { Section } from '../../../components/ui/section';
import { getFxDetailData } from '../../../server/services/fx-service';

export const dynamic = 'force-dynamic';

type FxDetailPageProps = {
  params: Promise<{
    pair: string;
  }>;
};

export default async function FxDetailPage({ params }: FxDetailPageProps) {
  const { pair } = await params;
  const fx = await getFxDetailData(pair.toUpperCase());

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow="FX detail workspace"
          title={fx.title}
          description={fx.description}
          summary={fx.notes[0] ?? 'Live pair quote status is being monitored for this workspace.'}
          statusLabel={fx.statusLabel}
          statusTone={fx.statusTone}
          meta={[
            { label: 'Last updated', value: fx.lastUpdatedLabel },
            { label: 'Quote', value: fx.priceLabel },
            { label: 'Move', value: fx.changeLabel },
          ]}
          actions={[
            { href: '/fx', label: 'Back to FX' },
            { href: '/dashboard', label: 'Open dashboard' },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <div className="analytics-strip">
          <CompactStatCard label="Current quote" value={fx.priceLabel} detail="Most recent live quote returned for this pair." />
          <CompactStatCard label="Daily move" value={fx.changeLabel} detail="Current session move for the monitored pair." />
          <CompactStatCard label="Provider source" value={fx.source ?? 'Unavailable'} detail="Current provider path for this pair read." />
          <CompactStatCard label="History window" value={fx.historyRangeLabel} detail="Current historical bar range returned for this pair workspace." />
        </div>
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <div className="analytics-main-grid">
          <PriceHistoryPanel
            title="Pair history"
            subtitle={fx.historySummary}
            points={fx.history}
            note="Daily FX pair bars are fetched through the provider boundary and rendered as a real chart surface."
            emptyMessage={fx.historyEmptyMessage}
            rail={
              <div className="side-metrics">
                <div className="side-metrics__item">
                  <span>History state</span>
                  <strong>{fx.historyStatusLabel}</strong>
                </div>
                <div className="side-metrics__item">
                  <span>30D high</span>
                  <strong>{fx.historyHighLabel}</strong>
                </div>
                <div className="side-metrics__item">
                  <span>30D low</span>
                  <strong>{fx.historyLowLabel}</strong>
                </div>
              </div>
            }
          />

          <div className="analytics-side-stack">
            <DetailSlotCard
              eyebrow="Pair notes"
              title="Current route state"
              description="Live quote and historical pair coverage are shown where supported and unsupported modules stay visibly partial."
              items={fx.notes}
            />
            <DetailSlotCard
              eyebrow="Next modules"
              title="Prepared FX detail slots"
              description="These blocks are reserved for future live read models."
              items={[
                'Pair-specific signal breakdown',
                'Macro context and central-bank watch',
                'Scenario probabilities and risk framing',
                'Cross-rate and volatility relationships',
              ]}
            />
          </div>
        </div>
      </Section>
    </>
  );
}
