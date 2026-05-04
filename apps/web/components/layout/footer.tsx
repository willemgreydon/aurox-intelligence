import Link from 'next/link';
import type { AppMessages } from '../../lib/i18n/messages';

type FooterProps = {
  messages: AppMessages;
};

type FooterLinkGroup = {
  title: string;
  links: Array<{ label: string; href: string }>;
};

function buildFooterGroups(messages: AppMessages): FooterLinkGroup[] {
  return [
    {
      title: messages.footer.groupMarkets,
      links: [
        { label: messages.shell.nav.marketOverview, href: '/market' },
        { label: messages.footer.stocksLink, href: '/stocks' },
        { label: messages.footer.newsLink, href: '/news' },
        { label: messages.footer.fxLink, href: '/fx' },
        { label: messages.footer.signalsLink, href: '/signals' },
        { label: messages.footer.forecastsLink, href: '/forecasts' },
      ],
    },
    {
      title: messages.footer.groupInvest,
      links: [
        { label: messages.shell.nav.investHome, href: '/invest' },
        { label: messages.footer.stockAllocationLink, href: '/invest/stocks' },
        { label: messages.footer.etfComparisonLink, href: '/invest/etfs' },
        { label: messages.footer.cryptoTrackingLink, href: '/invest/crypto' },
        { label: messages.footer.simulationLink, href: '/invest/simulation' },
      ],
    },
    {
      title: messages.footer.groupPlatform,
      links: [
        { label: messages.shell.nav.dashboard, href: '/dashboard' },
        { label: messages.footer.adminLink, href: '/admin' },
        { label: messages.footer.monitoringLink, href: '/admin/monitoring' },
        { label: messages.footer.accountLink, href: '/account' },
        { label: messages.footer.profileLink, href: '/account/profile' },
      ],
    },
    {
      title: messages.footer.groupLegal,
      links: [
        { label: messages.footer.legalLink, href: '/legal' },
        { label: messages.footer.termsLink, href: '/legal/terms' },
        { label: messages.footer.privacyLink, href: '/legal/privacy' },
        { label: messages.footer.riskLink, href: '/legal/risk-disclosure' },
        { label: messages.footer.imprintLink, href: '/legal/imprint' },
      ],
    },
  ];
}

export function Footer({ messages }: FooterProps) {
  const footerGroups = buildFooterGroups(messages);

  return (
    <footer className="site-footer">
      <div className="shell-container">
        <div className="site-footer__grid site-footer__grid--wide">
          <div className="site-footer__brand">
            <h2 className="site-footer__title">{messages.shell.brandTitle}</h2>
            <p className="site-footer__meta">
              {messages.footer.brandMeta}
            </p>
            <p className="site-footer__meta site-footer__meta--disclosure">
              {messages.footer.disclosure}
            </p>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <h2 className="site-footer__title">{group.title}</h2>
              <ul className="site-footer__list">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="site-footer__link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="site-footer__bottom">
          <div className="site-footer__copyright">
            &copy; 2026 {messages.shell.brandTitle}. {messages.footer.copyrightSuffix}
          </div>
          <div className="site-footer__legal-links">
            <Link href="/legal/terms" className="site-footer__link site-footer__link--small">{messages.footer.termsLink}</Link>
            <Link href="/legal/privacy" className="site-footer__link site-footer__link--small">{messages.footer.privacyLink}</Link>
            <Link href="/legal/risk-disclosure" className="site-footer__link site-footer__link--small">{messages.footer.riskLink}</Link>
            <Link href="/legal/imprint" className="site-footer__link site-footer__link--small">{messages.footer.imprintLink}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
