import type { MacroProviderStatus } from '@repo/providers';

export function MacroProviderStatusPanel({ rows }: { rows: MacroProviderStatus[] }) {
  return (
    <div className="analytics-grid analytics-grid--3">
      {rows.map((row) => (
        <article key={row.provider} className="analytics-card">
          <div className="analytics-stat__label">{row.provider}</div>
          <div className="analytics-stat__value">{row.configured ? 'Configured' : 'Not configured'}</div>
          <div className="analytics-stat__footnote">{row.authMode} · freshness: {row.freshness}</div>
        </article>
      ))}
    </div>
  );
}
