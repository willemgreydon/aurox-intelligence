export interface Quote {
  symbol: string;
  price: number;
  timestamp: number;
  source: string;
}

export interface QuoteProvider {
  name: string;
  getQuote(symbol: string): Promise<Quote | null>;
}

export async function resolveBestQuote(
  symbol: string,
  providers: QuoteProvider[],
  maxAgeMs = 5000
): Promise<Quote> {
  for (const provider of providers) {
    try {
      const q = await provider.getQuote(symbol);
      if (!q) continue;

      const age = Date.now() - q.timestamp;

      if (age <= maxAgeMs) {
        return q;
      }
    } catch {}
  }

  throw new Error(`No fresh quote for ${symbol}`);
}