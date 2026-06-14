import { MarketGraphSection } from '../../components/charts/market-graph-section';
import { SimulationModeBadge } from '../../components/ui/simulation-mode-badge';
import { getMessages } from '../../lib/i18n/messages';
import { getRequestLocale } from '../../server/i18n/locale';
import { getMarketGraphData } from '../../server/services/market-graph-service';
import { getNewsStreamData } from '../../server/services/news-service';
import { perfLog, perfNow } from '../../server/lib/perf';
import { getWorkspaceTrackedSymbols } from '../../server/services/workspace-service';

export const revalidate = 30;

export default async function MarketPage() {
  const pageStart = perfNow();
  // locale and preferredSymbols are independent — run them in parallel
  const [locale, preferredSymbols] = await Promise.all([
    getRequestLocale(),
    getWorkspaceTrackedSymbols(20),
  ]);
  const messages = getMessages(locale);
  const [graph, news] = await Promise.all([
    getMarketGraphData({
      ...(preferredSymbols.length > 0 ? { preferredSymbols } : {}),
    }),
    getNewsStreamData().catch(() => ({ items: [] as never[] })),
  ]);
  perfLog('page:/market total', pageStart);

  return (
    <>
      {/* ── Compact Command Header — above the chart ── */}
      <header className="observe-command-header">
        <div className="observe-command-header__inner">
          <div className="observe-command-header__top">
            <div className="observe-command-header__identity">
              <span className="observe-command-header__eyebrow">Market / Graph Workstation</span>
              <h1 className="observe-command-header__title">{messages.marketGraph.title}</h1>
              <p className="observe-command-header__sub">
                {messages.marketGraph.subtitle}
              </p>
            </div>
            <div className="observe-command-header__chips">
              <span className="observe-chip observe-chip--info" title="Market data provider">
                {graph.meta.provider.toUpperCase()}
              </span>
              <span className="observe-chip observe-chip--neutral" title="Assets tracked">
                {graph.assets.length} Assets
              </span>
              <span className="observe-chip observe-chip--neutral" title="History window">
                2Y History
              </span>
              <SimulationModeBadge />
            </div>
          </div>
          <nav className="observe-command-header__actions" aria-label="Market primary actions">
            <a href="/" className="button button--secondary observe-command-action">Home</a>
            <a href="/observe" className="button button--secondary observe-command-action">Observer</a>
            <a href="/signals" className="button button--secondary observe-command-action">Signals</a>
            <a href="/stocks" className="button button--secondary observe-command-action">Stocks</a>
            <a href="/invest/simulation" className="button button--secondary observe-command-action">Simulation</a>
          </nav>
        </div>
      </header>

      <MarketGraphSection graph={graph} messages={messages} trackedSymbols={preferredSymbols} newsItems={news.items} />
    </>
  );
}
