import type { Locale } from '@repo/api-contracts';
import { getMarketTickerData } from '../../server/services/market-ticker-service';
import { getSimulationOverviewDataForUser } from '../../server/services/stock-simulation-service';
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
        getSimulationOverviewDataForUser(auth.user.id)
          .then((overview) => ({
            portfolioValue: overview.summary.portfolioValue,
            investedCapital: overview.summary.investedCapital,
          }))
          .catch(() => null),
        HEADER_PORTFOLIO_TIMEOUT_MS,
        null,
      )
    : null;

  const navGroups: NavGroup[] = [
    {
      id: 'core-workstations',
      label: messages.shell.nav.markets,
      items: [
        { href: '/dashboard', label: messages.shell.nav.dashboard, icon: 'DB', description: 'Executive market intelligence command center.' },
        { href: '/market', label: 'Market', icon: 'MR', description: 'Live chart workstation and cockpit modules.' },
        { href: '/observe', label: 'Observe', icon: 'OB', description: 'AI observer feed, anomalies, timeline, and readiness.' },
        { href: '/alerts', label: 'Alerts', icon: 'AL', description: 'Escalated intelligence alerts with replay links.' },
        { href: '/signals', label: messages.shell.nav.signals, icon: 'SG', description: 'Signal interpretation and explainability views.' },
        { href: '/portfolio/intelligence', label: 'Portfolio Intelligence', icon: 'PI', description: 'Allocation, risk overlay, and portfolio diagnostics.' },
        { href: '/invest/simulation', label: messages.shell.nav.simulation, icon: 'SM', description: 'Simulation-only order preparation and execution lab.' },
      ],
    },
    {
      id: 'markets',
      label: messages.shell.nav.markets,
      items: [
        { href: '/invest/stocks', label: messages.shell.nav.investStocks, icon: 'ST', description: 'Stock lane with list/grid and simulation actions.' },
        { href: '/invest/etfs', label: messages.shell.nav.investEtfs, icon: 'ET', description: 'ETF lane with holdings and risk context.' },
        { href: '/invest/crypto', label: messages.shell.nav.investCrypto, icon: 'CR', description: 'Crypto lane with volatility and micro info module.' },
        { href: '/news', label: messages.shell.nav.newsStream, icon: 'NW', description: 'Cross-asset news stream and relevance context.' },
        { href: '/watchlist', label: 'Watchlist', icon: 'WL', description: 'Interactive watchlist lanes with simulation buy/sell/remove actions.' },
      ],
    },
    {
      id: 'intelligence',
      label: 'Intelligence',
      items: [
        { href: '/observe', label: 'AI Market Observer', icon: 'AO', description: 'Actionable observation feed and explainability.' },
        { href: '/alerts', label: 'Alert Center', icon: 'AC', description: 'Severity-grouped market intelligence alerts.' },
        { href: '/observe?section=anomalies', label: 'Anomaly Radar', icon: 'AR', description: 'Detect and rank market anomalies by severity.' },
        { href: '/observe?section=timeline', label: 'Market Event Timeline', icon: 'TL', description: 'Chronological event stream with outcomes.' },
        { href: '/observe?section=readiness', label: 'Trade Readiness', icon: 'TR', description: 'Simulation-only readiness checks.' },
        { href: '/portfolio/intelligence', label: 'Risk Overlay', icon: 'RO', description: 'Portfolio risk overlays and concentration view.' },
        { href: '/markets/intelligence', label: 'Reports', icon: 'RP', description: 'Market intelligence views and summaries.' },
      ],
    },
    {
      id: 'admin',
      label: messages.shell.nav.admin,
      items: [
        { href: '/admin', label: messages.shell.nav.admin, icon: 'AD', description: 'System-level administrative controls.' },
        { href: '/admin/monitoring', label: messages.shell.nav.monitoring, icon: 'MN', description: 'Monitoring overview across providers/services.' },
        { href: '/admin/monitoring/providers', label: 'Provider Monitoring', icon: 'PM', description: 'Per-provider health, config, and monitoring toggles.' },
      ],
    },
    {
      id: 'legal',
      label: 'Legal',
      items: [
        { href: '/legal', label: 'Legal Overview', icon: 'LG', description: 'Legal index and policy navigation.' },
        { href: '/legal/terms', label: 'Terms', icon: 'TM', description: 'Terms of use and platform conditions.' },
        { href: '/legal/privacy', label: 'Privacy', icon: 'PR', description: 'Privacy policy and data usage notes.' },
        { href: '/legal/risk-disclosure', label: 'Risk Disclosure', icon: 'RK', description: 'Trading and market risk disclosure.' },
        { href: '/legal/simulation-disclaimer', label: 'Simulation Disclaimer', icon: 'SD', description: 'Simulation-only constraints and expectations.' },
        { href: '/legal/ai-disclaimer', label: 'AI Disclaimer', icon: 'AI', description: 'AI outputs may be wrong and require review.' },
        { href: '/legal/market-data-disclaimer', label: 'Market Data Disclaimer', icon: 'MD', description: 'Data delay/completeness limitations.' },
        { href: '/legal/cookie-notice', label: 'Cookie Notice', icon: 'CK', description: 'Cookie and tracking notice.' },
        { href: '/legal/contact-support', label: 'Contact Support', icon: 'CS', description: 'Support and contact information.' },
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
