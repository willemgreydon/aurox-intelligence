import { Section } from '../../../components/ui/section';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { Card } from '../../../components/ui/card';
import { requireCurrentSession } from '../../../server/auth/session';
import { getBrokerHealthReport } from '../../../server/services/broker-health-service';

export const dynamic = 'force-dynamic';

function ConnectivityStatusPill({ result }: { result: { reachable: boolean; error: string | null } | null }) {
  if (result === null) {
    return <span className="status-pill status-pill--info">Not configured</span>;
  }
  if (result.reachable) {
    return <span className="status-pill status-pill--success">Reachable</span>;
  }
  return <span className="status-pill status-pill--danger">Unreachable</span>;
}

function PermissionStatusPill({ canTrade, error }: { canTrade: boolean; error: string | null }) {
  if (error && !canTrade) {
    return <span className="status-pill status-pill--danger">Check failed</span>;
  }
  if (canTrade) {
    return <span className="status-pill status-pill--success">Trade permitted</span>;
  }
  return <span className="status-pill status-pill--danger">View only</span>;
}

export default async function BrokerHealthPage() {
  await requireCurrentSession('/login');
  const report = await getBrokerHealthReport();

  const overallTone =
    report.provider === 'simulation'
      ? 'info'
      : report.credentials.binance || report.credentials.coinbase
        ? 'warning'
        : 'danger';

  const overallLabel =
    report.provider === 'simulation'
      ? 'Simulation mode'
      : report.dryRun
        ? 'Dry-run active'
        : 'Live mode';

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow="Invest / Broker health"
          title="Broker health diagnostics"
          description="Runtime broker configuration, credential status, connectivity checks, and permission diagnostics."
          summary="Use this page before enabling live execution to confirm that credentials are present, the broker is reachable, and your API key has the correct permissions."
          statusLabel={overallLabel}
          statusTone={overallTone}
          meta={[
            { label: 'Execution provider', value: report.provider },
            { label: 'Dry-run mode', value: report.dryRun ? 'Enabled' : 'Disabled' },
            { label: 'Sandbox mode', value: report.sandboxMode ? 'Enabled' : 'Disabled' },
            { label: 'Checked at', value: new Date(report.generatedAt).toLocaleTimeString() },
          ]}
          actions={[
            { href: '/invest/broker-modes', label: 'Broker modes' },
            { href: '/invest/live-readiness', label: 'Live readiness' },
            { href: '/invest', label: 'Invest hub' },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Runtime configuration</div>
            <h2>Credential and mode status</h2>
            <p>
              Shows which broker credentials are present in the environment and whether dry-run or sandbox mode is active.
            </p>
          </div>
        </header>

        <div className="analytics-strip">
          <article className="analytics-card analytics-card--compact">
            <div className="analytics-card__body">
              <div className="analytics-stat__label">Provider</div>
              <div className="analytics-stat__value">{report.provider}</div>
              <p style={{ margin: '0.5rem 0 0', opacity: 0.8, fontSize: '0.875rem' }}>
                Set via <code>BROKER_EXECUTION_PROVIDER</code>
              </p>
            </div>
          </article>

          <article className="analytics-card analytics-card--compact">
            <div className="analytics-card__body">
              <div className="analytics-stat__label">Dry-run</div>
              <div className="analytics-stat__value">{report.dryRun ? 'On' : 'Off'}</div>
              <p style={{ margin: '0.5rem 0 0', opacity: 0.8, fontSize: '0.875rem' }}>
                {report.dryRun
                  ? 'Orders are simulated — no real execution occurs.'
                  : 'Real order submission is active.'}
              </p>
            </div>
          </article>

          <article className="analytics-card analytics-card--compact">
            <div className="analytics-card__body">
              <div className="analytics-stat__label">Sandbox mode</div>
              <div className="analytics-stat__value">{report.sandboxMode ? 'On' : 'Off'}</div>
              <p style={{ margin: '0.5rem 0 0', opacity: 0.8, fontSize: '0.875rem' }}>
                {report.sandboxMode
                  ? 'Using testnet or sandbox endpoints.'
                  : 'Using production broker endpoints.'}
              </p>
            </div>
          </article>

          <article className="analytics-card analytics-card--compact">
            <div className="analytics-card__body">
              <div className="analytics-stat__label">Credentials</div>
              <div className="analytics-stat__value">
                {report.credentials.binance || report.credentials.coinbase
                  ? 'Configured'
                  : 'None'}
              </div>
              <p style={{ margin: '0.5rem 0 0', opacity: 0.8, fontSize: '0.875rem' }}>
                {[
                  report.credentials.binance && 'Binance',
                  report.credentials.coinbase && 'Coinbase',
                ]
                  .filter(Boolean)
                  .join(' · ') || 'No live broker credentials found.'}
              </p>
            </div>
          </article>
        </div>
      </Section>

      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Connectivity</div>
            <h2>Broker reachability</h2>
            <p>
              Live connectivity checks against configured broker endpoints. Only runs for providers with credentials present.
            </p>
          </div>
        </header>

        <div className="dashboard-grid dashboard-grid--three">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Binance</div>
                <h3>API connectivity</h3>
                <p>
                  {report.connectivity.binance === null
                    ? 'Binance credentials are not configured. Set BINANCE_API_KEY and BINANCE_API_SECRET to enable connectivity checks.'
                    : report.connectivity.binance.reachable
                      ? 'Binance API responded successfully to the ping request.'
                      : `Binance API was not reachable: ${report.connectivity.binance.error ?? 'unknown error'}`}
                </p>
              </div>
              <ConnectivityStatusPill result={report.connectivity.binance} />
            </div>
            {report.connectivity.binance !== null && !report.connectivity.binance.reachable && (
              <div className="analytics-card__body">
                <p style={{ opacity: 0.8 }}>
                  Check that <code>BINANCE_API_BASE_URL</code> is correct and that the testnet or production endpoint is reachable from your deployment environment.
                </p>
              </div>
            )}
          </Card>

          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Coinbase</div>
                <h3>API connectivity</h3>
                <p>
                  {report.connectivity.coinbase === null
                    ? 'Coinbase credentials are not configured. Set COINBASE_API_KEY_ID + COINBASE_API_KEY_SECRET or COINBASE_BEARER_TOKEN to enable checks.'
                    : report.connectivity.coinbase.reachable
                      ? 'Coinbase API responded successfully.'
                      : `Coinbase API was not reachable: ${report.connectivity.coinbase.error ?? 'unknown error'}`}
                </p>
              </div>
              <ConnectivityStatusPill result={report.connectivity.coinbase} />
            </div>
            {report.connectivity.coinbase !== null && !report.connectivity.coinbase.reachable && (
              <div className="analytics-card__body">
                <p style={{ opacity: 0.8 }}>
                  Check that <code>COINBASE_API_BASE_URL</code> is correct and that JWT signing is working. The API key secret must be in PEM format with newlines correctly escaped.
                </p>
              </div>
            )}
          </Card>

          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Coinbase permissions</div>
                <h3>Key permission check</h3>
                <p>
                  {report.permissions.coinbase === null
                    ? 'No Coinbase credentials configured — permission check skipped.'
                    : report.permissions.coinbase.canTrade
                      ? 'API key has trade permission. Order placement is supported.'
                      : report.permissions.coinbase.error
                        ? `Permission check could not complete: ${report.permissions.coinbase.error}`
                        : 'API key is view-only. Trade permission is required before placing live orders.'}
                </p>
              </div>
              {report.permissions.coinbase !== null && (
                <PermissionStatusPill
                  canTrade={report.permissions.coinbase.canTrade}
                  error={report.permissions.coinbase.error}
                />
              )}
              {report.permissions.coinbase === null && (
                <span className="status-pill status-pill--info">Not configured</span>
              )}
            </div>
            {report.permissions.coinbase !== null &&
              !report.permissions.coinbase.canTrade &&
              !report.permissions.coinbase.error && (
                <div className="analytics-card__body">
                  <p style={{ opacity: 0.8 }}>
                    Your current Coinbase API key has view-only access. To place trades, create or update the key in the Coinbase Advanced Trade API settings and enable the <strong>Trade</strong> permission. Keep dry-run enabled until the updated key is verified.
                  </p>
                </div>
              )}
          </Card>
        </div>
      </Section>

      <Section className="dashboard-section">
        <header className="dashboard-section-heading">
          <div>
            <div className="section__eyebrow">Symbol allowlists</div>
            <h2>Execution scope</h2>
            <p>
              Restricts which symbols or products are eligible for live order submission.
              An empty list means all symbols are allowed.
            </p>
          </div>
        </header>

        <div className="dashboard-grid dashboard-grid--three">
          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Binance symbols</div>
                <h3>
                  {report.allowedSymbols.binance.length > 0
                    ? `${report.allowedSymbols.binance.length} symbol${report.allowedSymbols.binance.length === 1 ? '' : 's'} allowed`
                    : 'All symbols allowed'}
                </h3>
                <p>
                  {report.allowedSymbols.binance.length > 0
                    ? 'Orders are restricted to the symbols listed below.'
                    : 'No BINANCE_ALLOWED_SYMBOLS restriction is set. Any supported symbol may be traded.'}
                </p>
              </div>
            </div>
            {report.allowedSymbols.binance.length > 0 && (
              <div className="analytics-card__body">
                <ul className="detail-slot-card__list">
                  {report.allowedSymbols.binance.map((symbol) => (
                    <li key={symbol}>{symbol}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Coinbase products</div>
                <h3>
                  {report.allowedSymbols.coinbase.length > 0
                    ? `${report.allowedSymbols.coinbase.length} product${report.allowedSymbols.coinbase.length === 1 ? '' : 's'} allowed`
                    : 'All products allowed'}
                </h3>
                <p>
                  {report.allowedSymbols.coinbase.length > 0
                    ? 'Orders are restricted to the product IDs listed below.'
                    : 'No COINBASE_ALLOWED_PRODUCT_IDS restriction is set. Any supported product may be traded.'}
                </p>
              </div>
            </div>
            {report.allowedSymbols.coinbase.length > 0 && (
              <div className="analytics-card__body">
                <ul className="detail-slot-card__list">
                  {report.allowedSymbols.coinbase.map((product) => (
                    <li key={product}>{product}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card className="analytics-card">
            <div className="analytics-card__header">
              <div>
                <div className="section__eyebrow">Live mode gate</div>
                <h3>
                  {report.allowedLiveModeIds.length > 0
                    ? `${report.allowedLiveModeIds.length} mode${report.allowedLiveModeIds.length === 1 ? '' : 's'} gated`
                    : 'No mode restriction'}
                </h3>
                <p>
                  {report.allowedLiveModeIds.length > 0
                    ? 'Live execution is restricted to the mode IDs listed below.'
                    : 'BROKER_ALLOWED_LIVE_MODE_IDS is not set. Any live-target mode may execute when the provider is configured.'}
                </p>
              </div>
            </div>
            {report.allowedLiveModeIds.length > 0 && (
              <div className="analytics-card__body">
                <ul className="detail-slot-card__list">
                  {report.allowedLiveModeIds.map((modeId) => (
                    <li key={modeId}><code>{modeId}</code></li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      </Section>

      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Activation sequence</div>
              <h3>Recommended progression to live execution</h3>
              <p>Follow this order before enabling real capital at risk.</p>
            </div>
          </div>
          <div className="analytics-card__body">
            <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '0.75rem' }}>
              <li>Keep <code>BROKER_DRY_RUN=true</code> while validating order routing and symbol normalization.</li>
              <li>Confirm broker connectivity and credentials using this page before proceeding.</li>
              <li>
                <strong>Binance:</strong> Use a system-generated API key for the current HMAC implementation.
                Enable the trading permission only after your dry-run and testnet path is stable.
              </li>
              <li>
                <strong>Coinbase:</strong> Ensure the API key has <strong>Trade</strong> permission, not just view access.
                A view-only key will be rejected before any real order is attempted.
              </li>
              <li>Set <code>BROKER_ALLOWED_LIVE_MODE_IDS</code> to the specific mode ID you want to activate first.</li>
              <li>Only then set <code>BROKER_DRY_RUN=false</code> and validate a single small order manually.</li>
              <li>Leave autonomous live execution disabled until reconciliation and kill-switch logic are in place.</li>
            </ol>
          </div>
        </Card>
      </Section>
    </>
  );
}
