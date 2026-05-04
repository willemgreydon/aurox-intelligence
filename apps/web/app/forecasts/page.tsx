import { WorkstationPageHeader } from '../../components/asset/workstation-page-header';
import { InsightCallout } from '../../components/analytics/insight-callout';
import { ForecastSummaryCard } from '../../components/dashboard/forecast-summary-card';
import { AnalysisToolbar } from '../../components/filters/analysis-toolbar';
import { HorizonComparisonBlock } from '../../components/forecasting/horizon-comparison-block';
import { ScenarioCard } from '../../components/forecasting/scenario-card';
import { Section } from '../../components/ui/section';
import { getMessages } from '../../lib/i18n/messages';
import { getRequestLocale } from '../../server/i18n/locale';
import { getForecastsPageData } from '../../server/services/analysis-service';

export const dynamic = 'force-dynamic';

export default async function ForecastsPage() {
  const [data, locale] = await Promise.all([getForecastsPageData(), getRequestLocale()]);
  const messages = getMessages(locale);
  const lead = data.forecasts[0];
  const horizonItems = lead
    ? [
        { horizon: 'Short', bias: lead.biasLabel, confidence: lead.confidenceLabel },
        {
          horizon: 'Medium & Long',
          bias: 'Not yet modelled',
          confidence: 'Multi-horizon forecasting is planned for a future release.',
        },
      ]
    : [];

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow={messages.shell.nav.forecasts}
          title={data.overview.title}
          description={data.overview.description}
          summary={data.overview.summary}
          statusLabel={data.overview.statusLabel}
          statusTone={data.overview.statusTone}
          meta={[
            { label: messages.common.lastUpdated, value: data.overview.lastUpdatedLabel },
            { label: 'Tracked forecasts', value: String(data.forecasts.length) },
          ]}
          actions={[
            { href: '/signals', label: `View ${messages.shell.nav.signals.toLowerCase()}` },
            { href: '/dashboard', label: messages.home.openDashboard },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <AnalysisToolbar
          title="Explainable forecast stack"
          subtitle="Forecast outputs are deterministic, signal-driven, and explicitly transparent about calibration maturity and risk assumptions."
        />
      </Section>

      <Section className="dashboard-section">
        {data.forecasts.length > 0 ? (
          <div className="dashboard-forecast-grid">
              {data.forecasts.map((forecast) => (
              <ForecastSummaryCard
                key={forecast.assetId}
                forecast={{
                  ...forecast,
                  assetClass: 'stock',
                  symbol: forecast.assetId,
                  keyDriverSummary: forecast.keyDrivers.join(' | '),
                  riskSummary: forecast.riskFactors.join(' | '),
                }}
              />
            ))}
          </div>
        ) : (
          <div className="table-panel__empty">No tracked assets currently have sufficient history to derive forecasts.</div>
        )}
      </Section>

      {lead ? (
        <Section className="dashboard-section dashboard-section--tinted">
          <div className="analytics-two-grid">
            <ScenarioCard
              title={`${lead.assetName} scenario stack`}
              description={lead.scenarioSummary}
              scenarios={[
                { label: 'Bullish', value: Math.round(lead.scenarioWeights.bullish * 100), tone: 'positive' },
                { label: 'Base', value: Math.round(lead.scenarioWeights.base * 100), tone: 'neutral' },
                { label: 'Bearish', value: Math.round(lead.scenarioWeights.bearish * 100), tone: 'negative' },
              ]}
              drivers={lead.keyDrivers}
              risks={lead.riskFactors}
            />
            <div className="analytics-side-stack">
              <HorizonComparisonBlock
                items={horizonItems}
              />
              <InsightCallout
                title="Forecasts remain explainable by design"
                body="Each forecast is derived from observable signal inputs and disclosed with confidence and scenario weights, so interpretation stays auditable."
              />
            </div>
          </div>
        </Section>
      ) : null}
    </>
  );
}
