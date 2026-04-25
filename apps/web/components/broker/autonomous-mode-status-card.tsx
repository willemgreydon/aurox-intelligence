import { Card } from '../ui/card';

type AutonomousModeStatusCardProps = {
  enabled: boolean;
  mode: 'simulation' | 'paper' | 'live';
  lastDryRunAt: string | null;
  reason: string;
};

export function AutonomousModeStatusCard({ enabled, mode, lastDryRunAt, reason }: AutonomousModeStatusCardProps) {
  return (
    <Card className="analytics-card">
      <div className="analytics-card__header">
        <div>
          <div className="section__eyebrow">Autonomous agents</div>
          <h3>{enabled ? 'Enabled' : 'Disabled by default'}</h3>
          <p>Agentic trading workflow remains safety-gated and dry-run first.</p>
        </div>
        <span className={`status-pill status-pill--${enabled ? 'warning' : 'info'}`}>{mode}</span>
      </div>
      <div className="analytics-card__body">
        <p>{reason}</p>
        <p>Last dry run: {lastDryRunAt ?? 'No dry-run audit yet.'}</p>
      </div>
    </Card>
  );
}
