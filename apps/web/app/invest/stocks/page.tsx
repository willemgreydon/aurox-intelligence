import { Section } from '../../../components/ui/section';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { InvestableAssetCard } from '../../../components/invest/investable-asset-card';
import { getMessages } from '../../../lib/i18n/messages';
import { getRequestLocale } from '../../../server/i18n/locale';
import { formatFreshnessLabel, formatPercentChange, formatUsdPrice } from '../../../server/lib/quote-display';
import { getInvestOverviewData } from '../../../server/services/invest-service';

export const dynamic = 'force-dynamic';

export default async function InvestStocksPage() {
  const locale = await getRequestLocale();
  const messages = getMessages(locale);
  const invest = await getInvestOverviewData(locale, messages);
  const group = invest.groupedAssets.find((item) => item.assetClass === 'stock');

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow="Invest / Stocks"
          title="Stocks"
          description="Research and planning surface for equity allocation intent, watchlist capture, and quote-aware stock comparison."
          summary="Actions remain simulated and planning-oriented until brokerage or order-routing integrations exist."
          statusLabel={invest.statusLabel}
          statusTone={invest.statusTone}
          meta={[
            { label: 'Coverage', value: `${group?.items.length ?? 0} symbols` },
            { label: 'Action availability', value: 'Simulated' },
            { label: 'Last updated', value: invest.lastUpdatedLabel },
          ]}
          actions={[
            { href: '/invest', label: 'Back to invest' },
            { href: '/stocks', label: 'Open stocks workstation' },
            { href: '/dashboard', label: 'Open dashboard' },
          ]}
        />
      </Section>
      <Section className="dashboard-section">
        <div className="analytics-three-grid">
          {(group?.items ?? []).map((item) => (
            <InvestableAssetCard
              key={item.assetId}
              href={`/stocks/${item.symbol}`}
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
