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

  const assetEntries: CommandPaletteEntry[] = ticker.items.slice(0, 40).map((item) => {
    // Route correctly by asset class
    const assetHref =
      item.assetClass === 'crypto'
        ? `/invest/crypto?symbol=${item.symbol}`
        : item.assetClass === 'etf'
          ? `/invest/etfs?symbol=${item.symbol}`
          : `/invest/stocks?symbol=${item.symbol}`;
    return {
      id: `asset-${item.symbol}`,
      title: `${item.symbol} — ${item.label}`,
      description: `${item.assetClass.toUpperCase()} · ${item.price === null ? 'n/a' : `$${item.price.toFixed(2)}`} · ${item.changePercent === null ? 'n/a' : `${item.changePercent >= 0 ? '+' : ''}${item.changePercent.toFixed(2)}%`}`,
      href: assetHref,
      group: 'Assets' as const,
      keywords: [item.symbol, item.label, item.assetClass, 'stock', 'etf', 'crypto'],
    };
  });

  const actionEntries: CommandPaletteEntry[] = [
    {
      id: 'action-open-dashboard',
      title: 'Open Dashboard',
      description: 'Executive cockpit — KPIs, alerts, market pulse',
      href: '/dashboard',
      group: 'Actions',
      keywords: ['dashboard', 'home', 'overview', 'cockpit'],
    },
    {
      id: 'action-open-market',
      title: 'Open Market Workstation',
      description: 'Interactive chart, news stream, multi-asset coverage',
      href: '/market',
      group: 'Actions',
      keywords: ['market', 'chart', 'graph', 'price'],
    },
    {
      id: 'action-open-observe',
      title: 'Open Observer Feed',
      description: 'Market observations, anomaly radar, cross-asset intelligence',
      href: '/observe',
      group: 'Actions',
      keywords: ['observe', 'feed', 'observations', 'anomaly', 'watch'],
    },
    {
      id: 'action-open-alerts',
      title: 'Open Alert Center',
      description: 'Critical alerts, warnings, and watchlist events',
      href: '/alerts',
      group: 'Actions',
      keywords: ['alerts', 'critical', 'warning', 'notification'],
    },
    {
      id: 'action-open-signals',
      title: 'Open Signal Dashboard',
      description: 'Composite signal score, trend, momentum, and market indicators',
      href: '/signals',
      group: 'Actions',
      keywords: ['signals', 'signal', 'trend', 'momentum', 'indicator', 'score'],
    },
    {
      id: 'action-open-portfolio',
      title: 'Open Portfolio Intelligence',
      description: 'Risk overlay, factor decomposition, rebalance plan',
      href: '/portfolio/intelligence',
      group: 'Actions',
      keywords: ['portfolio', 'intelligence', 'risk', 'allocation', 'factor', 'rebalance'],
    },
    {
      id: 'action-open-simulation',
      title: 'Open Simulation Cockpit',
      description: 'Prepare and track simulated trades — no real capital',
      href: '/invest/simulation',
      group: 'Actions',
      keywords: ['simulation', 'simulate', 'trade', 'buy', 'sell', 'invest', 'cockpit'],
    },
    {
      id: 'action-simulate-buy',
      title: 'Prepare Simulation Buy',
      description: 'Open simulation cockpit ready to prepare a buy order',
      href: '/invest/simulation?side=buy&intent=prepare',
      group: 'Actions',
      keywords: ['buy', 'simulate buy', 'long', 'enter'],
    },
    {
      id: 'action-simulate-sell',
      title: 'Prepare Simulation Sell',
      description: 'Open simulation cockpit ready to prepare a sell order',
      href: '/invest/simulation?side=sell&intent=prepare',
      group: 'Actions',
      keywords: ['sell', 'simulate sell', 'exit', 'close'],
    },
    {
      id: 'action-open-stocks',
      title: 'Browse Stocks',
      description: 'Stock universe — signals, risk decisions, and simulation actions',
      href: '/invest/stocks',
      group: 'Actions',
      keywords: ['stocks', 'stock', 'equities', 'shares'],
    },
    {
      id: 'action-open-etfs',
      title: 'Browse ETFs',
      description: 'ETF universe — signals, risk decisions, and simulation actions',
      href: '/invest/etfs',
      group: 'Actions',
      keywords: ['etf', 'etfs', 'funds', 'index'],
    },
    {
      id: 'action-open-crypto',
      title: 'Browse Crypto',
      description: 'Crypto universe — signals, risk decisions, and simulation actions',
      href: '/invest/crypto',
      group: 'Actions',
      keywords: ['crypto', 'bitcoin', 'ethereum', 'btc', 'eth', 'digital assets'],
    },
    {
      id: 'action-open-news',
      title: 'Open News Feed',
      description: 'Market news, sentiment shocks, and headline impact',
      href: '/news',
      group: 'Actions',
      keywords: ['news', 'headlines', 'sentiment', 'shock'],
    },
    {
      id: 'action-open-journal',
      title: 'Open Simulation Journal',
      description: 'Decision journal — simulated trade and control history',
      href: '/invest/simulation#journal',
      group: 'Actions',
      keywords: ['journal', 'history', 'log', 'decisions', 'trade log'],
    },
    {
      id: 'action-export-journal',
      title: 'Export Simulation Journal (CSV)',
      description: 'Download full simulation decision log as CSV',
      href: '/api/invest/simulation/journal',
      group: 'Actions',
      keywords: ['export', 'csv', 'journal', 'download'],
    },
    {
      id: 'action-open-risk',
      title: 'Review Risk Readiness',
      description: 'Live readiness checks and risk gate status',
      href: '/invest/live-readiness',
      group: 'Actions',
      keywords: ['risk', 'readiness', 'live', 'gate', 'safety'],
    },
    {
      id: 'action-open-timeline',
      title: 'Open Intelligence Timeline',
      description: 'Chronological event log from the observer feed',
      href: '/observe?section=timeline',
      group: 'Actions',
      keywords: ['timeline', 'events', 'history', 'chronological'],
    },
    {
      id: 'action-open-anomalies',
      title: 'Open Anomaly Radar',
      description: 'Detected anomalies and unusual market signals',
      href: '/observe?section=anomalies',
      group: 'Actions',
      keywords: ['anomaly', 'anomalies', 'radar', 'unusual', 'detect'],
    },
    {
      id: 'action-open-provider-health',
      title: 'Check Provider Health',
      description: 'Market data provider status and degradation indicators',
      href: '/admin/monitoring',
      group: 'Actions',
      keywords: ['provider', 'health', 'data', 'status', 'degraded', 'monitoring'],
    },
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

  // Group results for display
  const grouped = results.reduce<Record<string, CommandPaletteEntry[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    (acc[item.group] as CommandPaletteEntry[]).push(item);
    return acc;
  }, {});

  const groupOrder: CommandPaletteEntry['group'][] = ['Routes', 'Actions', 'Assets'];

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
            placeholder="Search routes, assets, signals, observations…"
            aria-label="Command palette search"
          />
          <span className="command-palette__hint">ESC to close</span>
        </div>
        <div className="command-palette__list">
          {results.length === 0 ? (
            <div className="command-palette__empty">
              <p className="text-muted">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-muted" style={{ fontSize: '0.8rem' }}>Try: dashboard, signals, buy, sell, simulate, alerts, portfolio, risk, replay, news</p>
            </div>
          ) : (
            groupOrder.map((group) => {
              const items = grouped[group];
              if (!items || items.length === 0) return null;
              return (
                <div key={group} className="command-palette__group">
                  <div className="command-palette__group-label">{group}</div>
                  {items.map((item) => (
                    <Link key={item.id} href={item.href} className="command-palette__item" onClick={() => setOpen(false)}>
                      <div className="command-palette__item-body">
                        <strong className="command-palette__item-title">{item.title}</strong>
                        {item.description ? <p className="command-palette__item-desc text-muted">{item.description}</p> : null}
                      </div>
                    </Link>
                  ))}
                </div>
              );
            })
          )}
        </div>
        {query.length === 0 && (
          <div className="command-palette__footer">
            <span className="text-muted">⌘K to open · ESC to close · ↑↓ to navigate</span>
          </div>
        )}
      </div>
    </div>
  );
}
