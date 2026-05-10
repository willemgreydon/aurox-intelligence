'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { SimulationJournalRow } from '../../server/services/simulation-journal-service';
import { buildSimulationPrepareHrefForAsset } from '../../lib/simulation-prepare-url';
import { sanitizeSimulationSourceLabel } from '../../lib/simulation-source';

/**
 * Client-side copy of humanizeTransactionType for display only.
 * The authoritative version lives in simulation-journal-service.ts.
 */
function humanizeJournalSide(side: string, transactionType?: string): string {
  if (transactionType === 'initial_funding') return 'Initial funding';
  if (transactionType === 'reset') return 'Cash adjustment';
  if (side === 'BUY') return 'Simulated buy';
  if (side === 'SELL') return 'Simulated sell';
  if (side === 'RESET') return 'Cash adjustment';
  return side;
}

type Props = { rows: SimulationJournalRow[] };

function outcomeTone(status: string): 'success' | 'danger' | 'warning' | 'neutral' {
  if (status === 'success' || status === 'filled') return 'success';
  if (status === 'failed' || status === 'rejected' || status === 'error') return 'danger';
  if (status === 'blocked' || status === 'cancelled') return 'warning';
  return 'neutral';
}

function humanizeSide(side: string): { label: string; tone: 'success' | 'danger' | 'neutral' } {
  if (side === 'BUY') return { label: 'Buy', tone: 'success' };
  if (side === 'SELL') return { label: 'Sell', tone: 'danger' };
  if (side === 'RESET') return { label: 'Reset', tone: 'neutral' };
  return { label: side, tone: 'neutral' };
}

