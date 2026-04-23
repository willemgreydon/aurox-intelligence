'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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

function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav({ menuOpen, onToggleMenu, labels }: MobileNavProps) {
  const pathname = usePathname();
  const quickLinks = [
    { href: '/', label: labels.home, icon: 'HM' },
    { href: '/market', label: labels.market, icon: 'MR' },
    { href: '/invest/simulation', label: labels.simulation, icon: 'SM' },
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
          <span className="mobile-quick-nav__icon" aria-hidden="true">MN</span>
          <span>{labels.menu}</span>
        </button>
      </div>
    </div>
  );
}
