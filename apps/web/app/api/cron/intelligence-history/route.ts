import { getDatabaseSizeReport } from '@repo/db';
import { NextResponse } from 'next/server';
import { evaluateMatureEvidence } from '../../../../server/services/intelligence-evaluation-service';
import { recordUniverseSignalHistory } from '../../../../server/services/intelligence-history-service';
import { runIntelligenceRetention } from '../../../../server/services/intelligence-retention-service';
import { getNeonConsumption } from '../../../../server/services/neon-consumption-service';

const MB = 1024 * 1024;

function toMb(bytes: number): number {
  return Math.round((bytes / MB) * 10) / 10;
}

/**
 * Vercel Cron target — records a daily deterministic signal snapshot for the
 * tradable universe into `signal_history`. This is the writer that lets the
 * Phase F validation surfaces (signal accuracy / pattern expectancy) accrue
 * meaningful history over time; nothing can be backfilled. Scheduled in
 * apps/web/vercel.json → crons.
 *
 * Auth mirrors /api/cron/news-intelligence: with CRON_SECRET set, Vercel Cron
 * sends `Authorization: Bearer <CRON_SECRET>` and we require an exact match; in
 * production the endpoint fails closed if the secret is not configured.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (secret) {
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET is not configured' }, { status: 503 });
  }

  try {
    const now = new Date().toISOString();
    const result = await recordUniverseSignalHistory(now);

    // Evaluate matured signals and forecasts (horizon = 10 trading days).
    // Best-effort: never throws, partial failures are reported in the response.
    // Bounded to BATCH_LIMIT items per run so it stays within the 60s maxDuration.
    const evaluation = await evaluateMatureEvidence(now).catch((err) => ({
      signalOutcomes: 0,
      forecastEvaluations: 0,
      skipped: 0,
      errors: [{ id: 'evaluation', error: err instanceof Error ? err.message : String(err) }],
    }));

    // Best-effort retention sweep — never throws, so it cannot fail the cron.
    // This is the only prod execution path that runs the (previously dead)
    // prune helpers, keeping append-only intelligence tables bounded.
    const retention = await runIntelligenceRetention();

    // Lightweight size-trend line. Egress (the failing Neon quota) is not
    // SQL-queryable — read it from the Neon console. DB size + top tables are the
    // actionable proxy: they show what is growing so retention can be tuned.
    // Best-effort: getDatabaseSizeReport returns null on any failure.
    const sizeReport = await getDatabaseSizeReport();
    const dbSize = sizeReport
      ? {
          databaseMb: toMb(sizeReport.databaseBytes),
          topTables: sizeReport.topTables.map((t) => ({ table: t.table, mb: toMb(t.bytes) })),
        }
      : null;
    if (dbSize) {
      console.info(
        `[cron:intelligence-history] db-size ${dbSize.databaseMb}MB | top: ` +
          dbSize.topTables
            .slice(0, 5)
            .map((t) => `${t.table}=${t.mb}MB`)
            .join(', '),
      );
    }

    // Authoritative egress (Neon "Network transfer") — the free-plan cap that
    // takes the site down. Not SQL-queryable, so read via the Neon API. Opt-in
    // (NEON_API_KEY + NEON_PROJECT_ID) and fail-safe: null when unconfigured.
    const neonConsumption = await getNeonConsumption();
    if (neonConsumption) {
      console.info(
        `[cron:intelligence-history] neon-usage egress=${neonConsumption.egressMb ?? '?'}MB/` +
          `${neonConsumption.egressCapMb}MB (${neonConsumption.egressPctOfCap ?? '?'}% of free cap) ` +
          `storage=${neonConsumption.storageMb ?? '?'}MB compute=${neonConsumption.computeHours ?? '?'}h ` +
          `period=${neonConsumption.periodStart ?? '?'}→${neonConsumption.periodEnd ?? '?'}`,
      );

      // Budget alarm — the whole point of the telemetry is to be warned BEFORE the
      // free-tier network-transfer cap takes the site down (PostgresError 53000).
      // Fires at 80% of the billing-cycle cap so there is runway to react (tighten
      // retention, extend cache TTLs, or upgrade the Neon plan) before exhaustion.
      const EGRESS_ALERT_PCT = 80;
      if (
        neonConsumption.egressPctOfCap != null &&
        neonConsumption.egressPctOfCap >= EGRESS_ALERT_PCT
      ) {
        console.warn(
          `[cron:intelligence-history] ⚠ EGRESS BUDGET ALERT: ${neonConsumption.egressPctOfCap}% of the Neon ` +
            `free network-transfer cap used this cycle (${neonConsumption.egressMb ?? '?'}MB/${neonConsumption.egressCapMb}MB). ` +
            `Act before 100% (site goes down at the cap): tighten retention, raise cache TTLs, or upgrade the Neon plan.`,
        );
      }
    }

    return NextResponse.json({ ok: true, ...result, evaluation, retention, dbSize, neonConsumption });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'record_failed' },
      { status: 500 },
    );
  }
}
