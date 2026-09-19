import { notFound } from 'next/navigation';
import { simulationLaneIdSchema } from '@repo/api-contracts';
import { LaneDetail } from '../../../../../components/invest/lane-detail';
import { getSimulationLaneDetailForCurrentUser } from '../../../../../server/services/simulation-lane-detail-service';
import { getMessages } from '../../../../../lib/i18n/messages';
import { getRequestLocale } from '../../../../../server/i18n/locale';

// User-specific simulation state — must never be cached at the route level.
export const dynamic = 'force-dynamic';

export default async function SimulationLaneDetailPage({
  params,
}: {
  params: Promise<{ laneId: string }>;
}) {
  const { laneId } = await params;
  const parsed = simulationLaneIdSchema.safeParse(laneId);

  // An unknown lane id is genuinely a missing resource → 404 is correct here.
  if (!parsed.success) {
    notFound();
  }

  const vm = await getSimulationLaneDetailForCurrentUser(parsed.data);
  if (!vm) {
    notFound();
  }

  const locale = await getRequestLocale();
  const messages = getMessages(locale);

  return <LaneDetail vm={vm} locale={locale} messages={messages} />;
}
