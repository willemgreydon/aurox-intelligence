import { getDatabaseSizeReport } from '@repo/db';
import { NextResponse } from 'next/server';
import { recordUniverseSignalHistory } from '../../../../server/services/intelligence-history-service';
import { runIntelligenceRetention } from '../../../../server/services/intelligence-retention-service';

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
    const result = await recordUniverseSignalHistory();
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

    return NextResponse.json({ ok: true, ...result, retention, dbSize });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'record_failed' },
      { status: 500 },
    );
  }
}
