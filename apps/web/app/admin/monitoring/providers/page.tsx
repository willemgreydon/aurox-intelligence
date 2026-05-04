import Link from 'next/link';
import { listProviderMonitorConfigs } from '@repo/db';
import { Section } from '../../../../components/ui/section';
import { WorkstationPageHeader } from '../../../../components/asset/workstation-page-header';
import { saveProviderMonitorConfigAction } from '../../../../server/actions/admin-monitor-actions';

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
                  <p>
                    Status: <span className={`status-pill status-pill--${statusTone(runtimeStatus)}`}>{runtimeStatus}</span>
                  </p>
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
    </>
  );
}
