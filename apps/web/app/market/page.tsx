import { Section } from '../../components/ui/section';
import { WorkstationPageHeader } from '../../components/asset/workstation-page-header';
import { MarketGraphSection } from '../../components/charts/market-graph-section';
import { getMessages } from '../../lib/i18n/messages';
import { getRequestLocale } from '../../server/i18n/locale';
import { getMarketGraphData } from '../../server/services/market-graph-service';
import { perfLog, perfNow } from '../../server/lib/perf';

export const revalidate = 30;

export default async function MarketPage() {
  const pageStart = perfNow();
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const graph = await getMarketGraphData();
  perfLog('page:/market total', pageStart);

  return (
    <>
      <MarketGraphSection graph={graph} messages={messages} />

      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow={messages.shell.nav.marketOverview}
          title={messages.marketGraph.title}
          description={messages.marketGraph.subtitle}
          summary={messages.common.simulationDisclosure}
          statusLabel={graph.provider.toUpperCase()}
          statusTone="info"
          meta={[
            { label: messages.common.coverage, value: String(graph.assets.length) },
            { label: messages.common.sourceSummary, value: graph.provider.toUpperCase() },
            { label: messages.common.historyWindow, value: '2Y' },
          ]}
          actions={[
            { href: '/', label: messages.common.home },
            { href: '/stocks', label: messages.shell.nav.stocks },
            { href: '/invest/simulation', label: messages.simulation.navLabel },
          ]}
        />
      </Section>
    </>
  );
}
