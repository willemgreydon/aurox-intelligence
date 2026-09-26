import { SignalsCockpit } from '../../components/signals/signals-cockpit';
import { SimulationModeBadge } from '../../components/ui/simulation-mode-badge';
import { Section } from '../../components/ui/section';
import { SignalAccuracyMatrix } from '../../components/charts/signal-accuracy-matrix';
import { getSignalAccuracyViewModel } from '../../server/services/signal-accuracy-service';
import { getSignalsPageData } from '../../server/services/analysis-service';
import { assertSerializableProps } from '../../lib/assert-serializable-props';
import { getMessages } from '../../lib/i18n/messages';
import { getRequestLocale } from '../../server/i18n/locale';

export const dynamic = 'force-dynamic';

export default async function SignalsPage() {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const [data, signalAccuracy] = await Promise.all([
    getSignalsPageData(),
    getSignalAccuracyViewModel().catch(() => null),
  ]);

  assertSerializableProps('signals.data', data as Record<string, unknown>);

  const statusTone = data.overview.statusTone === 'success' ? 'success'
    : data.overview.statusTone === 'danger' ? 'danger'
    : 'warning';

  return (
    <>
      {/* ── Compact Command Header ── */}
      <header className="observe-command-header">
        <div className="observe-command-header__inner">
          <div className="observe-command-header__top">
            <div className="observe-command-header__identity">
              <span className="observe-command-header__eyebrow">Signals / Intelligence</span>
              <h1 className="observe-command-header__title">Signal Intelligence Cockpit</h1>
              <p className="observe-command-header__sub">
                Deterministic technical signals derived from provider-backed price history across tracked equities and crypto.
              </p>
            </div>
            <div className="observe-command-header__chips">
              <span className={`observe-chip observe-chip--${statusTone}`} title="Signal system status">
                {data.overview.statusLabel.toUpperCase()}
              </span>
              <span className="observe-chip observe-chip--neutral" title="Tracked signals">
                {data.signals.length} Signals
              </span>
              <SimulationModeBadge />
              <span className="observe-chip observe-chip--neutral" title={`Data as of ${data.overview.lastUpdatedLabel}`}>
                {data.overview.lastUpdatedLabel}
              </span>
            </div>
          </div>
          <nav className="observe-command-header__actions" aria-label="Signals primary actions">
            <a href="/observe" className="button button--secondary observe-command-action">Observer</a>
            <a href="/forecasts" className="button button--secondary observe-command-action">Forecasts</a>
            <a href="/invest/simulation" className="button button--secondary observe-command-action">Simulation</a>
            <a href="/portfolio/intelligence" className="button button--secondary observe-command-action">Portfolio Intel</a>
            <a href="/alerts" className="button button--secondary observe-command-action">Alerts</a>
          </nav>
        </div>
      </header>

      <SignalsCockpit data={data} labels={messages.signals} />

      {signalAccuracy ? (
        <Section
          id="signal-accuracy"
          className="dashboard-section dashboard-section--compact"
          containerClassName="shell-container--workstation"
        >
          <header className="dashboard-section-heading">
            <div>
              <div className="section__eyebrow">Validation</div>
              <h2 className="dashboard-section-heading__title">Signal Accuracy</h2>
              <p className="dashboard-section-heading__description">
                Empirical directional hit rate of the deterministic signal, measured against realized forward
                returns from recorded signal history. Sample size is shown first — small samples are not
                treated as authoritative.
              </p>
            </div>
          </header>
          <SignalAccuracyMatrix vm={signalAccuracy} />
        </Section>
      ) : null}
    </>
  );
}
