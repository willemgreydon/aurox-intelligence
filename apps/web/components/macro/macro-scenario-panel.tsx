export function MacroScenarioPanel({ explanations }: { explanations: string[] }) {
  return (
    <article className="analytics-card">
      <div className="section__eyebrow">Scenario analysis</div>
      <h3>Deterministic macro commentary</h3>
      <ul className="analytics-list">
        {explanations.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
      </ul>
      <p className="simulation-form__meta">Simulation context only. No trade execution is triggered here.</p>
    </article>
  );
}
