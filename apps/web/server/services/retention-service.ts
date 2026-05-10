import { pruneAlerts, pruneObservationEvents, pruneResolvedAndDismissedAlerts } from '@repo/db';

export type RetentionOptions = {
  observationDays?: number;
  resolvedAlertsDays?: number;
  allAlertsDays?: number;
};

export async function runRetentionMaintenance(options: RetentionOptions = {}) {
  const observationDays = options.observationDays ?? 30;
  const resolvedAlertsDays = options.resolvedAlertsDays ?? 30;
  const allAlertsDays = options.allAlertsDays ?? 120;

  await pruneObservationEvents(observationDays);
  await pruneResolvedAndDismissedAlerts(resolvedAlertsDays);
  await pruneAlerts(allAlertsDays);
}
