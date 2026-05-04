import { Section } from '../../../components/ui/section';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { Card } from '../../../components/ui/card';
import { getLiveReadinessView } from '../../../server/services/live-readiness-service';

export const dynamic = 'force-dynamic';

function tone(status: 'PASSED' | 'FAILED' | 'WARNING') {
  if (status === 'PASSED') return 'success';
  if (status === 'FAILED') return 'danger';
  return 'warning';
}

export default async function AdminLiveReadinessPage() {
  const readiness = await getLiveReadinessView();
  const total = readiness.groupedGates.reduce((sum, group) => sum + group.gates.length, 0);
  const failed = readiness.groupedGates.flatMap((group) => group.gates).filter((gate) => gate.status === 'FAILED').length;

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero">
        <WorkstationPageHeader
          eyebrow="Admin / Live readiness"
          title="Live trading readiness gates"
          description="Readiness checks for broker-mode activation."
          summary={readiness.executionMessage}
          statusLabel={readiness.status}
          statusTone={tone(readiness.status)}
          meta={[
            { label: 'Total gates', value: String(total) },
            { label: 'Blocking fails', value: String(failed) },
            { label: 'Execution', value: 'Simulation only' },
          ]}
          actions={[
            { href: '/admin', label: 'Back to admin' },
            { href: '/invest', label: 'Open invest' },
          ]}
        />
      </Section>

      <Section className="dashboard-section">
        <Card className="analytics-card">
          <div className="analytics-card__header">
            <div>
              <div className="section__eyebrow">Why locked?</div>
              <h3>Live trading lock summary</h3>
              <p>{readiness.whyLocked}</p>
            </div>
            <span className={`status-pill status-pill--${tone(readiness.status)}`}>{readiness.status}</span>
          </div>
          <div className="analytics-card__body">
            <p>{readiness.executionMessage}</p>
          </div>
        </Card>
      </Section>

      <Section className="dashboard-section">
        <div className="dashboard-grid">
          {readiness.groupedGates.map((group) => (
            <Card key={group.key} className="analytics-card">
              <div className="analytics-card__header">
                <div>
                  <div className="section__eyebrow">Readiness group</div>
                  <h3>{group.label}</h3>
                </div>
              </div>
              <div className="analytics-card__body">
                <ul className="detail-slot-card__list">
                  {group.gates.map((gate) => (
                    <li key={gate.id}>
                      <strong>{gate.label}</strong>{' '}
                      <span className={`status-pill status-pill--${tone(gate.status)}`}>{gate.status}</span>{' '}
                      <span className="section__eyebrow">{gate.blocking ? 'Blocking' : 'Non-blocking'}</span>
                      <p>{gate.explanation}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
