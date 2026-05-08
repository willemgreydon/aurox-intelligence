'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { NavGroup } from './site-nav';
import type { MarketTickerViewModel } from '../../server/mappers/market-ticker-mapper';
import { searchCommandPalette, type CommandPaletteEntry } from '../../lib/command-palette';

type CommandPaletteProps = {
  navGroups: NavGroup[];
  ticker: MarketTickerViewModel;
};

function buildEntries(navGroups: NavGroup[], ticker: MarketTickerViewModel): CommandPaletteEntry[] {
  const routeEntries: CommandPaletteEntry[] = navGroups.flatMap((group) =>
    group.items.map((item) => ({
      id: `route-${group.id}-${item.href}`,
      title: item.label,
      description: item.description,
      href: item.href,
      group: 'Routes' as const,
      keywords: [group.label, item.icon ?? ''],
    })),
  );

  const assetEntries: CommandPaletteEntry[] = ticker.items.slice(0, 40).map((item) => ({
    id: `asset-${item.symbol}`,
    title: `${item.symbol} - ${item.label}`,
    description: `${item.assetClass.toUpperCase()} - ${item.price === null ? 'n/a' : `$${item.price.toFixed(2)}`} - ${item.changePercent === null ? 'n/a' : `${item.changePercent.toFixed(2)}%`}`,
    href: `/stocks/${item.symbol}`,
    group: 'Assets',
    keywords: [item.symbol, item.label, item.assetClass],
  }));

  const actionEntries: CommandPaletteEntry[] = [
    { id: 'action-open-alerts', title: 'Open alert center', href: '/alerts', group: 'Actions', keywords: ['alerts', 'critical', 'warning'] },
    { id: 'action-open-observe', title: 'Open observer feed', href: '/observe', group: 'Actions', keywords: ['observe', 'feed'] },
    { id: 'action-open-timeline', title: 'Open timeline', href: '/observe?section=timeline', group: 'Actions', keywords: ['timeline', 'events'] },
    { id: 'action-open-anomalies', title: 'Open anomaly radar', href: '/observe?section=anomalies', group: 'Actions', keywords: ['anomaly', 'radar'] },
    { id: 'action-open-simulation', title: 'Open simulation cockpit', href: '/invest/simulation', group: 'Actions', keywords: ['simulation', 'trade'] },
  ];

  return [...routeEntries, ...assetEntries, ...actionEntries];
}

export function CommandPalette({ navGroups, ticker }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const entries = useMemo(() => buildEntries(navGroups, ticker), [navGroups, ticker]);
  const results = useMemo(() => searchCommandPalette(entries, query), [entries, query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault();
        setOpen((v) => !v);
      } else if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette">
      <button className="command-palette__backdrop" aria-label="Close command palette" onClick={() => setOpen(false)} />
      <div className="command-palette__surface">
        <div className="command-palette__header">
          <input
            autoFocus
            className="market-graph__selector-input command-palette__input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search routes, assets, signals, observations..."
            aria-label="Command palette search"
          />
          <span className="command-palette__hint">ESC</span>
        </div>
        <div className="command-palette__list">
          {results.length === 0 ? (
            <p className="text-muted">No results found.</p>
          ) : (
            results.map((item) => (
              <Link key={item.id} href={item.href} className="command-palette__item" onClick={() => setOpen(false)}>
                <div>
                  <strong>{item.title}</strong>
                  {item.description ? <p className="text-muted">{item.description}</p> : null}
                </div>
                <span className="status-pill status-pill--neutral">{item.group}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
