export function MacroRiskOverlay({ score, confidence, note }: { score: number; confidence: number; note: string }) {
  return (
    <article className="analytics-card">
      <div className="section__eyebrow">Macro risk overlay</div>
      <h3>{score > 0 ? 'Risk supportive' : score < 0 ? 'Risk pressure' : 'Neutral'}</h3>
      <p>{note}</p>
      <p className="simulation-form__meta">Score {score.toFixed(2)} · Confidence {(confidence * 100).toFixed(0)}%</p>
    </article>
  );
}
