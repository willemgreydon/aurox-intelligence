'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId, useState } from 'react';
import { cn } from '../../lib/utils';

const accountNavItems = [
  { href: '/account', label: 'Overview' },
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/settings', label: 'Settings' },
  { href: '/account/activity', label: 'Trading activity' },
];

function isActive(pathname: string, href: string): boolean {
  // Overview (/account) is the index route — active only on an exact match, so
  // it does not light up (or win the current-label) on every child route.
  if (href === '/account') return pathname === '/account';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AccountNav() {
  const pathname = usePathname();
  const menuId = useId();
  const [open, setOpen] = useState(false);

  // The collapsed menu only exists at the mobile breakpoint. It closes when a
  // route is selected (each link's onClick) so it never lingers after
  // navigation — no effect or render-time setState, keeping renders clean.

  // Single source of navigation truth; the trigger label is derived, not duplicated.
  const current =
    accountNavItems.find((item) => isActive(pathname, item.href)) ?? { href: '/account', label: 'Overview' };

  return (
    <nav className={cn('account-nav', open && 'account-nav--open')} aria-label="Account navigation">
      <button
        type="button"
        className="account-nav__trigger"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
        }}
      >
        <span className="account-nav__trigger-label">
          <span className="account-nav__trigger-eyebrow">Account</span>
          <span className="account-nav__trigger-current">{current.label}</span>
        </span>
        <span className="account-nav__trigger-chevron" aria-hidden="true" />
      </button>

      <div className="account-nav__list" id={menuId}>
        {accountNavItems.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn('account-nav__link', active && 'account-nav__link--active')}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
