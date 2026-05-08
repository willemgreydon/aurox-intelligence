import { Section } from '../../../components/ui/section';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { requireCurrentSession } from '../../../server/auth/session';
import { getIntelligenceReplayModel } from '../../../server/services/intelligence-replay-service';

export const dynamic = 'force-dynamic';

export default async function ReplayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCurrentSession('/login');
  const { id } = await params;
  const replay = await getIntelligenceReplayModel({ replayId: id, userId: session.user.id });

  return (
    <>
      <Section className="dashboard-section dashboard-section--hero dashboard-section--compact">
        <WorkstationPageHeader
          eyebrow="Replay"
          title={replay?.subject ?? 'Replay unavailable'}
          description={replay?.symbol ? `Intelligence replay for ${replay.symbol}` : 'No replay subject found.'}
          summary={replay ? `Severity ${replay.severity}, created ${new Date(replay.createdAt).toLocaleString('en-US')}.` : 'No replay data available for this identifier.'}
          statusLabel={replay?.severity ?? 'UNAVAILABLE'}
          statusTone={replay ? 'info' : 'warning'}
          meta={[
            { label: 'Symbol', value: replay?.symbol ?? 'n/a' },
            { label: 'Timeline points', value: replay ? String(replay.timeline.length) : '0' },
          ]}
          actions={[
            { href: '/alerts', label: 'Back to alerts' },
            { href: '/observe', label: 'Observe' },
          ]}
        />
      </Section>

      {replay ? (
        <section className="dashboard-section dashboard-section--compact dashboard-section--tinted">
          <div className="analytics-two-grid">
            <article className="analytics-card">
              <div className="analytics-card__header"><div><div className="section__eyebrow">What Triggered This?</div><h3>Primary event</h3></div></div>
              <div className="analytics-card__body">
                {replay.explanation.map((line) => <p key={line} className="text-muted">{line}</p>)}
              </div>
            </article>

            <article className="analytics-card">
              <div className="analytics-card__header"><div><div className="section__eyebrow">Outcome</div><h3>Simulation outcome context</h3></div></div>
              <div className="analytics-card__body">
                <p className="text-muted">Status: {replay.outcomeContext?.status ?? 'UNAVAILABLE'}</p>
                <p className="text-muted">ROI: {replay.outcomeContext?.roiPercent === null || replay.outcomeContext?.roiPercent === undefined ? 'n/a' : `${replay.outcomeContext.roiPercent.toFixed(2)}%`}</p>
                <p className="text-muted">PnL: {replay.outcomeContext?.pnlAmount === null || replay.outcomeContext?.pnlAmount === undefined ? 'n/a' : replay.outcomeContext.pnlAmount.toFixed(2)}</p>
              </div>
            </article>
          </div>

          <article className="analytics-card" style={{ marginTop: '0.8rem' }}>
            <div className="analytics-card__header"><div><div className="section__eyebrow">What Changed?</div><h3>Before vs after context</h3></div></div>
            <div className="analytics-card__body">
              <pre>{JSON.stringify({ beforeState: replay.beforeState, afterState: replay.afterState, decisionContext: replay.decisionContext }, null, 2)}</pre>
            </div>
          </article>

          <article className="analytics-card" style={{ marginTop: '0.8rem' }}>
            <div className="analytics-card__header"><div><div className="section__eyebrow">Timeline</div><h3>Replay trail</h3></div></div>
            <div className="analytics-card__body">
              <div className="observe-timeline">
                {replay.timeline.length === 0 ? <p className="text-muted">No timeline points available.</p> : replay.timeline.map((row) => (
                  <article key={`${row.timestamp}-${row.label}`} className="observe-timeline__item">
                    <span className="status-pill status-pill--neutral">{new Date(row.timestamp).toLocaleString('en-US')}</span>
                    <div><strong>{row.label}</strong><p className="text-muted">{row.detail}</p></div>
                  </article>
                ))}
              </div>
            </div>
          </article>

          <article className="analytics-card" style={{ marginTop: '0.8rem' }}>
            <div className="analytics-card__header"><div><div className="section__eyebrow">Raw metadata</div><h3>Audit block</h3></div></div>
            <div className="analytics-card__body">
              {replay.missingData.length > 0 ? (
                <ul className="observe-bullets">
                  {replay.missingData.map((line) => <li key={line}>{line}</li>)}
                </ul>
              ) : null}
              <details>
                <summary>Show raw metadata</summary>
                <pre>{JSON.stringify(replay.rawMetadata, null, 2)}</pre>
              </details>
            </div>
          </article>
        </section>
      ) : null}
    </>
  );
}
