'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Locale } from '@repo/api-contracts';
import { ThemeToggle } from './theme-toggle';
import { MarketTicker } from './market-ticker';
import { MobileNav } from './mobile-nav';
import type { NavGroup } from './site-nav';
import { AccountMenu } from './account-menu';
import type { AppMessages } from '../../lib/i18n/messages';
import { LocaleSwitcher } from './locale-switcher';
import { SignOutButton } from '../auth/sign-out-button';
import type { MarketTickerViewModel } from '../../server/mappers/market-ticker-mapper';
import { CommandPalette } from './command-palette';

type HeaderClientProps = {
  locale: Locale;
  messages: AppMessages;
  ticker: MarketTickerViewModel;
  auth: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatarUrl: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  navGroups: NavGroup[];
  portfolioSnapshot: {
    portfolioValue: number;
    investedCapital: number;
  } | null;
};

function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function formatCompactUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function HeaderClient({ locale, messages, ticker, auth, navGroups, portfolioSnapshot }: HeaderClientProps) {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const previousDocumentOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [menuOpen]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 961px)');

    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setMenuOpen(false);
      }
    };

    if (mediaQuery.matches) {
      setMenuOpen(false);
    }

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const headerElement = headerRef.current;

    if (!headerElement) {
      return;
    }

    const updateHeaderOffset = () => {
      const measured = Math.max(0, Math.round(headerElement.getBoundingClientRect().height));
      root.style.setProperty('--site-header-offset', `${measured}px`);
    };

    updateHeaderOffset();

    let resizeObserver: ResizeObserver | null = null;

    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => updateHeaderOffset());
      resizeObserver.observe(headerElement);
    }

    window.addEventListener('orientationchange', updateHeaderOffset);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('orientationchange', updateHeaderOffset);
      root.style.removeProperty('--site-header-offset');
    };
  }, []);

  const overlayGroups = useMemo(
    () =>
      navGroups.map((group) => ({
        ...group,
        items: group.items.map((item) => ({
          ...item,
          active: isActivePath(pathname, item.href),
        })),
      })),
    [navGroups, pathname],
  );

  return (
    <>
      <header ref={headerRef} className={`site-header${isScrolled ? ' site-header--scrolled' : ''}`}>
        <div className="shell-container">
          <MarketTicker
            ticker={ticker}
            labels={{
              aria: messages.ticker.aria,
              emptyAria: messages.ticker.emptyAria,
            }}
          />
        </div>

        <div className="shell-container">
          <div className="site-header__inner">
            <Link href="/" className="site-brand" aria-label="Aurox Intelligence home">
              <span className="site-brand__mark" aria-hidden="true">
                <Image src="/aurox.svg" alt="" width={44} height={44} className="site-brand__mark-icon" />
              </span>
              <span className="site-brand__content">
                <span className="site-brand__title">{messages.shell.brandTitle}</span>
                <span className="site-brand__subtitle">{messages.shell.brandSubtitle}</span>
              </span>
            </Link>

            <div className="site-header__actions">
              <div className="site-nav__meta site-nav__meta--desktop">
                {auth && portfolioSnapshot ? (
                  <div className="nav-portfolio-mini" aria-label="Portfolio summary">
                    <span className="nav-portfolio-mini__item">
                      <span className="nav-portfolio-mini__label">Portfolio</span>
                      <strong className="nav-portfolio-mini__value">
                        {formatCompactUsd(portfolioSnapshot.portfolioValue)}
                      </strong>
                    </span>
                    <span className="nav-portfolio-mini__item">
                      <span className="nav-portfolio-mini__label">Invested</span>
                      <strong className="nav-portfolio-mini__value">
                        {formatCompactUsd(portfolioSnapshot.investedCapital)}
                      </strong>
                    </span>
                  </div>
                ) : null}
                <LocaleSwitcher locale={locale} label={messages.shell.language} compact />
                <ThemeToggle />
                {auth ? (
                  <AccountMenu
                    user={{
                      id: auth.id,
                      name: auth.name,
                      email: auth.email,
                      role: auth.role as 'member' | 'admin',
                      avatarUrl: auth.avatarUrl,
                      createdAt: auth.createdAt,
                      updatedAt: auth.updatedAt,
                    }}
                    labels={messages.shell.auth}
                  />
                ) : (
                  <div className="site-auth-links">
                    <Link href="/login" className="button button--secondary site-auth-links__button">
                      {messages.shell.auth.login}
                    </Link>
                    <Link href="/signup" className="button button--primary site-auth-links__button">
                      {messages.shell.auth.signup}
                    </Link>
                  </div>
                )}
              </div>

              <button
                ref={triggerRef}
                type="button"
                className={`burger-button${menuOpen ? ' burger-button--open' : ''}`}
                aria-label={menuOpen ? messages.shell.closeMenu : messages.shell.openMenu}
                aria-expanded={menuOpen}
                aria-controls="site-menu-overlay"
                onClick={() => setMenuOpen((value) => !value)}
              >
                <span className="burger-button__line" aria-hidden="true" />
                <span className="burger-button__line" aria-hidden="true" />
                <span className="burger-button__line" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="site-header__mobile-nav">
        <MobileNav
          menuOpen={menuOpen}
          onToggleMenu={() => setMenuOpen((value) => !value)}
          labels={{
            home: messages.common.home,
            market: messages.marketGraph.title,
            simulation: messages.simulation.navLabel,
            menu: messages.shell.menuLabel,
            openMenu: messages.shell.openMenu,
            closeMenu: messages.shell.closeMenu,
          }}
        />
      </div>

      {menuOpen ? (
        <div className="site-menu-overlay">
          <button
            type="button"
            className="site-menu-overlay__backdrop"
            aria-label={messages.shell.closeOverlay}
            onClick={() => setMenuOpen(false)}
          />
          <div
            id="site-menu-overlay"
            className="site-menu-overlay__surface"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation overlay"
          >
            <div className="site-menu-overlay__header">
              <div className="site-menu-overlay__brand">
                <span className="site-brand__mark" aria-hidden="true">
                  <Image src="/aurox.svg" alt="" width={44} height={44} className="site-brand__mark-icon" />
                </span>
                <div className="site-menu-overlay__brand-copy">
                  <strong>{messages.shell.brandTitle}</strong>
                  <span>{messages.shell.mobileMenuDescription}</span>
                </div>
              </div>

              <div className="site-menu-overlay__header-actions">
                <LocaleSwitcher locale={locale} label={messages.shell.language} compact />
                <ThemeToggle />
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="mobile-drawer__close"
                  aria-label={messages.shell.closeNavigation}
                  onClick={() => setMenuOpen(false)}
                >
                  X
                </button>
              </div>
            </div>

            <div className="site-menu-overlay__body">
              {auth ? (
                <div className="nav-metric-strip" aria-label="Account summary">
                  <div className="nav-metric-strip__item">
                    <span className="nav-metric-strip__label">Account</span>
                    <span className="nav-metric-strip__value">{auth.name.split(' ')[0]}</span>
                  </div>
                  <div className="nav-metric-strip__item">
                    <span className="nav-metric-strip__label">Portfolio</span>
                    <span className="nav-metric-strip__value">
                      {portfolioSnapshot ? formatCompactUsd(portfolioSnapshot.portfolioValue) : '—'}
                    </span>
                  </div>
                  <div className="nav-metric-strip__item">
                    <span className="nav-metric-strip__label">Invested</span>
                    <span className="nav-metric-strip__value">
                      {portfolioSnapshot ? formatCompactUsd(portfolioSnapshot.investedCapital) : '—'}
                    </span>
                  </div>
                  <div className="nav-metric-strip__item">
                    <span className="nav-metric-strip__label">Simulation</span>
                    <Link href="/invest/simulation" className="nav-metric-strip__value" style={{ color: 'var(--text-accent)', textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>
                      Open
                    </Link>
                  </div>
                </div>
              ) : null}

              <nav className="site-menu-overlay__grid" aria-label="Full site navigation">
                {overlayGroups.map((group) => (
                  <section key={group.id} className="site-menu-overlay__group">
                    <div className="site-menu-overlay__group-label">{group.label}</div>
                    <div className="site-menu-overlay__links">
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`site-menu-overlay__link${item.active ? ' site-menu-overlay__link--active' : ''}`}
                          aria-current={item.active ? 'page' : undefined}
                          onClick={() => setMenuOpen(false)}
                        >
                          <span className="site-menu-overlay__link-copy">
                            {item.icon ? <span className="site-menu-overlay__link-icon" aria-hidden="true">{item.icon}</span> : null}
                            <span className="site-menu-overlay__link-text">
                              <strong>{item.label}</strong>
                              {item.description ? <small>{item.description}</small> : null}
                            </span>
                          </span>
                          <span className="mobile-drawer__arrow" aria-hidden="true">
                            -&gt;
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}
              </nav>

              <section className="site-menu-overlay__utility" aria-label="Account actions">
                {auth ? (
                  <div className="mobile-drawer__account">
                    <div className="mobile-drawer__account-copy">
                      <strong>{auth.name}</strong>
                      <span>{auth.email}</span>
                    </div>
                    <div className="mobile-drawer__account-actions">
                      <Link href="/account" className="mobile-drawer__link mobile-drawer__link--compact" onClick={() => setMenuOpen(false)}>
                        <span>{messages.shell.auth.account}</span>
                        <span className="mobile-drawer__arrow" aria-hidden="true">
                          -&gt;
                        </span>
                      </Link>
                      <SignOutButton
                        className="button button--secondary mobile-drawer__signout"
                        compact
                        label={messages.shell.auth.logout}
                        pendingLabel={`${messages.shell.auth.logout}...`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mobile-drawer__account-actions">
                    <Link href="/login" className="mobile-drawer__link mobile-drawer__link--compact" onClick={() => setMenuOpen(false)}>
                      <span>{messages.shell.auth.login}</span>
                      <span className="mobile-drawer__arrow" aria-hidden="true">
                        -&gt;
                      </span>
                    </Link>
                    <Link href="/signup" className="mobile-drawer__link mobile-drawer__link--compact" onClick={() => setMenuOpen(false)}>
                      <span>{messages.shell.auth.signup}</span>
                      <span className="mobile-drawer__arrow" aria-hidden="true">
                        -&gt;
                      </span>
                    </Link>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}
      <CommandPalette navGroups={navGroups} ticker={ticker} />
    </>
  );
}

