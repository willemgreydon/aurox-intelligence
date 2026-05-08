import { Section } from '../../components/ui/section';
import { WorkstationPageHeader } from '../../components/asset/workstation-page-header';
import { ObserveWorkstation } from '../../components/observe/observe-workstation';
import { getObserveViewModel } from '../../server/services/market-observation-service';
import { requireCurrentSession } from '../../server/auth/session';

export const dynamic = 'force-dynamic';

export default async function ObservePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireCurrentSession('/login');
  const params = (await searchParams) ?? {};
  const pick = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const model = await getObserveViewModel({
    userId: session.user.id,
    watchlistSort: (pick(params.watchlistSort) as never) ?? 'strongest_signal',
    watchlistFilter: {
      assetClass: (pick(params.assetClass) as never) ?? 'all',
      signalAction: (pick(params.signalAction) as never) ?? 'all',
      risk: (pick(params.risk) as never) ?? 'all',
      news: (pick(params.news) as never) ?? 'all',
      search: pick(params.search) ?? '',
    },
  });

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero dashboard-section--compact observe-page__hero">
        <WorkstationPageHeader
          eyebrow="Observe"
          title="AI Market Observation Workstation"
          description="Premium simulation-first monitoring surface for signals, anomalies, risk, news, and trade readiness."
          summary="No live auto-trading is enabled. All outputs are explainable observations and simulation-only preparation."
          statusLabel={model.degraded ? 'DEGRADED' : 'NOMINAL'}
          statusTone={model.degraded ? 'warning' : 'success'}
          meta={[
            { label: 'Generated', value: new Date(model.generatedAt).toLocaleString('en-US') },
            { label: 'Regime', value: model.regime.label },
            { label: 'Critical items', value: String(model.summary.criticalCount) },
          ]}
          actions={[
            { href: '/market', label: 'Market workstation' },
            { href: '/signals', label: 'Signals' },
            { href: '/portfolio/intelligence', label: 'Portfolio intelligence' },
            { href: '/invest/simulation', label: 'Simulation' },
          ]}
        />
      </Section>
      <ObserveWorkstation model={model} />
    </>
  );
}
