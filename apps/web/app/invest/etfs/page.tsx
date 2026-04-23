import { Section } from '../../../components/ui/section';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { MarketGraphSection } from '../../../components/charts/market-graph-section';
import { InvestableAssetCard } from '../../../components/invest/investable-asset-card';
import { getMessages } from '../../../lib/i18n/messages';
import { getRequestLocale } from '../../../server/i18n/locale';
import { formatFreshnessLabel, formatPercentChange, formatUsdPrice } from '../../../server/lib/quote-display';
import { getMarketGraphData } from '../../../server/services/market-graph-service';
import { getInvestOverviewData } from '../../../server/services/invest-service';

export const dynamic = 'force-dynamic';

export default async function InvestEtfsPage() {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const [invest, graph] = await Promise.all([
    getInvestOverviewData(locale, messages),
    getMarketGraphData({
      assetClass: 'etf',
      preferredSymbols: ['SPY', 'QQQ', 'VTI', 'IWM', 'TLT'],
      limit: 10,
    }),
  ]);
  const group = invest.groupedAssets.find((item) => item.assetClass === 'etf');

  return (
    <>
      <MarketGraphSection graph={graph} messages={messages} />

      <Section className="dashboard-section dashboard-section--hero dashboard-section--after-market-graph">
        <WorkstationPageHeader
          eyebrow="Invest / ETFs"
          title="ETF benchmark lane"
          description="Use benchmark products as broad market anchors for allocation planning, hedging, and guarded simulation workflows."
          summary="ETF simulation is enabled. Future live execution still requires broker product mapping, permissions, and readiness gates."
          statusLabel={invest.statusLabel}
          statusTone={invest.statusTone}
          meta={[
            { label: 'Coverage', value: `${group?.items.length ?? 0} products` },
            { label: 'Action availability', value: 'Simulation enabled' },
            { label: 'Last updated', value: invest.lastUpdatedLabel },
          ]}
          actions={[
            { href: '/invest', label: 'Back to invest' },
            { href: '/dashboard', label: 'Open dashboard' },
            { href: '/invest/simulation?lane=manual_multi_asset_lane', label: 'Open multi-asset simulation' },
          ]}
        />
      </Section>
      <Section className="dashboard-section">
        <div className="analytics-two-grid">
          {(group?.items ?? []).map((item) => (
            <InvestableAssetCard
              key={item.assetId}
              href="/invest/etfs"
              title={item.name}
              symbol={item.symbol}
              thesis={item.thesis}
              priceLabel={formatUsdPrice(item.price, locale, messages.common.unavailable)}
              changeLabel={formatPercentChange(item.changePercent, messages.common.partial)}
              freshnessLabel={formatFreshnessLabel(item.lastUpdatedAt, locale, messages.common.unavailable)}
              actionAvailability={item.actionAvailability}
              insightStance={item.insightStance}
              riskSummary={item.riskSummary}
            />
          ))}
        </div>
      </Section>
    </>
  );
}
