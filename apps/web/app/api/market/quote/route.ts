import { NextResponse } from 'next/server';
import { z } from 'zod';
import { detectCanonicalAssetKind } from '@repo/providers';
import { loadQuoteSnapshots } from '../../../../server/services/stock-simulation-service';
import { normalizeProviderErrorMessage } from '../../../../server/lib/provider-error-normalizer';

const querySchema = z.object({
  symbol: z.string().trim().min(1),
  assetClass: z.enum(['stock', 'etf', 'crypto']).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    symbol: searchParams.get('symbol'),
    assetClass: searchParams.get('assetClass') ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid quote request.' }, { status: 400 });
  }

  const symbol = parsed.data.symbol.toUpperCase();
  const expectedAssetClass = parsed.data.assetClass;
  const detected = detectCanonicalAssetKind(symbol);
  if (expectedAssetClass && detected !== expectedAssetClass) {
    return NextResponse.json({ error: 'Symbol/assetClass mismatch.' }, { status: 400 });
  }

  try {
    const quote = await loadQuoteSnapshots([symbol]).then((rows) => rows[0] ?? null);
    if (!quote) {
      return NextResponse.json({ error: 'Quote unavailable.' }, { status: 404 });
    }
    return NextResponse.json({ quote }, {
      headers: {
        // Allow CDN/browser to serve a cached quote for up to 30 s,
        // then revalidate in the background (stale-while-revalidate).
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: normalizeProviderErrorMessage(error) }, { status: 503 });
  }
}

