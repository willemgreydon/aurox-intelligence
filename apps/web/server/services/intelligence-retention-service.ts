import {
  pruneAlerts,
  pruneIntelligenceMemory,
  pruneObservationEvents,
  pruneOldNewsSnapshots,
  pruneResolvedAndDismissedAlerts,
} from '@repo/db';

/**
 * Best-effort retention sweep for append-only intelligence tables.
 *
 * These prune helpers already exist in @repo/db but were never called: in
 * production Vercel runs only the daily cron routes, not the long-lived
 * apps/worker scheduler, so nothing ever invoked them and the tables grew
 * unbounded (news snapshots with fat JSONB, observation events, alerts). This
 * service is wired into the daily `intelligence-history` cron so retention runs
 * exactly where prod executes.
 *
 * Every prune is isolated: one failure (or a not-yet-migrated table) must never
 * abort the others or fail the cron. The function never throws — it returns a
 * summary the caller can log.
 */
export type RetentionResult = {
  ran: string[];
  failed: { task: string; error: string }[];
};

// Conservative windows — comfortably beyond what any surface displays.
// News (/news shows ~3 days) keeps 90d of history for context/backfill;
// operational events and alerts are ephemeral (30d); memory 90d.
const RETENTION_DAYS = {
  observationEvents: 30,
  alerts: 30,
  news: 90,
  intelligenceMemory: 90,
} as const;

export async function runIntelligenceRetention(): Promise<RetentionResult> {
  const ran: string[] = [];
  const failed: RetentionResult['failed'] = [];

  const tasks: Array<[string, () => Promise<void>]> = [
    ['observation_events', () => pruneObservationEvents(RETENTION_DAYS.observationEvents)],
    ['alerts', () => pruneAlerts(RETENTION_DAYS.alerts)],
    ['alerts_resolved_dismissed', () => pruneResolvedAndDismissedAlerts(RETENTION_DAYS.alerts)],
    ['news', () => pruneOldNewsSnapshots(RETENTION_DAYS.news)],
    ['intelligence_memory', () => pruneIntelligenceMemory(RETENTION_DAYS.intelligenceMemory)],
  ];

  for (const [name, run] of tasks) {
    try {
      await run();
      ran.push(name);
    } catch (error) {
      failed.push({ task: name, error: error instanceof Error ? error.message : 'prune_failed' });
    }
  }

  return { ran, failed };
}
