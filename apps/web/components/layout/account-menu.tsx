'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { AccountUser } from '@repo/api-contracts';
import { SignOutButton } from '../auth/sign-out-button';

type AccountMenuProps = {
  user: AccountUser;
  labels: {
    account: string;
    profile: string;
    settings: string;
    logout: string;
    member: string;
    admin: string;
  };
};

export function AccountMenu({ user, labels }: AccountMenuProps) {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const panelId = 'account-menu-panel';
  const triggerId = 'account-menu-trigger';

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    const mediaQuery = window.matchMedia('(max-width: 960px)');
    const handleMobileBreakpoint = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    mediaQuery.addEventListener('change', handleMobileBreakpoint);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      mediaQuery.removeEventListener('change', handleMobileBreakpoint);
    };
  }, []);

  return (
    <div
      ref={menuRef}
      className={`account-menu${open ? ' account-menu--open' : ''}`}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget as Node | null;
        if (!nextTarget || !menuRef.current?.contains(nextTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        id={triggerId}
        ref={triggerRef}
        type="button"
        className="account-menu__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="account-menu__avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="account-menu__identity">
          <strong>{user.name}</strong>
          <span>{user.email}</span>
        </span>
      </button>

      <div
        id={panelId}
        className="account-menu__panel"
        aria-labelledby={triggerId}
        hidden={!open}
      >
        <div className="account-menu__meta">
          <strong>{user.name}</strong>
          <span>{user.role === 'admin' ? labels.admin : labels.member}</span>
        </div>

        <ul className="account-menu__links" role="list">
          <li>
            <Link href="/account" onClick={() => setOpen(false)}>{labels.account}</Link>
          </li>
          <li>
            <Link href="/account/profile" onClick={() => setOpen(false)}>{labels.profile}</Link>
          </li>
          <li>
            <Link href="/account/settings" onClick={() => setOpen(false)}>{labels.settings}</Link>
          </li>
        </ul>

        <SignOutButton
          className="account-menu__signout"
          compact
          label={labels.logout}
          pendingLabel={`${labels.logout}...`}
        />
      </div>
    </div>
  );
}
