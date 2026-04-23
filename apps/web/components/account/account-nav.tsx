'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '../../lib/utils';

const accountNavItems = [
  { href: '/account', label: 'Overview' },
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/settings', label: 'Settings' },
  { href: '/account/activity', label: 'Trading activity' },
];

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav className="account-nav" aria-label="Account navigation">
      {accountNavItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link key={item.href} href={item.href} className={cn('account-nav__link', active && 'account-nav__link--active')}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
