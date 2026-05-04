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
      id: 'markets',
      label: messages.shell.nav.markets,
      items: [
        { href: '/market', label: messages.shell.nav.marketOverview, icon: 'MR' },
        { href: '/stocks', label: messages.shell.nav.stocks, icon: 'ST' },
        { href: '/news', label: messages.shell.nav.newsStream, icon: 'NW' },
        { href: '/fx', label: messages.shell.nav.fx, icon: 'FX' },
      ],
    },
    {
      id: 'analytics',
      label: messages.shell.nav.analytics,
      items: [
        { href: '/dashboard', label: messages.shell.nav.dashboard, icon: 'DB' },
        { href: '/signals', label: messages.shell.nav.signals, icon: 'SG' },
        { href: '/forecasts', label: messages.shell.nav.forecasts, icon: 'FC' },
      ],
    },
    {
      id: 'invest',
      label: messages.shell.nav.invest,
      items: [
        { href: '/invest', label: messages.shell.nav.investHome, icon: 'IN' },
        { href: '/invest/simulation', label: messages.shell.nav.simulation, icon: 'SM' },
        { href: '/invest/stocks', label: messages.shell.nav.investStocks, icon: 'ST' },
        { href: '/invest/etfs', label: messages.shell.nav.investEtfs, icon: 'ET' },
        { href: '/invest/crypto', label: messages.shell.nav.investCrypto, icon: 'CR' },
        { href: '/invest/accounts', label: messages.shell.nav.investAccounts, icon: 'AC' },
      ],
    },
    {
      id: 'ops',
      label: messages.shell.nav.ops,
      items: [
        { href: '/admin', label: messages.shell.nav.admin, icon: 'AD' },
        { href: '/admin/monitoring', label: messages.shell.nav.monitoring, icon: 'MN' },
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
