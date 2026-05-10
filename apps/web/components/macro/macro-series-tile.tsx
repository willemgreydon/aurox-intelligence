import type { MacroSeries } from '@repo/api-contracts';

export function MacroSeriesTile({ series }: { series: MacroSeries }) {
  const latest = series.points[series.points.length - 1];
  return (
    <article className="analytics-card">
      <div className="analytics-stat__label">{series.title}</div>
      <div className="analytics-stat__value">{latest ? latest.value.toFixed(2) : 'N/A'}</div>
      <div className="analytics-stat__footnote">{series.provider} · {series.frequency} · {series.freshnessState}</div>
    </article>
  );
}
