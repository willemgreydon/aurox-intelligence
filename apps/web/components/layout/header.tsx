import type { Locale } from '@repo/api-contracts';
import { getMarketTickerData } from '../../server/services/market-ticker-service';
import { getSimulationPortfolioSummaryForUser } from '../../server/services/stock-simulation-service';
import type { NavGroup } from './site-nav';
import { getOptionalCurrentSession } from '../../server/auth/session';
import type { AppMessages } from '../../lib/i18n/messages';
import { HeaderClient } from './header-client';
import { withTimeout } from '../../server/lib/with-timeout';

// Hard cap on how long the header waits for slow data before degrading gracefully.
const HEADER_TICKER_TIMEOUT_MS = 3_000;
const HEADER_PORTFOLIO_TIMEOUT_MS = 2_000;

type HeaderProps = {
  locale: Locale;
  messages: AppMessages;
};

export async function Header({ locale, messages }: HeaderProps) {
  const [ticker, auth] = await Promise.all([
    withTimeout(
      getMarketTickerData(locale, messages),
      HEADER_TICKER_TIMEOUT_MS,
      // Degraded ticker: empty items so the header renders fast
      {
        title: messages.shell.marketPulse,
        status: 'attention' as const,
        freshnessState: 'unavailable' as const,
        lastUpdatedAt: null,
        sourceSummary: messages.ticker.emptyState,
        items: [],
        emptyStateMessage: messages.ticker.emptyState,
        statusLabel: messages.status.attention,
        statusTone: 'warning' as const,
        lastUpdatedLabel: messages.common.unavailable,
      },
    ),
    getOptionalCurrentSession(),
  ]);

  const portfolioSnapshot = auth
    ? await withTimeout(
        getSimulationPortfolioSummaryForUser(auth.user.id).catch(() => null),
        HEADER_PORTFOLIO_TIMEOUT_MS,
        null,
      )
    : null;

  // Information architecture: ordered as the user's decision funnel —
  //   Markets (discover) -> Intelligence (understand) -> Invest (act) -> Admin (operate).
  // De-duplicated (each destination appears once), Legal moved to the footer, and
  // Observe sub-views (anomalies / timeline / readiness) are in-page sections, not
  // separate nav destinations. Each group stays within Miller's 7+/-2 for scannability.
  const navGroups: NavGroup[] = [
    {
      id: 'markets',
      label: messages.shell.nav.markets,
      items: [
        { href: '/dashboard', label: messages.shell.nav.dashboard, icon: 'DB', description: 'Command center: market posture, positions, and next actions.' },
        { href: '/market', label: 'Market', icon: 'MR', description: 'Live chart workstation and cockpit modules.' },
        { href: '/invest/stocks', label: messages.shell.nav.investStocks, icon: 'ST', description: 'Stock lane with list/grid and simulation actions.' },
        { href: '/invest/etfs', label: messages.shell.nav.investEtfs, icon: 'ET', description: 'ETF lane with holdings and risk context.' },
        { href: '/invest/crypto', label: messages.shell.nav.investCrypto, icon: 'CR', description: 'Crypto lane with volatility and micro info module.' },
        { href: '/news', label: messages.shell.nav.newsStream, icon: 'NW', description: 'Cross-asset news stream and relevance context.' },
        { href: '/watchlist', label: 'Watchlist', icon: 'WL', description: 'Tracked assets with quick simulation actions.' },
      ],
    },
    {
      id: 'intelligence',
      label: 'Intelligence',
      items: [
        { href: '/signals', label: messages.shell.nav.signals, icon: 'SG', description: 'Signal scores, confidence, and explainability.' },
        { href: '/forecasts', label: messages.shell.nav.forecasts, icon: 'FC', description: 'Forecast scenarios with confidence intervals.' },
        { href: '/observe', label: 'AI Observer', icon: 'OB', description: 'Observation feed, anomalies, timeline, and readiness.' },
        { href: '/alerts', label: 'Alerts', icon: 'AL', description: 'Severity-grouped intelligence alerts with replay.' },
        { href: '/markets/rankings', label: 'Rankings', icon: 'RK', description: 'Cross-asset ranking and screening.' },
        { href: '/markets/intelligence', label: 'Reports', icon: 'RP', description: 'Market intelligence views and summaries.' },
      ],
    },
    {
      id: 'invest',
      label: messages.shell.nav.simulation,
      items: [
        { href: '/invest/simulation', label: messages.shell.nav.simulation, icon: 'SM', description: 'Simulation-only order preparation and execution lab.' },
        { href: '/invest/portfolio', label: 'Portfolio', icon: 'PF', description: 'Holdings, valuation, and allocation read models.' },
        { href: '/portfolio/intelligence', label: 'Portfolio Intelligence', icon: 'PI', description: 'Allocation, risk overlay, and concentration diagnostics.' },
        { href: '/invest/orders', label: 'Orders', icon: 'OR', description: 'Simulated order history and lifecycle.' },
        { href: '/finance', label: 'Claude Finance', icon: 'CF', description: 'Simulation-only finance cockpit and preview activity.' },
        { href: '/invest/accounts', label: 'Accounts', icon: 'AC', description: 'Simulation accounts, capital, and lane setup.' },
        { href: '/invest/broker-modes', label: 'Broker Modes', icon: 'BM', description: 'Execution-mode and autonomy activation per lane.' },
        { href: '/invest/live-readiness', label: 'Live Readiness', icon: 'LR', description: 'Gated readiness checklist for live-capable modes.' },
      ],
    },
    {
      id: 'admin',
      label: messages.shell.nav.admin,
      items: [
        { href: '/admin', label: messages.shell.nav.admin, icon: 'AD', description: 'System-level administrative controls.' },
        { href: '/admin/monitoring', label: messages.shell.nav.monitoring, icon: 'MN', description: 'Monitoring overview across providers/services.' },
        { href: '/admin/monitoring/providers', label: 'Provider Monitoring', icon: 'PM', description: 'Per-provider health, config, and monitoring toggles.' },
        { href: '/invest/broker-health', label: 'Broker Health', icon: 'BH', description: 'Broker connectivity and adapter diagnostics.' },
      ],
    },
  ];

  return (
    <HeaderClient
      locale={locale}
      messages={messages}
      ticker={ticker}
      auth={
        auth
          ? {
              id: auth.user.id,
              name: auth.user.name,
              email: auth.user.email,
              role: auth.user.role,
              avatarUrl: auth.user.avatarUrl,
              createdAt: auth.user.createdAt,
              updatedAt: auth.user.updatedAt,
            }
          : null
      }
      navGroups={navGroups}
      portfolioSnapshot={portfolioSnapshot}
    />
  );
}
