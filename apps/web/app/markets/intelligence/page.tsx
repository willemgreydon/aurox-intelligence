import { Section } from '../../../components/ui/section';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { MarketIntelligenceWorkstation } from '../../../components/markets/intelligence-workstation';
import { getMarketIntelligenceWorkstationModel } from '../../../server/services/market-intelligence-workstation-service';

export const dynamic = 'force-dynamic';

export default async function MarketsIntelligencePage() {
  const model = await getMarketIntelligenceWorkstationModel();

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero dashboard-section--compact market-intelligence-page__hero">
        <WorkstationPageHeader
          eyebrow="Markets / Intelligence"
          title="Unified Market Intelligence Workstation"
          description="Signals, news, risk, readiness, and lane context in one explainable surface."
          summary="Simulation mode active. No real orders are executed."
          statusLabel={model.systemState.systemRiskLevel}
          statusTone={model.systemState.degraded ? 'warning' : 'success'}
          meta={[
            { label: 'Assets', value: String(model.assets.length) },
            { label: 'System risk', value: model.systemState.systemRiskLevel },
            { label: 'Execution', value: 'Simulation only' },
          ]}
          actions={[
            { href: '/invest', label: 'Open invest' },
            { href: '/admin/live-readiness', label: 'Open readiness panel' },
          ]}
        />
      </Section>

      <Section className="dashboard-section dashboard-section--compact market-intelligence-page__content">
        <MarketIntelligenceWorkstation model={model} />
      </Section>
    </>
  );
}
