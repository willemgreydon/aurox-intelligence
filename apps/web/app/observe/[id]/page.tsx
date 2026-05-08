import { getObservationEvent } from '@repo/db';
import { Section } from '../../../components/ui/section';
import { WorkstationPageHeader } from '../../../components/asset/workstation-page-header';
import { requireCurrentSession } from '../../../server/auth/session';

export const dynamic = 'force-dynamic';

export default async function ObserveEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCurrentSession('/login');
  const { id } = await params;
  const event = await getObservationEvent(id, session.user.id);

  return (
    <Section className="dashboard-section dashboard-section--hero">
      <WorkstationPageHeader
        eyebrow="Observe"
        title={event?.title ?? 'Observation detail unavailable'}
        description={event?.description ?? 'No persisted event details found.'}
        summary={event ? `Source ${event.source}, severity ${event.severity}, observed ${new Date(event.observedAt).toLocaleString('en-US')}.` : 'Event may be pending persistence or pruned by retention policy.'}
        statusLabel={event?.severity ?? 'UNAVAILABLE'}
        statusTone={event ? 'info' : 'warning'}
        meta={[
          { label: 'Source', value: event?.source ?? 'n/a' },
          { label: 'Severity', value: event?.severity ?? 'n/a' },
        ]}
        actions={[
          { href: '/observe', label: 'Back to observe' },
          ...(event?.symbol ? [{ href: `/stocks/${event.symbol}`, label: `Inspect ${event.symbol}` }] : []),
        ]}
      />
      {event ? (
        <article className="analytics-card">
          <div className="analytics-card__body">
            <p><strong>Why am I seeing this?</strong> {event.description}</p>
            <p className="text-muted">Confidence: {event.confidence === null || event.confidence === undefined ? 'n/a' : `${(event.confidence * 100).toFixed(0)}%`}</p>
            <details>
              <summary>Developer metadata</summary>
              <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
            </details>
          </div>
        </article>
      ) : null}
    </Section>
  );
}
