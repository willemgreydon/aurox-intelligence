import Link from 'next/link';
import { listProviderMonitorConfigs } from '@repo/db';
import { Section } from '../../../../components/ui/section';
import { WorkstationPageHeader } from '../../../../components/asset/workstation-page-header';
import { saveProviderMonitorConfigAction } from '../../../../server/actions/admin-monitor-actions';
import { getProviderCapabilityRows } from '../../../../server/queries/admin-query';

export const dynamic = 'force-dynamic';

type ProviderRuntimeStatus = 'Healthy' | 'Degraded' | 'Unavailable' | 'Disabled';

function maskIdentifier(value: string) {
  if (value.length <= 4) {
    return `${value.slice(0, 1)}***`;
  }
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function hasEnvKey(providerKey: string) {
  if (providerKey.startsWith('finnhub')) return Boolean(process.env.FINNHUB_API_KEY);
  if (providerKey.startsWith('polygon')) return Boolean(process.env.POLYGON_API_KEY);
  if (providerKey === 'twelve-data') return Boolean(process.env.TWELVE_DATA_API_KEY);
  if (providerKey === 'tiingo') return Boolean(process.env.TIINGO_API_KEY);
  if (providerKey === 'coingecko') return Boolean(process.env.COINGECKO_API_KEY);
  if (providerKey === 'eodhd') return Boolean(process.env.EODHD_API_KEY);
  return true;
}

function deriveStatus(enabled: boolean, configured: boolean): ProviderRuntimeStatus {
  if (!enabled) return 'Disabled';
  if (!configured) return 'Unavailable';
  return 'Healthy';
}

function statusTone(status: ProviderRuntimeStatus) {
  if (status === 'Healthy') return 'success';
  if (status === 'Degraded') return 'warning';
  if (status === 'Unavailable') return 'warning';
  return 'info';
}

export default async function ProviderMonitoringConfigPage() {
  const configs = await listProviderMonitorConfigs();
  const capabilityRows = getProviderCapabilityRows();
  const enabledCount = configs.filter((config) => config.enabled).length;

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow="Admin monitoring"
          title="Provider monitor configuration"
          description="Enable or disable provider monitoring checks and dashboard visibility."
          summary="Secrets are masked and cannot be edited from this panel."
          statusLabel="configured"
          statusTone="info"
          meta={[
            { label: 'Providers', value: String(configs.length) },
            { label: 'Enabled', value: String(enabledCount) },
            { label: 'Secret handling', value: 'Masked / not editable' },
          ]}
          actions={[{ href: '/admin/monitoring', label: 'Back to monitoring' }, { href: '/admin', label: 'Open admin' }]}
        />
      </Section>
      <Section className="dashboard-section">
        <form action={saveProviderMonitorConfigAction} className="analytics-card">
          <div className="analytics-card__body">
            {configs.map((config) => {
              const configured = hasEnvKey(config.providerKey);
              const runtimeStatus = deriveStatus(config.enabled, configured);
              return (
                <div key={config.id} style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                  <p><strong>{config.providerName}</strong> ({maskIdentifier(config.providerKey)})</p>
                  <p>Category: {config.category}</p>
                  <p>Monitored: {config.displayInDashboard ? 'true' : 'false'}</p>
                  <p>
                    Status: <span className={`status-pill status-pill--${statusTone(runtimeStatus)}`}>{runtimeStatus}</span>
                  </p>
                  <p>Last successful check: n/a</p>
                  <p>Last error: n/a</p>
                  <p>Latency: n/a</p>
                  <label><input type="checkbox" name={`${config.id}:enabled`} defaultChecked={config.enabled} /> Enabled</label>{' '}
                  <label><input type="checkbox" name={`${config.id}:monitorHealth`} defaultChecked={config.monitorHealth} /> Health</label>{' '}
                  <label><input type="checkbox" name={`${config.id}:monitorLatency`} defaultChecked={config.monitorLatency} /> Latency</label>{' '}
                  <label><input type="checkbox" name={`${config.id}:monitorQuota`} defaultChecked={config.monitorQuota} /> Quota</label>{' '}
                  <label><input type="checkbox" name={`${config.id}:monitorErrors`} defaultChecked={config.monitorErrors} /> Errors</label>{' '}
                  <label><input type="checkbox" name={`${config.id}:displayInDashboard`} defaultChecked={config.displayInDashboard} /> Show in dashboard</label>
                </div>
              );
            })}
          </div>
          <div className="analytics-card__action-grid">
            <button className="button button--primary" type="submit">Save configuration</button>
            <Link href="/admin/monitoring" className="button button--secondary">Cancel</Link>
          </div>
        </form>
      </Section>
      <Section className="dashboard-section">
        <div className="analytics-card">
          <div className="analytics-card__header">
            <h2>Provider capability matrix</h2>
            <p>Shows configured status, quote mode, supported asset classes and history resolutions.</p>
          </div>
          <div className="analytics-card__body" style={{ overflowX: 'auto' }}>
            <table className="table-panel__table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Display</th>
                  <th>Configured</th>
                  <th>Auth mode</th>
                  <th>API key</th>
                  <th>Quote mode</th>
                  <th>WS</th>
                  <th>REST</th>
                  <th>Stream</th>
                  <th>Last message</th>
                  <th>Subscribed symbols</th>
                  <th>Channels</th>
                  <th>Asset classes</th>
                  <th>1m</th>
                  <th>5m</th>
                  <th>15m</th>
                  <th>30m</th>
                  <th>60m</th>
                  <th>1d</th>
                  <th>Last success</th>
                  <th>Last failure</th>
                  <th>Rate limit</th>
                </tr>
              </thead>
              <tbody>
                {capabilityRows.map((row) => (
                  <tr key={row.provider}>
                    <td>{row.provider}</td>
                    <td>{row.displayName}</td>
                    <td>{row.configured ? 'configured' : 'missing key'}</td>
                    <td>{row.authMode}</td>
                    <td>{row.requiresApiKey ? 'required' : 'no key'}</td>
                    <td>{row.quoteMode}</td>
                    <td>{row.supportsWebSocket ? 'yes' : 'no'}</td>
                    <td>{row.supportsRest ? 'yes' : 'no'}</td>
                    <td>{row.streamStatus}</td>
                    <td>{row.lastMessageAt ? new Date(row.lastMessageAt).toLocaleString() : 'n/a'}</td>
                    <td>{row.subscribedSymbols.join(', ') || 'n/a'}</td>
                    <td>{row.activeChannels.join(', ') || 'n/a'}</td>
                    <td>{row.assetClasses.join(', ') || 'unsupported'}</td>
                    <td>{row.resolutions.includes('1m') ? 'yes' : 'no'}</td>
                    <td>{row.resolutions.includes('5m') ? 'yes' : 'no'}</td>
                    <td>{row.resolutions.includes('15m') ? 'yes' : 'no'}</td>
                    <td>{row.resolutions.includes('30m') ? 'yes' : 'no'}</td>
                    <td>{row.resolutions.includes('60m') ? 'yes' : 'no'}</td>
                    <td>{row.resolutions.includes('1d') ? 'yes' : 'no'}</td>
                    <td>{row.lastSuccessAt ? new Date(row.lastSuccessAt).toLocaleString() : 'n/a'}</td>
                    <td>{row.lastFailureAt ? new Date(row.lastFailureAt).toLocaleString() : 'n/a'}</td>
                    <td>{row.rateLimitState}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>
    </>
  );
}
