import Link from 'next/link';
import { checkLiveReadiness, type LiveReadinessContext } from '@repo/agents';
import { Section } from '../../../components/ui/section';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { Card } from '../../../components/ui/card';
import { LiveReadinessCard } from '../../../components/broker/live-readiness-card';
import { requireCurrentSession } from '../../../server/auth/session';
import { getSimulationWorkstationStateForCurrentUser } from '../../../server/services/simulation-workstation-service';
import { BROKER_MODE_REGISTRY } from '../../../server/config/broker-mode-registry';
import { getBrokerConnectionSummary } from '../../../server/env/broker-env';

export const dynamic = 'force-dynamic';

function buildReadinessContext(input: {
  workstationStatus: string;
  orderCount: number;
  isReadOnly: boolean;
  hasBrokerConnection: boolean;
}): LiveReadinessContext {
  return {
    isUserVerified: false,
    hasBrokerConnection: input.hasBrokerConnection,
    isMarketDataHealthy:
      input.workstationStatus !== 'error' && input.workstationStatus !== 'failed',
    hasSimulationHistory: input.orderCount > 0,
    isReadOnlyMode: input.isReadOnly,
  };
}

export default async function LiveReadinessPage() {
  const auth = await requireCurrentSession('/login');
  const workstation = await getSimulationWorkstationStateForCurrentUser({ sessionId: null });
  const brokerSummary = getBrokerConnectionSummary();

  const readinessContext = buildReadinessContext({
    workstationStatus: workstation.workstationStatus,
    orderCount: workstation.workspace?.orders.length ?? 0,
    isReadOnly: workstation.isReadOnly,
    hasBrokerConnection: brokerSummary.hasConfiguredBroker,
  });

  const readinessResults = BROKER_MODE_REGISTRY.map(({ config, tier, laneHref }) => ({
    tier,
    laneHref,
    result: checkLiveReadiness(config, readinessContext),
  }));

  const liveModeResults = readinessResults.filter(
    (entry) => entry.result.executionTarget === 'live',
  );

  const simulationModeResults = readinessResults.filter(
    (entry) => entry.result.executionTarget === 'simulation',
  );

  const liveModesReady = liveModeResults.filter((entry) => entry.result.ready).length;
  const totalBlockingChecks = readinessResults.reduce(
    (sum, entry) => sum + entry.result.blockingCheckCount,
    0,
  );

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow="Invest / Live readiness"
          title="Live trading readiness"
          description="Per-mode activation status across simulation and live broker modes."
          summary="Use this surface to verify whether your current account, market data path, broker wiring, and simulation track record are sufficient to unlock stricter execution modes."
          statusLabel={liveModesReady > 0 ? 'Partially ready' : 'Not ready'}
          statusTone={liveModesReady > 0 ? 'success' : 'warning'}
          meta={[
            {
              label: 'Live modes ready',
              value: `${liveModesReady} / ${liveModeResults.length}`,
            },
            {
              label: 'Total blockers',
              value: String(totalBlockingChecks),
            },
            {
              label: 'Broker provider',
              value: brokerSummary.provider,
            },
            {
              label: 'Broker wiring',
              value: brokerSummary.hasConfiguredBroker ? 'Configured' : 'Missing',
            },
            { label: 'Signed in as', value: auth.user.email },
          ]}
          actions={[
            { href: '/invest', label: 'Invest hub' },
            { href: '/invest/broker-modes', label: 'Broker modes' },
            { href: '/invest/overview', label: 'Overview' },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Readiness summary</div>
            <h2>Activation snapshot</h2>
            <p>
              Simulation modes should pass first. Live modes should only move forward
              after simulation history, verified user status, market data health, and broker connectivity are in place.
            </p>
          </div>
        </header>

        <div className="dashboard-grid dashboard-grid--three">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Simulation modes</div>
                <h3>
                  {simulationModeResults.filter((entry) => entry.result.ready).length} / {simulationModeResults.length}
                </h3>
                <p>Simulation lanes that currently pass their mode checks.</p>
              </div>
            </div>
          </Card>

          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Live modes</div>
                <h3>
                  {liveModesReady} / {liveModeResults.length}
                </h3>
                <p>Live execution modes that currently pass all readiness requirements.</p>
              </div>
            </div>
          </Card>

          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Current constraints</div>
                <h3>{totalBlockingChecks}</h3>
                <p>Blocking checks still preventing broader activation.</p>
              </div>
            </div>
          </Card>
        </div>
      </Section>

      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Mode-by-mode breakdown</div>
            <h2>Broker mode readiness</h2>
            <p>
              Review every mode individually. Lower tiers should stabilize before higher autonomy or live execution is unlocked.
            </p>
          </div>
        </header>

        <div className="dashboard-grid">
          {readinessResults.map(({ tier, laneHref, result }) => (
            <div key={result.modeId} style={{ display: 'grid', gap: '0.75rem' }}>
              <LiveReadinessCard result={result} tier={tier} />
              {laneHref ? (
                <div>
                  <Link className="button button--secondary" href={laneHref}>
                    Open related lane
                  </Link>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </Section>

      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Next activation sequence</div>
              <h3>Recommended progression</h3>
              <p>Move in a strict order from stable simulation toward increasingly autonomous execution.</p>
            </div>
          </div>
          <div className="analytics-card__body">
            <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '0.75rem' }}>
              <li>Keep `BROKER_DRY_RUN=true` while validating order routing.</li>
              <li>Run manual and assisted simulation modes until fills and limits behave consistently.</li>
              <li>Verify broker keys, allowed symbols/products, and market data health.</li>
              <li>Only then enable guarded live execution for a restricted mode ID.</li>
              <li>Leave autonomous live execution disabled until audit, reconciliation, and kill-switch logic are complete.</li>
            </ol>
          </div>
        </Card>
      </Section>
    </>
  );
}