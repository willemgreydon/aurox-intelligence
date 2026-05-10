import { Section } from '../../components/ui/section';
import { WorkstationPageHeader } from '../../components/asset/workstation-page-header';
import { AlertCenterPanel } from '../../components/alerts/alert-center-panel';
import { requireCurrentSession } from '../../server/auth/session';
import { getAlertCenterViewModel } from '../../server/services/alert-center-service';
import { assertSerializableProps } from '../../lib/assert-serializable-props';

export const dynamic = 'force-dynamic';

export default async function AlertsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireCurrentSession('/login');
  const params = (await searchParams) ?? {};
  const pick = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

  const model = await getAlertCenterViewModel({
    userId: session.user.id,
    filter: {
      severity: (pick(params.severity) as never) ?? 'all',
      category: (pick(params.category) as never) ?? 'all',
      assetClass: (pick(params.assetClass) as never) ?? 'all',
      source: (pick(params.source) as never) ?? 'all',
      status: (pick(params.status) as never) ?? 'all',
      search: pick(params.search) ?? '',
    },
  });

  assertSerializableProps('alerts.model', model as Record<string, unknown>);

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero dashboard-section--compact">
        <WorkstationPageHeader
          eyebrow="ALERTS / INTELLIGENCE"
          title="Alert Center"
          description="Prioritized market, signal, risk, provider and simulation alerts."
          summary="Observation and simulation context only. No live trading or auto execution is enabled."
          statusLabel={model.degraded ? 'DEGRADED' : 'NOMINAL'}
          statusTone={model.degraded ? 'warning' : 'success'}
          meta={[
            { label: 'Open', value: String(model.summary.open) },
            { label: 'Critical', value: String(model.summary.critical) },
            { label: 'Warning', value: String(model.summary.warning) },
            { label: 'Snoozed', value: String(model.summary.snoozed) },
            { label: 'Simulation only', value: 'Enabled' },
            { label: 'Last refreshed', value: new Date(model.generatedAt).toLocaleString('en-US') },
          ]}
          actions={[
            { href: '/observe', label: 'Open Observer' },
            { href: '/market', label: 'Market' },
            { href: '/signals', label: 'Signals' },
          ]}
        />
      </Section>
      <AlertCenterPanel model={model} />
    </>
  );
}
