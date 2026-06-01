import type { ClaudeFinanceCockpitViewModel } from '@repo/api-contracts';
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
};

/**
 * Claude Finance cockpit — summary-first composition of existing systems.
 *
 * Renders pre-shaped read models only; no domain math here. Primary action
 * (generate simulated activity) is reachable above the fold; deeper insight is
 * progressively disclosed. Simulation-only and preview-only throughout.
 */
export function ClaudeFinanceCockpit({ cockpit }: ClaudeFinanceCockpitProps) {
  const laneOptions = cockpit.starredLanes.map((lane) => ({
    assetId: lane.assetId,
    symbol: lane.symbol,
    assetClass: lane.assetClass,
    canGenerateActivity: lane.canGenerateActivity,
  }));

  return (
    <div className="finance-cockpit">
      <Section>
        <FinanceHeroBar cockpit={cockpit} />
      </Section>

      <Section>
        <div className="finance-cockpit__grid">
          <div className="finance-cockpit__main">
            <Card>
              <SectionHeader
                eyebrow="Simulated broker activity"
                title="Generate a preview"
                description="Pick a starred lane, choose a side and quantity, and preview a deterministic, risk-checked simulated decision. No order is ever executed."
              />
              <SimulatedActivityPanel
                lanes={laneOptions}
                microTradingEnabled={cockpit.microTradingEnabled}
                disclaimer={cockpit.simulationOnlyNotice}
              />
            </Card>

            <Card>
              <SectionHeader
                eyebrow="Portfolio intelligence"
                title="Snapshot"
                description="A summary-first read on portfolio health, regime, and the strongest opportunities. Open a section for detail."
                action={
                  <a className="button button--secondary" href="/portfolio/intelligence">
                    Review full intelligence
                  </a>
                }
              />
              <IntelligenceSnapshot intelligence={cockpit.intelligence} status={cockpit.status} statusReason={cockpit.statusReason} />
            </Card>
          </div>

          <aside className="finance-cockpit__aside">
            <Card>
              <SectionHeader
                eyebrow="Starred lanes"
                title="Your watchlist"
                as="h3"
                action={
                  <a className="button button--ghost" href="/invest">
                    Browse markets
                  </a>
                }
              />
              {cockpit.starredEmptyMessage ? (
                <p className="finance-empty" role="status">
                  {cockpit.starredEmptyMessage}
                </p>
              ) : (
                <ul className="finance-lane-list" aria-label="Starred market lanes">
                  {cockpit.starredLanes.map((lane) => (
                    <li key={lane.assetId}>
                      <StarredLaneCard lane={lane} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <SectionHeader eyebrow="Decision journal" title="Recent Claude Finance decisions" as="h3" />
              <RecentDecisions decisions={cockpit.recentDecisions} />
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
