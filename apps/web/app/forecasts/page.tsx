import { WorkstationPageHeader } from '../../components/asset/workstation-page-header';
import { InsightCallout } from '../../components/analytics/insight-callout';
import { ForecastSummaryCard } from '../../components/dashboard/forecast-summary-card';
import { AnalysisToolbar } from '../../components/filters/analysis-toolbar';
import { HorizonComparisonBlock } from '../../components/forecasting/horizon-comparison-block';
import { ScenarioCard } from '../../components/forecasting/scenario-card';
import { Section } from '../../components/ui/section';
import { getForecastsPageData } from '../../server/services/analysis-service';

export const dynamic = 'force-dynamic';

export default async function ForecastsPage() {
  const data = await getForecastsPageData();
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
          eyebrow="Forecasts"
          title={data.overview.title}
          description={data.overview.description}
          summary={data.overview.summary}
          statusLabel={data.overview.statusLabel}
          statusTone={data.overview.statusTone}
          meta={[
            { label: 'Last updated', value: data.overview.lastUpdatedLabel },
            { label: 'Tracked forecasts', value: String(data.forecasts.length) },
          ]}
          actions={[
            { href: '/signals', label: 'View signals' },
            { href: '/dashboard', label: 'Open dashboard' },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <AnalysisToolbar
          title="Explainable v1 forecasts"
          subtitle="Forecast outputs are built from live-derived signal snapshots and remain transparent about their current calibration level."
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
          <div className="table-panel__empty">No tracked assets currently have enough history to derive forecasts.</div>
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
                title="Forecasts are first-pass but real"
                body="This v1 surface exposes explainable, signal-driven forecast summaries without pretending the scenario engine is fully calibrated yet."
              />
            </div>
          </div>
        </Section>
      ) : null}
    </>
  );
}
