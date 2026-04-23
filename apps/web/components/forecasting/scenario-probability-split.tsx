import type { ScenarioSplit } from '../../lib/dashboard/analytics-fixtures';

type ScenarioProbabilitySplitProps = {
  items: ScenarioSplit[];
};

export function ScenarioProbabilitySplit({ items }: ScenarioProbabilitySplitProps) {
  return (
    <div className="scenario-split" aria-label="Scenario probability split">
      {items.map((item) => (
        <div key={item.label} className={`scenario-split__segment scenario-split__segment--${item.tone}`} style={{ width: `${item.value}%` }}>
          <span>{item.label}</span>
          <strong>{item.value}%</strong>
        </div>
      ))}
    </div>
  );
}
