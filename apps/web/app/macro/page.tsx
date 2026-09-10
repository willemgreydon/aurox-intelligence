import { Section } from '../../components/ui/section';
import { WorkstationPageHeader } from '../../components/asset/workstation-page-header';
import { getMacroIntelligenceViewModel } from '../../server/services/macro-intelligence-service';
import { MacroProviderStatusPanel } from '../../components/macro/macro-provider-status';
import { MacroRegimeCard } from '../../components/macro/macro-regime-card';
import { MacroSeriesTile } from '../../components/macro/macro-series-tile';
import { MacroRiskOverlay } from '../../components/macro/macro-risk-overlay';
import { MacroScenarioPanel } from '../../components/macro/macro-scenario-panel';

export default async function MacroPage() {
  const model = await getMacroIntelligenceViewModel();
  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow="Macro"
          title="Macro regime intelligence"
          description="World Bank, ECB, and FRED normalized into simulation-safe context for risk overlays and scenario analysis."
          summary={model.simulationOnlyLabel}
          statusLabel="simulation"
          statusTone="info"
          actions={[{ href: '/invest/simulation', label: 'Simulation' }, { href: '/portfolio/intelligence', label: 'Portfolio intelligence' }]}
          meta={[{ label: 'Updated', value: model.generatedAt }]}
        />
      </Section>
      <Section className="dashboard-section">
        <div className="observation-regime-grid gt-rise-stagger">
          <MacroRegimeCard title="Inflation pressure" score={model.regime.inflationRegime.score} detail={model.regime.inflationRegime.explanation} confidence={model.regime.confidence} />
          <MacroRegimeCard title="Rates pressure" score={model.regime.ratesRegime.score} detail={model.regime.ratesRegime.explanation} confidence={model.regime.confidence} />
          <MacroRegimeCard title="Growth backdrop" score={model.regime.growthRegime.score} detail={model.regime.growthRegime.explanation} confidence={model.regime.confidence} />
          <MacroRegimeCard title="Risk-on / risk-off" score={model.regime.riskRegime.score} detail={model.regime.riskRegime.explanation} confidence={model.regime.confidence} />
        </div>
      </Section>
      <Section className="dashboard-section">
        <MacroRiskOverlay score={model.regime.overallMacroScore} confidence={model.regime.confidence} note={model.regime.explanations[0] ?? 'No dominant macro signal yet.'} />
      </Section>
      <Section className="dashboard-section">
        <MacroProviderStatusPanel rows={model.providerStatus} />
      </Section>
      <Section className="dashboard-section">
        <div className="analytics-grid analytics-grid--3">
          {model.topSeries.map((series) => <MacroSeriesTile key={`${series.provider}-${series.seriesId}`} series={series} />)}
        </div>
      </Section>
      <Section className="dashboard-section">
        <MacroScenarioPanel explanations={model.regime.explanations} />
      </Section>
    </>
  );
}
