'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { NavGroup } from './site-nav';

type GroupedSiteNavProps = {
  groups: NavGroup[];
};

function isGroupActive(pathname: string, group: NavGroup) {
  return group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

export function GroupedSiteNav({ groups }: GroupedSiteNavProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const firstLinkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const groupIds = useMemo(() => groups.map((group) => group.id), [groups]);

  useEffect(() => {
    setOpenGroupId(null);
  }, [pathname]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) {
        setOpenGroupId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenGroupId(null);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function focusTrigger(groupId: NavGroup['id']) {
    triggerRefs.current[groupId]?.focus();
  }

  function focusFirstLink(groupId: NavGroup['id']) {
    firstLinkRefs.current[groupId]?.focus();
  }

  function moveTriggerFocus(groupId: NavGroup['id'], direction: 'next' | 'previous') {
    const currentIndex = groupIds.indexOf(groupId);

    if (currentIndex === -1) {
      return;
    }

    const nextIndex =
      direction === 'next'
        ? (currentIndex + 1) % groupIds.length
        : (currentIndex - 1 + groupIds.length) % groupIds.length;

    const nextGroupId = groupIds[nextIndex];
    if (nextGroupId) {
      focusTrigger(nextGroupId);
    }
  }

  function handleTriggerKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    group: NavGroup,
  ) {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        setOpenGroupId(null);
        moveTriggerFocus(group.id, 'next');
        break;
      case 'ArrowLeft':
        event.preventDefault();
        setOpenGroupId(null);
        moveTriggerFocus(group.id, 'previous');
        break;
      case 'Home':
        event.preventDefault();
        setOpenGroupId(null);
        if (groupIds[0]) {
          focusTrigger(groupIds[0]);
        }
        break;
      case 'End':
        event.preventDefault();
        setOpenGroupId(null);
        if (groupIds.length > 0) {
          focusTrigger(groupIds[groupIds.length - 1]!);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        setOpenGroupId(group.id);
        requestAnimationFrame(() => focusFirstLink(group.id));
        break;
      case 'Escape':
        event.preventDefault();
        setOpenGroupId(null);
        break;
      default:
        break;
    }
  }

  function handlePanelKeyDown(
    event: ReactKeyboardEvent<HTMLDivElement>,
    group: NavGroup,
  ) {
    const links = Array.from(
      navRef.current?.querySelectorAll<HTMLAnchorElement>(`#site-nav-panel-${group.id} a`) ?? [],
    );
    const currentIndex = links.findIndex((link) => link === document.activeElement);

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setOpenGroupId(null);
        focusTrigger(group.id);
        break;
      case 'ArrowDown':
        if (links.length === 0) {
          return;
        }

        event.preventDefault();
        links[(currentIndex + 1 + links.length) % links.length]?.focus();
        break;
      case 'ArrowUp':
        if (links.length === 0) {
          return;
        }

        event.preventDefault();
        links[(currentIndex - 1 + links.length) % links.length]?.focus();
        break;
      case 'Home':
        if (links.length === 0) {
          return;
        }

        event.preventDefault();
        links[0]?.focus();
        break;
      case 'End':
        if (links.length === 0) {
          return;
        }

        event.preventDefault();
        links[links.length - 1]?.focus();
        break;
      case 'ArrowRight':
        event.preventDefault();
        setOpenGroupId(null);
        moveTriggerFocus(group.id, 'next');
        break;
      case 'ArrowLeft':
        event.preventDefault();
        setOpenGroupId(null);
        moveTriggerFocus(group.id, 'previous');
        break;
      default:
        break;
    }
  }

  return (
    <nav
      ref={navRef}
      className="site-nav"
      aria-label="Primary"
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget as Node | null;
        if (!nextTarget || !navRef.current?.contains(nextTarget)) {
          setOpenGroupId(null);
        }
      }}
    >
      <ul className="site-nav__groups" role="list">
        {groups.map((group) => {
          const active = isGroupActive(pathname, group);
          const isOpen = openGroupId === group.id;
          const triggerId = `site-nav-trigger-${group.id}`;
          const panelId = `site-nav-panel-${group.id}`;

          return (
            <li
              key={group.id}
              className={`site-nav-group${active ? ' site-nav-group--active' : ''}${isOpen ? ' site-nav-group--open' : ''}`}
            >
              <button
                id={triggerId}
                ref={(node) => {
                  triggerRefs.current[group.id] = node;
                }}
                type="button"
                className="site-nav-group__trigger"
                aria-expanded={isOpen}
                aria-controls={panelId}
                aria-haspopup="true"
                onClick={() => setOpenGroupId((current) => (current === group.id ? null : group.id))}
                onKeyDown={(event) => handleTriggerKeyDown(event, group)}
              >
                <span>{group.label}</span>
                <span aria-hidden="true" className="site-nav-group__chevron">
                  v
                </span>
              </button>

              <div
                id={panelId}
                className="site-nav-group__panel"
                aria-labelledby={triggerId}
                hidden={!isOpen}
                onKeyDown={(event) => handlePanelKeyDown(event, group)}
              >
                <ul className="site-nav-group__list" role="list">
                  {group.items.map((item, index) => {
                    const itemActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <li key={item.href} className="site-nav-group__item">
                        <Link
                          ref={(node) => {
                            if (index === 0) {
                              firstLinkRefs.current[group.id] = node;
                            }
                          }}
                          href={item.href}
                          className={`site-nav-group__link${itemActive ? ' site-nav-group__link--active' : ''}`}
                          aria-current={itemActive ? 'page' : undefined}
                          onClick={() => setOpenGroupId(null)}
                        >
                          {item.icon ? <span className="site-nav-group__icon" aria-hidden="true">{item.icon}</span> : null}
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
