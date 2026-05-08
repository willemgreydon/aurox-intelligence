import type { Locale } from '@repo/api-contracts';
import { getMarketTickerData } from '../../server/services/market-ticker-service';
import { getSimulationOverviewDataForUser } from '../../server/services/stock-simulation-service';
import type { NavGroup } from './site-nav';
import { getOptionalCurrentSession } from '../../server/auth/session';
import type { AppMessages } from '../../lib/i18n/messages';
import { HeaderClient } from './header-client';

type HeaderProps = {
  locale: Locale;
  messages: AppMessages;
};

export async function Header({ locale, messages }: HeaderProps) {
  const [ticker, auth] = await Promise.all([
    getMarketTickerData(locale, messages),
    getOptionalCurrentSession(),
  ]);
  const portfolioSnapshot = auth
    ? await getSimulationOverviewDataForUser(auth.user.id)
      .then((overview) => ({
        portfolioValue: overview.summary.portfolioValue,
        investedCapital: overview.summary.investedCapital,
      }))
      .catch(() => null)
    : null;
  const navGroups: NavGroup[] = [
    {
      id: 'core-workstations',
      label: 'Core Workstations',
      items: [
        { href: '/market', label: 'Market', icon: 'MR', description: 'Live chart workstation and cockpit modules.' },
        { href: '/observe', label: 'Observe', icon: 'OB', description: 'AI observer feed, anomalies, timeline, and readiness.' },
        { href: '/alerts', label: 'Alerts', icon: 'AL', description: 'Escalated intelligence alerts with replay links.' },
        { href: '/signals', label: 'Signals', icon: 'SG', description: 'Signal interpretation and explainability views.' },
        { href: '/portfolio/intelligence', label: 'Portfolio Intelligence', icon: 'PI', description: 'Allocation, risk overlay, and portfolio diagnostics.' },
        { href: '/invest/simulation', label: 'Simulation', icon: 'SM', description: 'Simulation-only order preparation and execution lab.' },
      ],
    },
    {
      id: 'markets',
      label: 'Markets',
      items: [
        { href: '/invest/stocks', label: 'Stocks', icon: 'ST', description: 'Stock lane with list/grid and simulation actions.' },
        { href: '/invest/etfs', label: 'ETFs', icon: 'ET', description: 'ETF lane with holdings and risk context.' },
        { href: '/invest/crypto', label: 'Crypto', icon: 'CR', description: 'Crypto lane with volatility and micro info module.' },
        { href: '/news', label: 'News', icon: 'NW', description: 'Cross-asset news stream and relevance context.' },
        { href: '/market', label: 'Watchlist', icon: 'WL', description: 'Watchlist mini-board in market workstation sidebar.' },
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
      label: 'Admin',
      items: [
        { href: '/admin', label: 'Admin', icon: 'AD', description: 'System-level administrative controls.' },
        { href: '/admin/monitoring', label: 'Admin Monitor', icon: 'MN', description: 'Monitoring overview across providers/services.' },
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
