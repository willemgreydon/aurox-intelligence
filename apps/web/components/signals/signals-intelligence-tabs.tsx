'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { TableColumn } from '../../lib/dashboard/analytics-fixtures';

type SignalRow = {
  asset: string;
  interpretation: string;
  score: string;
  price: string;
  updated: string;
};

type HistoryRow = {
  timestamp: string;
  asset: string;
  score: string;
  confidence: string;
  decision: string;
  roi: string;
  outcome: string;
};

type Props = {
  signalRows: SignalRow[];
  historyRows: HistoryRow[];
  leadSignalConfidence: number | null;
};

const TABS = [
  { id: 'current', label: 'Current Signals' },
  { id: 'history', label: 'Decision History' },
  { id: 'accuracy', label: 'Prediction Accuracy' },
  { id: 'roi', label: 'ROI by Signal Type' },
  { id: 'news', label: 'News Impact' },
] as const;

type TabId = typeof TABS[number]['id'];

const signalColumns: Array<TableColumn<SignalRow>> = [
  { key: 'asset', label: 'Asset' },
  { key: 'interpretation', label: 'Interpretation' },
  { key: 'score', label: 'Score', align: 'right' },
  { key: 'price', label: 'Latest price', align: 'right' },
  { key: 'updated', label: 'Updated', align: 'right' },
];

const historyColumns: Array<TableColumn<HistoryRow>> = [
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'asset', label: 'Asset' },
  { key: 'score', label: 'Score', align: 'right' },
  { key: 'confidence', label: 'Confidence', align: 'right' },
  { key: 'decision', label: 'Broker decision' },
  { key: 'roi', label: 'ROI', align: 'right' },
  { key: 'outcome', label: 'Prediction vs actual' },
];

function SimpleTable<T extends Record<string, string>>({
  columns,
  rows,
  emptyMessage,
}: {
  columns: Array<TableColumn<T>>;
  rows: T[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="aurox-empty-state aurox-empty-state--inline">
        <p className="aurox-empty-state__title">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table" style={{ width: '100%' }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key as string} style={{ textAlign: col.align ?? 'left' }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={col.key as string} style={{ textAlign: col.align ?? 'left', fontFamily: col.align === 'right' ? 'var(--font-family-mono)' : undefined }}>
                  {row[col.key as string] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DegradedState({ title, body, links }: { title: string; body: string; links: { href: string; label: string }[] }) {
  return (
    <div className="aurox-empty-state">
      <p className="aurox-empty-state__title">{title}</p>
      <p className="aurox-empty-state__body">{body}</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="button button--secondary">{link.label}</Link>
        ))}
      </div>
    </div>
  );
}

export function SignalsIntelligenceTabs({ signalRows, historyRows, leadSignalConfidence }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('current');

  const avgConfidenceDisplay = leadSignalConfidence !== null
    ? `${Math.round(leadSignalConfidence * 100)}%`
    : 'n/a';

  return (
    <div className="signals-intelligence-tabs">
      {/* Tab bar */}
      <div className="signals-tab-bar" role="tablist" aria-label="Signal intelligence tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`signals-tab-panel-${tab.id}`}
            className={`signals-tab-btn${activeTab === tab.id ? ' signals-tab-btn--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats strip — always visible */}
      <div className="analytics-strip" style={{ marginTop: '0.75rem' }}>
        <div className="analytics-stat">
          <div className="analytics-stat__label">Hit rate</div>
          <div className="analytics-stat__value">n/a</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat__label">Average ROI</div>
          <div className="analytics-stat__value">n/a</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat__label">Avg confidence</div>
          <div className="analytics-stat__value">{avgConfidenceDisplay}</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat__label">Drawdown</div>
          <div className="analytics-stat__value">n/a</div>
        </div>
        <div className="analytics-stat">
          <div className="analytics-stat__label">False positive rate</div>
          <div className="analytics-stat__value">n/a</div>
        </div>
      </div>

      {/* Tab panels */}
      <div
        id={`signals-tab-panel-current`}
        role="tabpanel"
        aria-labelledby="tab-current"
        hidden={activeTab !== 'current'}
        style={{ marginTop: '1rem' }}
      >
        {signalRows.length === 0 ? (
          <DegradedState
            title="No signals available"
            body="Signal derivation requires tracked assets with sufficient price history. Visit the Observer to ingest market data."
            links={[
              { href: '/observe', label: 'Open Observer' },
              { href: '/dashboard', label: 'Open Dashboard' },
            ]}
          />
        ) : (
          <SimpleTable columns={signalColumns} rows={signalRows} emptyMessage="No signal rows available." />
        )}
      </div>

      <div
        id={`signals-tab-panel-history`}
        role="tabpanel"
        aria-labelledby="tab-history"
        hidden={activeTab !== 'history'}
        style={{ marginTop: '1rem' }}
      >
        {historyRows.length === 0 ? (
          <DegradedState
            title="No decision history yet"
            body="Simulation trades linked to signals will appear here once you begin preparing orders. Decision history tracks signal-to-order traceability."
            links={[
              { href: '/invest/simulation', label: 'Open Simulation Cockpit' },
              { href: '/invest/simulation#journal', label: 'Open Journal' },
            ]}
          />
        ) : (
          <SimpleTable columns={historyColumns} rows={historyRows} emptyMessage="No decision history yet." />
        )}
      </div>

      <div
        id={`signals-tab-panel-accuracy`}
        role="tabpanel"
        aria-labelledby="tab-accuracy"
        hidden={activeTab !== 'accuracy'}
        style={{ marginTop: '1rem' }}
      >
        <DegradedState
          title="Prediction accuracy tracking not yet active"
          body="This surface will show signal hit rates, direction accuracy, and confidence calibration once enough simulation trades have been completed and evaluated against outcomes."
          links={[
            { href: '/invest/simulation#journal', label: 'View Simulation Journal' },
            { href: '/portfolio/intelligence', label: 'Review Portfolio Intelligence' },
          ]}
        />
      </div>

      <div
        id={`signals-tab-panel-roi`}
        role="tabpanel"
        aria-labelledby="tab-roi"
        hidden={activeTab !== 'roi'}
        style={{ marginTop: '1rem' }}
      >
        <DegradedState
          title="ROI attribution not yet active"
          body="ROI by signal type requires completed simulation trades with outcomes. Start by preparing and executing simulated orders linked to signal decisions."
          links={[
            { href: '/invest/simulation', label: 'Open Simulation Cockpit' },
            { href: '/invest/stocks', label: 'Browse Stocks' },
          ]}
        />
      </div>

      <div
        id={`signals-tab-panel-news`}
        role="tabpanel"
        aria-labelledby="tab-news"
        hidden={activeTab !== 'news'}
        style={{ marginTop: '1rem' }}
      >
        <DegradedState
          title="News impact analysis not yet active"
          body="This surface will correlate news sentiment shocks with signal movements. News impact analysis requires live observation data from the Observer feed."
          links={[
            { href: '/observe', label: 'Open Observer Feed' },
            { href: '/news', label: 'Open News Feed' },
            { href: '/alerts', label: 'Inspect Alert Center' },
          ]}
        />
      </div>
    </div>
  );
}
