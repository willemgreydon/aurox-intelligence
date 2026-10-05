import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { MARKET_TICKER_CACHE_TAG, tickerSymbols } from '../../../../server/queries/market-ticker-query';
import { loadQuoteSnapshots } from '../../../../server/services/stock-simulation-service';

/**
 * Refresh target for the ambient market ticker (apps/web/components/layout/market-ticker.tsx).
 *
 * Why this exists: the ticker reads quote snapshots in `preferCached` mode and
 * never fetches the provider itself, so its freshness is only ever as good as
 * whatever last *wrote* `app.market_quote_snapshots`. In production Vercel does
 * not run the long-lived apps/worker ingestion loop, and no other cron refreshes
 * quotes — so without this endpoint the ticker ages to "N days ago" whenever the
 * invest surfaces go untrafficked.
 *
 * What it does: one `loadQuoteSnapshots` call over the exact ticker universe,
 * WITHOUT `preferCached`, so stale/missing symbols take the full provider-fetch
 * + `upsertMarketQuoteSnapshots` path. That path batches all stale symbols into a
 * single provider request and a single upsert, so a per-minute schedule costs ~1
 * provider call + ~1 DB write per tick — deliberately egress-light (the binding
 * Neon free-tier constraint). After writing, it invalidates the ticker's Data
 * Cache tag so the new prices surface within one tick.
 *
 * Auth mirrors the other crons: with CRON_SECRET set we require an exact
 * `Authorization: Bearer <CRON_SECRET>` match; in production the endpoint fails
 * closed when the secret is not configured, so it can never run anonymously.
 *
 * Cadence: external schedulers (cron-job.org / Upstash QStash) or Vercel Pro can
 * drive this every minute; the in-repo GitHub Actions workflow is a ~5-minute
 * best-effort floor. See .github/workflows/market-quotes-refresh.yml.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function isAuthorized(request: Request): { ok: true } | { ok: false; status: number; error: string } {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (secret) {
    return authHeader === `Bearer ${secret}`
      ? { ok: true }
      : { ok: false, status: 401, error: 'unauthorized' };
  }
  if (process.env.NODE_ENV === 'production') {
    return { ok: false, status: 503, error: 'CRON_SECRET is not configured' };
  }
  return { ok: true };
}

export async function GET(request: Request) {
  const auth = isAuthorized(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  try {
    // No `preferCached` → stale/missing symbols take the provider-fetch + upsert
    // path. Batched internally into one provider call + one upsert.
    const snapshots = await loadQuoteSnapshots([...tickerSymbols], undefined, {
      maxSymbols: tickerSymbols.length,
    });

    // Surface the freshly written rows on the next ticker render immediately.
    // Next 16's `revalidateTag` takes a cache-life profile as its second arg;
    // 'max' performs an on-demand purge of the tagged `unstable_cache` entry.
    revalidateTag(MARKET_TICKER_CACHE_TAG, 'max');

    // observedAt/fetchedAt are ISO strings; parse to epoch ms for min/max.
    const epochs = snapshots
      .map((row) => Date.parse(row.observedAt ?? row.fetchedAt))
      .filter((value) => Number.isFinite(value));
    const freshestAt = epochs.length > 0 ? Math.max(...epochs) : null;
    const oldestAt = epochs.length > 0 ? Math.min(...epochs) : null;

    return NextResponse.json({
      ok: true,
      requested: tickerSymbols.length,
      refreshed: snapshots.length,
      source: snapshots[0]?.source ?? null,
      freshestAt: freshestAt !== null ? new Date(freshestAt).toISOString() : null,
      oldestAt: oldestAt !== null ? new Date(oldestAt).toISOString() : null,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'refresh_failed' },
      { status: 500 },
    );
  }
}