export function SimulationJournalTable({ rows }: Props) {
  const [side, setSide] = useState('all');
  const [source, setSource] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => rows.filter((row) => {
    if (side !== 'all' && row.side !== side) return false;
    if (source !== 'all' && row.source !== source) return false;
    if (search.trim().length > 0) {
      const q = search.trim().toUpperCase();
      if (!row.symbol.toUpperCase().includes(q)) return false;
    }
    return true;
  }), [rows, search, side, source]);

  const hasFilters = side !== 'all' || source !== 'all' || search.trim().length > 0;

  function clearFilters() {
    setSide('all');
    setSource('all');
    setSearch('');
  }

  return (
    <div className="analytics-card" id="journal" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">Decision Journal</div>
          <h3>Simulation trade and control history</h3>
          <p className="text-muted" style={{ marginTop: '0.25rem', fontSize: '0.8rem' }}>
            All simulated orders, resets, and controls. No real capital involved.
          </p>
        </div>
        <div className="market-pagination__actions">
          <a
            href={`/api/invest/simulation/journal?${new URLSearchParams({
              ...(side !== 'all' ? { side } : {}),
              ...(source !== 'all' ? { source } : {}),
              ...(search.trim().length > 0 ? { symbol: search.trim() } : {}),
            }).toString()}`}
            className="button button--secondary"
            download
            aria-label={hasFilters ? 'Export filtered journal as CSV' : 'Export all journal entries as CSV'}
          >
            {hasFilters ? 'Export filtered CSV' : 'Export CSV'}
          </a>
        </div>
      </div>
      <div className="analytics-card__body">
        {/* Filter toolbar */}
        <div className="aurox-toolbar" aria-label="Journal filters">
          <select
            className="market-graph__selector-input"
            value={side}
            onChange={(event) => setSide(event.target.value)}
            aria-label="Filter by side"
          >
            <option value="all">All sides</option>
            <option value="BUY">Buy orders</option>
            <option value="SELL">Sell orders</option>
            <option value="RESET">Resets</option>
          </select>
          <select
            className="market-graph__selector-input"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            aria-label="Filter by source"
          >
            <option value="all">All sources</option>
            <option value="simulation">Simulation</option>
            <option value="manual_ui">Manual</option>
            <option value="etf-lane">ETF Lane</option>
            <option value="crypto-lane">Crypto Lane</option>
            <option value="portfolio-intelligence">Portfolio Intel</option>
            <option value="simulation-controls">Controls</option>
            <option value="journal">Journal</option>
            <option value="signal">Signal</option>
            <option value="agent">Agent</option>
          </select>
          <input
            className="market-graph__selector-input"
            placeholder="Search symbol…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search by symbol"
          />
          {hasFilters && (
            <button type="button" className="button button--secondary" onClick={clearFilters} aria-label="Clear all filters">
              Clear filters
            </button>
          )}
        </div>

        {/* Table or empty states */}
        {rows.length === 0 ? (
          <div className="aurox-empty-state">
            <p className="aurox-empty-state__title">No simulation activity yet</p>
            <p className="aurox-empty-state__body">
              Prepare your first simulated buy or sell order to start building your decision history.
            </p>
            <Link href="/invest/simulation?side=buy&intent=prepare" className="button button--primary">
              Prepare simulation buy
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="aurox-empty-state">
            <p className="aurox-empty-state__title">No entries match your filters</p>
            <p className="aurox-empty-state__body">Try adjusting the side, source, or symbol filter.</p>
            <button type="button" className="button button--secondary" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th scope="col">Time</th>
                  <th scope="col">Side</th>
                  <th scope="col">Symbol</th>
                  <th scope="col">Qty</th>
                  <th scope="col">Price</th>
                  <th scope="col">Cash Δ</th>
                  <th scope="col">Source</th>
                  <th scope="col">Outcome</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const sideMeta = humanizeSide(row.side);
                  const outcomeBadgeTone = outcomeTone(row.outcomeStatus ?? '');
                  return (
                    <tr key={row.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(row.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td>
                        <span className={`status-pill status-pill--${sideMeta.tone === 'success' ? 'success' : sideMeta.tone === 'danger' ? 'danger' : 'neutral'}`}
                          title={humanizeJournalSide(row.side)}>
                          {sideMeta.label}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 600 }}>{row.symbol}</td>
                      <td style={{ fontFamily: 'var(--font-family-mono)', textAlign: 'right' }}>
                        {row.quantity === null ? <span className="text-muted">—</span> : row.quantity.toFixed(4)}
                      </td>
                      <td style={{ fontFamily: 'var(--font-family-mono)', textAlign: 'right' }}>
                        {row.price === null ? <span className="text-muted">—</span> : `$${row.price.toFixed(4)}`}
                      </td>
                      <td style={{ fontFamily: 'var(--font-family-mono)', textAlign: 'right' }}>
                        {row.cashImpact === null ? (
                          row.notional === null ? <span className="text-muted">—</span> : `$${row.notional.toFixed(2)}`
                        ) : (
                          <span className={row.cashImpact >= 0 ? '' : ''} aria-label={`Cash change: ${row.cashImpact >= 0 ? '+' : ''}${row.cashImpact.toFixed(2)}`}>
                            {row.cashImpact >= 0 ? '+' : ''}{row.cashImpact.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="status-pill status-pill--neutral" style={{ fontSize: '0.7rem' }}>
                          {sanitizeSimulationSourceLabel(row.source)}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill status-pill--${outcomeBadgeTone}`}>
                          {row.outcomeStatus ?? 'pending'}
                        </span>
                      </td>
                      <td>
                        <div className="aurox-action-row">
                          <Link
                            href={buildSimulationPrepareHrefForAsset({
                              symbol: row.symbol,
                              assetClass: row.assetClass ?? 'stock',
                              side: 'buy',
                              source: 'journal',
                            })}
                            className="journal-action-link"
                            aria-label={`Prepare simulation buy for ${row.symbol}`}
                          >
                            Buy
                          </Link>
                          <Link
                            href={buildSimulationPrepareHrefForAsset({
                              symbol: row.symbol,
                              assetClass: row.assetClass ?? 'stock',
                              side: 'sell',
                              source: 'journal',
                            })}
                            className="journal-action-link"
                            aria-label={`Prepare simulation sell for ${row.symbol}`}
                          >
                            Sell
                          </Link>
                          {row.replayHref ? (
                            <Link
                              href={row.replayHref}
                              className="journal-action-link"
                              aria-label={`Replay intelligence event for ${row.symbol}`}
                            >
                              Replay
                            </Link>
                          ) : (
                            <span className="journal-action-link journal-action-link--disabled" aria-label="Replay not available for this entry">
                              No replay
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
            Showing {filtered.length} of {rows.length} entries.{' '}
            {hasFilters && (
              <button type="button" className="journal-action-link" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
