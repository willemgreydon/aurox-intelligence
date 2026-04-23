import type { ScenarioSplit } from '../../lib/dashboard/analytics-fixtures';
import { ScenarioProbabilitySplit } from './scenario-probability-split';

type ScenarioCardProps = {
  title: string;
  description: string;
  scenarios: ScenarioSplit[];
  drivers: string[];
  risks: string[];
};

export function ScenarioCard({ title, description, scenarios, drivers, risks }: ScenarioCardProps) {
  return (
    <article className="analytics-card analytics-card--scenario">
      <header className="analytics-card__header">
        <div>
          <div className="analytics-stat__label">Forecast scenarios</div>
          <h3>{title}</h3>
        </div>
      </header>
      <p className="analytics-stat__detail">{description}</p>
      <ScenarioProbabilitySplit items={scenarios} />
      <div className="scenario-card__grid">
        <div>
          <h4>Drivers</h4>
          <ul className="scenario-card__list">
            {drivers.map((driver) => (
              <li key={driver}>{driver}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Risks</h4>
          <ul className="scenario-card__list">
            {risks.map((risk) => (
              <li key={risk}>{risk}</li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}
