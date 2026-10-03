'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type MobileNavProps = {
  menuOpen: boolean;
  onToggleMenu: () => void;
  labels: {
    home: string;
    market: string;
    simulation: string;
    menu: string;
    openMenu: string;
    closeMenu: string;
  };
};

/**
 * Mobile quick-nav icons. The repo ships no icon library, so these are inline SVGs
 * in a single consistent family: 24px viewBox, stroke `currentColor`, 2px round
 * strokes, no fills — so they inherit the link's colour (incl. the active accent)
 * and the size set in CSS. Each icon is decorative (`aria-hidden`); the visible
 * text label carries the accessible name.
 */
function iconSvg(children: ReactNode) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable={false}
    >
      {children}
    </svg>
  );
}

// Home → a house.
const HomeIcon = iconSvg(
  <>
    <path d="M3 9.8 12 3l9 6.8" />
    <path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
    <path d="M9.5 21v-6h5v6" />
  </>,
);

// Markets → an axis with a trending line.
const MarketIcon = iconSvg(
  <>
    <path d="M4 4v15a1 1 0 0 0 1 1h15" />
    <path d="m7 14 3.5-3.5 3 3L20 7" />
  </>,
);

// Simulation → a wallet (the simulated trading account).
const SimulationIcon = iconSvg(
  <>
    <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H18a1 1 0 0 1 1 1v1" />
    <rect x="3" y="7" width="18" height="12" rx="2" />
    <path d="M16 12.5h2.5a1 1 0 0 1 0 2.5H16a1.25 1.25 0 0 1 0-2.5Z" />
  </>,
);

// Menu → three lines.
const MenuIcon = iconSvg(
  <>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </>,
);

function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav({ menuOpen, onToggleMenu, labels }: MobileNavProps) {
  const pathname = usePathname();
  const quickLinks = [
    { href: '/', label: labels.home, icon: HomeIcon },
    { href: '/market', label: labels.market, icon: MarketIcon },
    { href: '/invest/simulation', label: labels.simulation, icon: SimulationIcon },
  ];

  return (
    <div className="mobile-nav-shell">
      <div className="mobile-quick-nav" aria-label="Mobile quick navigation">
        {quickLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-quick-nav__link${isActivePath(pathname, item.href) ? ' mobile-quick-nav__link--active' : ''}`}
          >
            <span className="mobile-quick-nav__icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className={`mobile-quick-nav__link mobile-quick-nav__link--menu${menuOpen ? ' mobile-quick-nav__link--active' : ''}`}
          aria-label={menuOpen ? labels.closeMenu : labels.openMenu}
          aria-expanded={menuOpen}
          aria-controls="site-menu-overlay"
          onClick={onToggleMenu}
        >
          <span className="mobile-quick-nav__icon" aria-hidden="true">{MenuIcon}</span>
          <span>{labels.menu}</span>
        </button>
      </div>
    </div>
  );
}
