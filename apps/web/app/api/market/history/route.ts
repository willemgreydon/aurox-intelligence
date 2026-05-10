import { NextResponse } from 'next/server';
import { normalizeMarketGraphTimeframe, MARKET_GRAPH_TIMEFRAMES, type MarketGraphTimeframeId } from '../../../../lib/market-graph-timeframes';
import { loadHistoryBars } from '../../../../server/services/stock-simulation-service';
import { normalizeProviderErrorMessage } from '../../../../server/lib/provider-error-normalizer';

function mapTimeframeToResolution(timeframe: MarketGraphTimeframeId) {
  if (timeframe === '1m') return '1m' as const;
  if (timeframe === '1h') return '5m' as const;
  return '1d' as const;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') ?? '').trim().toUpperCase();
  const timeframe = normalizeMarketGraphTimeframe(searchParams.get('timeframe'));
  if (!symbol) {
    return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });
  }

  const minBars = MARKET_GRAPH_TIMEFRAMES[timeframe].targetPointCount;
  const resolution = mapTimeframeToResolution(timeframe);
  let bars: Awaited<ReturnType<typeof loadHistoryBars>> = [];
  let degradedReason: string | null = null;
  try {
    bars = await loadHistoryBars(symbol, minBars, resolution);
  } catch (error) {
    degradedReason = normalizeProviderErrorMessage(error);
  }
  // History bars change at most once per trading day for daily resolution, or every
  // few minutes for intraday. A short public cache with stale-while-revalidate lets
  // the client chart re-use the same bars during timeframe switches without hitting
  // the provider again.
  const ttl = resolution === '1d' ? 300 : 60;
  return NextResponse.json(
    {
      symbol,
      timeframe,
      resolution,
      bars: Array.isArray(bars) ? bars : [],
      degradedReason,
    },
    {
      headers: {
        'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`,
      },
    },
  );
}
