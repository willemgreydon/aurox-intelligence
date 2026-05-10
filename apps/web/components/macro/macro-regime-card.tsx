export function MacroRegimeCard({ title, score, detail }: { title: string; score: number; detail: string }) {
  return (
    <article className="analytics-card observation-regime-card">
      <div className="analytics-stat__label">{title}</div>
      <div className="analytics-stat__value">{score.toFixed(2)}</div>
      <div className="analytics-stat__footnote">{detail}</div>
    </article>
  );
}
