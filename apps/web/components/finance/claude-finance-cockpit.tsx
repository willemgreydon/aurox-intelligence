import type { ClaudeFinanceCockpitViewModel } from '@repo/api-contracts';
import type { AppMessages } from '../../lib/i18n/messages';
import { Section } from '../ui/section';
import { Card } from '../ui/card';
import { SectionHeader } from '../ui/section-header';
import { FinanceHeroBar } from './finance-hero-bar';
import { StarredLaneCard } from './starred-lane-card';
import { IntelligenceSnapshot } from './intelligence-snapshot';
import { SimulatedActivityPanel } from './simulated-activity-panel';
import { RecentDecisions } from './recent-decisions';

type ClaudeFinanceCockpitProps = {
  cockpit: ClaudeFinanceCockpitViewModel;
  labels: AppMessages['finance'];
};

/**
 * Claude Finance cockpit — summary-first composition of existing systems.
 *
 * Renders pre-shaped read models only; no domain math here. Primary action
 * (generate simulated activity) is reachable above the fold; deeper insight is
 * progressively disclosed. Simulation-only and preview-only throughout.
 */
export function ClaudeFinanceCockpit({ cockpit, labels }: ClaudeFinanceCockpitProps) {
  const laneOptions = cockpit.starredLanes.map((lane) => ({
    assetId: lane.assetId,
    symbol: lane.symbol,
    assetClass: lane.assetClass,
    canGenerateActivity: lane.canGenerateActivity,
  }));

  return (
    <div className="finance-cockpit">
      <Section>
        <FinanceHeroBar
          cockpit={cockpit}
          simulationModeAria={labels.heroSimulationModeAria}
          subtitle={labels.heroSubtitle}
          labels={labels.hero}
        />
      </Section>

      <Section>
        <div className="finance-cockpit__grid">
          <div className="finance-cockpit__main">
            <Card>
              <SectionHeader
                eyebrow={labels.activityEyebrow}
                title={labels.activityTitle}
                description={labels.activityDescription}
              />
              <SimulatedActivityPanel
                lanes={laneOptions}
                microTradingEnabled={cockpit.microTradingEnabled}
                disclaimer={cockpit.simulationOnlyNotice}
                labels={labels.activity}
              />
            </Card>

            <Card>
              <SectionHeader
                eyebrow={labels.intelligenceEyebrow}
                title={labels.intelligenceTitle}
                description={labels.intelligenceDescription}
                action={
                  <a className="button button--secondary" href="/portfolio/intelligence">
                    {labels.reviewFullIntelligence}
                  </a>
                }
              />
              <IntelligenceSnapshot intelligence={cockpit.intelligence} status={cockpit.status} statusReason={cockpit.statusReason} labels={labels.snapshot} />
            </Card>
          </div>

          <aside className="finance-cockpit__aside">
            <Card>
              <SectionHeader
                eyebrow={labels.starredEyebrow}
                title={labels.starredTitle}
                as="h3"
                action={
                  <a className="button button--ghost" href="/invest">
                    {labels.browseMarkets}
                  </a>
                }
              />
              {cockpit.starredEmptyMessage ? (
                <p className="finance-empty" role="status">
                  {cockpit.starredEmptyMessage}
                </p>
              ) : (
                <ul className="finance-lane-list" aria-label={labels.starredLanesAria}>
                  {cockpit.starredLanes.map((lane) => (
                    <li key={lane.assetId}>
                      <StarredLaneCard lane={lane} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <SectionHeader eyebrow={labels.decisionsEyebrow} title={labels.decisionsTitle} as="h3" />
              <RecentDecisions
                decisions={cockpit.recentDecisions}
                ariaLabel={labels.recentDecisionsAria}
                emptyMessage={labels.recentDecisionsEmpty}
              />
            </Card>
          </aside>
        </div>
      </Section>

      <Section>
        <p className="finance-disclaimer" role="note">
          {cockpit.simulationOnlyNotice}
        </p>
      </Section>
    </div>
  );
}
