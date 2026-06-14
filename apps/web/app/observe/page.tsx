import { ObserveWorkstation } from '../../components/observe/observe-workstation';
import { SimulationModeBadge } from '../../components/ui/simulation-mode-badge';
import { getObserveViewModel } from '../../server/services/market-observation-service';
import { getMessages } from '../../lib/i18n/messages';
import { getRequestLocale } from '../../server/i18n/locale';
import { requireCurrentSession } from '../../server/auth/session';
import { assertSerializableProps } from '../../lib/assert-serializable-props';
import { perfLog, perfNow } from '../../server/lib/perf';

export const dynamic = 'force-dynamic';

export default async function ObservePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const pageStart = perfNow();
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
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

  const statusTone = model.degraded ? 'warning' : 'success';
  const statusLabel = model.degraded ? 'DEGRADED' : 'NOMINAL';
  const criticalCount = model.summary.criticalCount;
  const warningCount = model.summary.warningCount;
  const generatedLabel = new Date(model.generatedAt).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  assertSerializableProps('observe.model', model as Record<string, unknown>);
  perfLog('page:/observe total', pageStart);

  return (
    <>
      {/* ── Compact Command Header ── */}
      <header className="observe-command-header">
        <div className="observe-command-header__inner">
          <div className="observe-command-header__top">
            <div className="observe-command-header__identity">
              <span className="observe-command-header__eyebrow">Observe / Market Intelligence</span>
              <h1 className="observe-command-header__title">AI Market Observation Workstation</h1>
              <p className="observe-command-header__sub">
                Simulation-first monitoring for signals, anomalies, risk, news, and trade readiness.
              </p>
            </div>
            <div className="observe-command-header__chips">
              <span className={`observe-chip observe-chip--${statusTone}`} title="System status">
                {statusLabel}
              </span>
              <span className="observe-chip observe-chip--neutral" title="Market regime">
                {model.regime.label}
              </span>
              {criticalCount > 0 && (
                <span className="observe-chip observe-chip--danger" title="Critical items requiring attention">
                  {criticalCount} Critical
                </span>
              )}
              {warningCount > 0 && (
                <span className="observe-chip observe-chip--warning" title="Warning items">
                  {warningCount} Warning
                </span>
              )}
              <SimulationModeBadge />
              <span className="observe-chip observe-chip--neutral" title={`Generated at ${generatedLabel}`}>
                {generatedLabel}
              </span>
            </div>
          </div>
          <nav className="observe-command-header__actions" aria-label="Observe primary actions">
            <a href="/alerts" className="button button--secondary observe-command-action">Alert Center</a>
            <a href="/signals" className="button button--secondary observe-command-action">Signals</a>
            <a href="/invest/simulation" className="button button--secondary observe-command-action">Simulation</a>
            <a href="/market" className="button button--secondary observe-command-action">Market</a>
            <a href="/portfolio/intelligence" className="button button--secondary observe-command-action">Portfolio Intel</a>
          </nav>
        </div>
      </header>

      <ObserveWorkstation model={model} labels={messages.observe} />
    </>
  );
}
