import { getSignalAccuracy } from '@repo/db';
import { mapSignalAccuracy, type SignalAccuracyViewModel } from '../mappers/signal-accuracy-mapper';

/** Forward-return horizon (sessions) used for the empirical accuracy read-out. */
const HORIZON_DAYS = 10;

export async function getSignalAccuracyViewModel(): Promise<SignalAccuracyViewModel> {
  const rows = await getSignalAccuracy(HORIZON_DAYS).catch(() => []);
  return mapSignalAccuracy(rows, HORIZON_DAYS);
}
