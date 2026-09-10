import { NextResponse } from 'next/server';
import { ingestNewsIntelligenceSnapshots } from '../../../../server/services/news-intelligence-service';

/**
 * Vercel Cron target — refreshes app.news_intelligence_snapshots so the /news
 * "AI Intelligence Snapshots" panel stays populated in production. Vercel does
 * not run the long-lived apps/worker scheduler, so this route is the production
 * equivalent of the worker's extract-news-intelligence job. Scheduled in
 * apps/web/vercel.json → crons.
 *
 * Auth: when CRON_SECRET is set, Vercel Cron sends it as `Authorization:
 * Bearer <CRON_SECRET>`; we require an exact match. In production the endpoint
 * fails closed if the secret is not configured, so it can never be triggered
 * anonymously.
 */
export const dynamic = 'force-dynamic';
// Ingesting the news batch (fetch + dedupe + upserts) can exceed the default
// function timeout; give it headroom (capped lower on Hobby plans).
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (secret) {
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET is not configured' },
      { status: 503 },
    );
  }

  try {
    const result = await ingestNewsIntelligenceSnapshots();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'ingestion_failed' },
      { status: 500 },
    );
  }
}
