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
      title: messages.footer.groupPlatform,
      links: [
        { label: messages.shell.nav.dashboard, href: '/dashboard' },
        { label: messages.shell.nav.investHome, href: '/invest/portfolio' },
        { label: messages.shell.nav.signals, href: '/signals' },
        { label: messages.footer.newsLink, href: '/news' },
        { label: messages.shell.nav.forecasts, href: '/forecasts' },
      ],
    },
    {
      title: messages.footer.groupMarkets,
      links: [
        { label: messages.footer.stocksLink, href: '/invest/stocks' },
        { label: messages.footer.etfsLink, href: '/invest/etfs' },
        { label: messages.footer.cryptoLink, href: '/invest/crypto' },
        { label: messages.footer.macroLink, href: '/fx' },
        { label: messages.footer.watchlistLink, href: '/watchlist' },
      ],
    },
    {
      title: messages.footer.groupIntelligence,
      links: [
        { label: messages.footer.aiBrokerLink, href: '/invest/broker-modes' },
        { label: messages.footer.riskEngineLink, href: '/legal/risk-disclosure' },
        { label: messages.footer.signalFrameworkLink, href: '/signals' },
        { label: messages.footer.simulationShortLink, href: '/invest/simulation' },
        { label: messages.footer.adminMonitorLink, href: '/admin/monitoring' },
      ],
    },
    {
      title: messages.footer.groupLegal,
      links: [
        { label: messages.footer.termsLink, href: '/legal/terms' },
        { label: messages.footer.privacyLink, href: '/legal/privacy' },
        { label: messages.footer.cookieNoticeLink, href: '/legal/cookie-notice' },
        { label: messages.footer.riskLink, href: '/legal/risk-disclosure' },
        { label: messages.footer.aiDisclaimerLink, href: '/legal/ai-disclaimer' },
        { label: messages.footer.marketDataDisclaimerLink, href: '/legal/market-data-disclaimer' },
        { label: messages.footer.simulationDisclaimerLink, href: '/legal/simulation-disclaimer' },
        { label: messages.footer.contactSupportLink, href: '/legal/contact-support' },
        { label: messages.footer.documentationLink, href: '/legal' },
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
