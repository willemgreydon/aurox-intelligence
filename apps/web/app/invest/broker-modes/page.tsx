import { Section } from '../../../components/ui/section';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { InvestmentCapabilityCard } from '../../../components/invest/investment-capability-card';
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
          summary="Use this page to confirm which execution path is active, which broker credentials are configured, and which capabilities are intentionally still restricted."
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
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Execution stack</div>
            <h2>Available lanes</h2>
            <p>
              The system should move from simulation to guarded live execution in deliberate steps, not all at once.
            </p>
          </div>
        </header>

        <div className="dashboard-grid dashboard-grid--three">
          <InvestmentCapabilityCard
            title="Simulation"
            description="Internal execution path for paper trading, assisted workflows, and risk validation."
            statusLabel="Ready"
            statusTone="success"
            supportedActions={[
              'Manual simulation orders',
              'AI-suggested simulation orders',
              'Policy and risk-gated workflow execution',
              'Audit trail generation',
            ]}
            constraints={[
              'No external broker execution',
              'Fill realism still depends on your simulation model',
            ]}
            notes={[
              'This should remain your default path while validating new strategy or broker logic.',
            ]}
            footer="Recommended default for development, QA, and model iteration."
          />

          <InvestmentCapabilityCard
            title="Binance live adapter"
            description="Live crypto execution path through Binance using API key + secret."
            statusLabel={
              isBinance && brokerSummary.hasBinance ? 'Configured' : 'Not active'
            }
            statusTone={
              isBinance && brokerSummary.hasBinance
                ? brokerSummary.dryRun
                  ? 'warning'
                  : 'success'
                : 'info'
            }
            supportedActions={[
              'Crypto market order routing',
              'Dry-run validation before real execution',
              'Restricted symbol allowlist handling',
            ]}
            constraints={[
              'Current patch supports crypto only',
              'You should keep dry-run enabled until test flow is verified end-to-end',
              'Live usage must remain tied to guarded broker mode IDs',
            ]}
            notes={[
              'Use a system-generated Binance API key for the current HMAC implementation.',
              'Only enable trading permission on the key once your dry-run and sandbox path is stable.',
            ]}
            footer={
              brokerSummary.hasBinance
                ? 'Binance credentials detected in environment.'
                : 'Binance credentials not detected yet.'
            }
          />

          <InvestmentCapabilityCard
            title="Coinbase Advanced Trade adapter"
            description="Live crypto execution path through Coinbase Advanced Trade."
            statusLabel={
              isCoinbase && brokerSummary.hasCoinbase ? 'Configured' : 'Not active'
            }
            statusTone={
              isCoinbase && brokerSummary.hasCoinbase
                ? brokerSummary.dryRun
                  ? 'warning'
                  : 'success'
                : 'info'
            }
            supportedActions={[
              'JWT-authenticated Advanced Trade order submission',
              'Dry-run validation path',
              'Restricted product allowlist handling',
            ]}
            constraints={[
              'Current patch supports crypto only',
              'Read-only API keys are not enough for trade placement',
              'Autonomous live execution should remain disabled for now',
            ]}
            notes={[
              'Your current screenshot suggests the Coinbase key is view-only.',
              'You need an API key with trading permissions before real order submission can work.',
            ]}
            footer={
              brokerSummary.hasCoinbase
                ? 'Coinbase credentials detected in environment.'
                : 'Coinbase credentials not detected yet.'
            }
          />
        </div>
      </Section>
    </>
  );
}