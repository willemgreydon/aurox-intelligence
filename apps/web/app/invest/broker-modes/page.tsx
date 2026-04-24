import { Section } from '../../../components/ui/section';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { InvestmentCapabilityCard } from '../../../components/invest/investment-capability-card';
import { Card } from '../../../components/ui/card';
import { requireCurrentSession } from '../../../server/auth/session';
import { getBrokerConnectionSummary } from '../../../server/env/broker-env';

export const dynamic = 'force-dynamic';

export default async function BrokerModesPage() {
  const auth = await requireCurrentSession('/login');
  const brokerSummary = getBrokerConnectionSummary();

  const isSimulation = brokerSummary.provider === 'simulation';
  const isBinance = brokerSummary.provider === 'binance';
  const isCoinbase = brokerSummary.provider === 'coinbase';

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow="Invest / Broker modes"
          title="Broker execution modes"
          description="Execution capability overview across simulation and live broker infrastructure."
          summary="This page shows which execution path is active, which broker credentials are configured, and which capabilities are intentionally still restricted. No live trading is active by default."
          statusLabel={brokerSummary.hasConfiguredBroker ? 'Broker configured' : 'Simulation only'}
          statusTone={brokerSummary.hasConfiguredBroker ? 'success' : 'warning'}
          meta={[
            { label: 'Execution provider', value: brokerSummary.provider },
            { label: 'Dry run', value: brokerSummary.dryRun ? 'Enabled' : 'Disabled' },
            { label: 'Sandbox', value: brokerSummary.sandboxMode ? 'Enabled' : 'Disabled' },
            { label: 'Signed in as', value: auth.user.email },
          ]}
          actions={[
            { href: '/invest', label: 'Invest hub' },
            { href: '/invest/live-readiness', label: 'Live readiness' },
            { href: '/invest/overview', label: 'Overview' },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Safety model</div>
              <h3>No live execution is active</h3>
              <p>
                All trade actions in this release are restricted to simulated paper trading.
                Real broker credentials do not enable live execution by themselves — live trading
                requires explicit readiness gates, user verification, capital caps, risk policy
                review, and operator approval before any real-money path is unlocked.
              </p>
            </div>
            <span className="status-pill status-pill--info">Simulation-first</span>
          </div>
          <div className="analytics-card__body">
            <p>
              Configuring a Binance or Coinbase API key enables the adapter wiring to be validated
              in dry-run and sandbox mode only. It does not activate live order execution.
              Autonomous live execution is explicitly disabled and must not be enabled until the
              full safety progression is complete.
            </p>
          </div>
        </Card>
      </Section>

      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Execution stack</div>
            <h2>Available execution lanes</h2>
            <p>
              The system must move from simulation to guarded live execution in deliberate steps.
              Lower tiers must be stable and validated before higher autonomy or live execution is unlocked.
            </p>
          </div>
        </header>

        <div className="dashboard-grid dashboard-grid--three">
          <InvestmentCapabilityCard
            title="Simulation (default)"
            description="Internal execution path for paper trading, assisted workflows, and risk validation. Uses fictive cash only — no real capital at risk."
            statusLabel="Ready"
            statusTone="success"
            supportedActions={[
              'Manual simulation orders for stocks',
              'Policy and risk-gated workflow execution',
              'Audit trail generation',
              'Lane-level capital tracking',
            ]}
            constraints={[
              'No external broker execution',
              'ETF and crypto simulation readiness prepared — not confirmed active end-to-end',
              'Fill realism depends on simulation model and catalog data',
            ]}
            notes={[
              'This is the default and recommended path for all current usage.',
              'Simulation must remain the default while broker logic and risk controls are being validated.',
            ]}
            footer="Default execution target for all current lanes and workflows."
          />

          <InvestmentCapabilityCard
            title="Binance live adapter"
            description="Future live crypto execution path through Binance using API key + secret. Not active and not production-ready by credentials alone."
            statusLabel={
              isBinance && brokerSummary.hasBinance ? 'Credentials detected' : 'Not active'
            }
            statusTone={
              isBinance && brokerSummary.hasBinance
                ? brokerSummary.dryRun
                  ? 'warning'
                  : 'warning'
                : 'info'
            }
            supportedActions={[
              'Crypto market order routing (future)',
              'Dry-run validation before real execution',
              'Restricted symbol allowlist handling',
            ]}
            constraints={[
              'Supports crypto only in current adapter patch',
              'Live execution requires readiness gates, verified user status, capital caps, and operator approval',
              'Keep dry-run enabled until full test flow is verified end-to-end',
              'Autonomous live execution is disabled — manual or AI-suggested flows only when activated',
            ]}
            notes={[
              'Detecting Binance credentials does not enable live trading.',
              'Only enable trading permissions on the API key once dry-run and sandbox are stable.',
              'This path is future and unvalidated — do not treat credential detection as production-readiness.',
            ]}
            footer={
              brokerSummary.hasBinance
                ? 'Binance credentials detected. Dry-run mode still required before any live execution.'
                : 'Binance credentials not detected. Adapter wiring will be inactive.'
            }
          />

          <InvestmentCapabilityCard
            title="Coinbase Advanced Trade adapter"
            description="Future live crypto execution path through Coinbase Advanced Trade. Not active and not production-ready by credentials alone."
            statusLabel={
              isCoinbase && brokerSummary.hasCoinbase ? 'Credentials detected' : 'Not active'
            }
            statusTone={
              isCoinbase && brokerSummary.hasCoinbase
                ? brokerSummary.dryRun
                  ? 'warning'
                  : 'warning'
                : 'info'
            }
            supportedActions={[
              'JWT-authenticated Advanced Trade order submission (future)',
              'Dry-run validation path',
              'Restricted product allowlist handling',
            ]}
            constraints={[
              'Supports crypto only in current adapter patch',
              'Read-only API keys are not enough for trade placement',
              'Live execution requires readiness gates, verified user status, capital caps, and operator approval',
              'Autonomous live execution is disabled — manual or AI-suggested flows only when activated',
            ]}
            notes={[
              'Detecting Coinbase credentials does not enable live trading.',
              'An API key with trading permissions is required before real order submission — but that alone is not sufficient.',
              'This path is future and unvalidated — do not treat credential detection as production-readiness.',
            ]}
            footer={
              brokerSummary.hasCoinbase
                ? 'Coinbase credentials detected. Dry-run mode still required before any live execution.'
                : 'Coinbase credentials not detected. Adapter wiring will be inactive.'
            }
          />
        </div>
      </Section>

      <Section className="dashboard-section dashboard-section--tinted">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Strategy lane lifecycle</div>
            <h2>Simulation lanes and their current state</h2>
            <p>
              Each lane has an explicit lifecycle status. Planned lanes do not execute any trades
              — autonomous or otherwise. Activation requires explicit user approval, readiness gates,
              and per-lane capital caps at each stage.
            </p>
          </div>
        </header>

        <div className="dashboard-grid dashboard-grid--two">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Manual stock lane</div>
                <h3>Active — simulation only</h3>
                <p>
                  The manual stock lane is the primary active execution lane. Stock simulation
                  works end-to-end with deterministic accounting, auditable order history, and
                  lane-tagged transaction records.
                </p>
              </div>
              <span className="status-pill status-pill--success">Active</span>
            </div>
          </Card>

          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Manual multi-asset lane</div>
                <h3>Limited — stock ready, ETF/crypto browse-only</h3>
                <p>
                  The manual multi-asset lane is prepared for cross-asset simulation workflows.
                  Stock simulation is active within this lane. ETF and crypto execution remain
                  browse-only unless confirmed active by implementation and catalog verification.
                </p>
              </div>
              <span className="status-pill status-pill--warning">Limited</span>
            </div>
          </Card>

          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">AI copilot lane</div>
                <h3>Planned only</h3>
                <p>
                  Assistant-guided paper trading with human confirmation at every step. No autonomous
                  order execution. Requires AI suggestion pipeline, human approval flow, and
                  confirmation UI before this lane can be activated.
                </p>
              </div>
              <span className="status-pill status-pill--info">Planned</span>
            </div>
          </Card>

          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Signal-follow lane</div>
                <h3>Planned only</h3>
                <p>
                  Strategy bucket that mirrors selected internal signal packs in simulation.
                  Requires strategy controls rollout and signal pack integration before activation.
                  No autonomous execution. No live trading.
                </p>
              </div>
              <span className="status-pill status-pill--info">Planned</span>
            </div>
          </Card>

          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Broker-agent sandbox</div>
                <h3>Planned only</h3>
                <p>
                  Future agentic simulation lane for broker-like orchestration research. The simulation
                  safety boundary remains enforced — no real execution is possible from this lane.
                  Requires full agent orchestration, reconciliation, and kill-switch implementation
                  before activation.
                </p>
              </div>
              <span className="status-pill status-pill--info">Planned</span>
            </div>
          </Card>

          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Live execution lanes (future)</div>
                <h3>Disabled — not available in this release</h3>
                <p>
                  Live execution lanes require completed simulation history, verified user status,
                  healthy broker connection, configured capital caps, active kill-switch, and
                  explicit operator approval per lane. None of these lanes are available yet.
                  Autonomous live execution is explicitly disabled at the service layer.
                </p>
              </div>
              <span className="status-pill status-pill--danger">Disabled</span>
            </div>
          </Card>
        </div>
      </Section>

      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Activation progression</div>
              <h3>Staged path to live trading</h3>
              <p>
                Live trading, if ever activated, must follow a strict staged progression.
                Each stage requires explicit user approval and documented readiness.
              </p>
            </div>
          </div>
          <div className="analytics-card__body">
            <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '0.75rem' }}>
              <li>
                <strong>Stage 1 — Fictive cash simulation (current):</strong> All trading uses
                fictive cash. No real capital involved. Default for all users.
              </li>
              <li>
                <strong>Stage 2 — Human-confirmed paper trading (planned):</strong> AI may suggest
                trades but the user confirms every order before execution. Still paper trading only.
              </li>
              <li>
                <strong>Stage 3 — Broker sandbox / paper broker (planned):</strong> Orders are
                routed to a broker sandbox environment. Validates execution flow without real money.
              </li>
              <li>
                <strong>Stage 4 — Real micro-trading with explicit tiny capital cap (future/gated):</strong>{' '}
                Real-money trading with a very small explicit cap (e.g. €5 or €100). Requires
                verified user, completed simulation history, configured risk caps, and active
                kill-switch. Each lane cap is individually approved.
              </li>
              <li>
                <strong>Stage 5 — Larger capital after observed performance (future/gated):</strong>{' '}
                Capital limits may be increased only after sustained simulation and micro-trading
                risk performance is validated. No automatic progression — always explicit.
              </li>
            </ol>
          </div>
        </Card>
      </Section>
    </>
  );
}
