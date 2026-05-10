type MarketSessionState = 'open' | 'closed' | 'unknown' | 'crypto_24_7';

export type SimulationQuoteUsability = {
  usable: boolean;
  price: number | null;
  reasonCode:
    | 'LIVE_QUOTE'
    | 'FRESH_QUOTE'
    | 'DELAYED_QUOTE'
    | 'CACHED_MARKET_CLOSED'
    | 'CACHED_SIMULATION_FALLBACK'
    | 'STALE_DURING_MARKET_HOURS'
    | 'MISSING_PRICE'
    | 'MARKET_DATA_UNAVAILABLE';
  warning?: string;
  freshnessState?: string;
  marketSessionState?: MarketSessionState;
  quoteAgeSeconds?: number;
  provider?: string;
};

type QuoteRecord = Record<string, unknown>;

function toFinitePositive(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function extractSimulationPrice(quote: unknown): number | null {
  if (!quote || typeof quote !== 'object') return null;
  const row = quote as QuoteRecord;
  const direct = [
    row.price,
    row.lastPrice,
    row.close,
    row.previousClose,
    row.regularMarketPrice,
  ];
  for (const candidate of direct) {
    const parsed = toFinitePositive(candidate);
    if (parsed !== null) return parsed;
  }
  const bid = toFinitePositive(row.bid);
  const ask = toFinitePositive(row.ask);
  if (bid !== null && ask !== null) return (bid + ask) / 2;
  if (bid !== null) return bid;
  if (ask !== null) return ask;
  return null;
}

function parseTimestamp(quote: QuoteRecord): number | null {
  const candidates = [quote.observedAt, quote.updatedAt, quote.receivedAt, quote.fetchedAt];
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const ts = new Date(candidate).getTime();
    if (Number.isFinite(ts)) return ts;
  }
  return null;
}

function isUsMarketOpen(now: Date): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const weekday = parts.find((part) => part.type === 'weekday')?.value ?? '';
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0');
  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  if (dayIndex < 1 || dayIndex > 5) return false;
  const totalMinutes = hour * 60 + minute;
  return totalMinutes >= 570 && totalMinutes < 960;
}

export function evaluateSimulationQuoteUsability(input: {
  symbol: string;
  assetClass: string;
  quote: unknown;
  now?: Date;
}): SimulationQuoteUsability {
  const now = input.now ?? new Date();
  const normalizedAssetClass = input.assetClass.trim().toLowerCase();
  const quote = (input.quote && typeof input.quote === 'object' ? input.quote : {}) as QuoteRecord;
  const price = extractSimulationPrice(quote);
  const freshnessState = typeof quote.freshnessState === 'string' ? quote.freshnessState : undefined;
  const provider = typeof quote.source === 'string'
    ? quote.source
    : typeof quote.provider === 'string'
      ? quote.provider
      : undefined;
  const ts = parseTimestamp(quote);
  const quoteAgeSeconds = ts === null ? undefined : Math.max(0, Math.floor((now.getTime() - ts) / 1000));
  const sessionState: MarketSessionState = normalizedAssetClass === 'crypto'
    ? 'crypto_24_7'
    : (normalizedAssetClass === 'stock' || normalizedAssetClass === 'etf' || normalizedAssetClass === 'index')
      ? (isUsMarketOpen(now) ? 'open' : 'closed')
      : 'unknown';

  if (price === null) {
    return {
      usable: false,
      price: null,
      reasonCode: 'MISSING_PRICE',
      warning: 'Simulation quote has no usable price.',
      freshnessState,
      marketSessionState: sessionState,
      quoteAgeSeconds,
      provider,
    };
  }

  if (normalizedAssetClass === 'crypto') {
    if (quoteAgeSeconds !== undefined && quoteAgeSeconds > 120) {
      return {
        usable: false,
        price,
        reasonCode: 'STALE_DURING_MARKET_HOURS',
        warning: 'Crypto quote is stale for simulation execution.',
        freshnessState,
        marketSessionState: sessionState,
        quoteAgeSeconds,
        provider,
      };
    }
    return {
      usable: true,
      price,
      reasonCode: freshnessState === 'live' ? 'LIVE_QUOTE' : 'FRESH_QUOTE',
      warning: freshnessState && freshnessState !== 'live' ? 'Delayed crypto quote used for simulation estimate.' : undefined,
      freshnessState,
      marketSessionState: sessionState,
      quoteAgeSeconds,
      provider,
    };
  }

  if (sessionState === 'closed') {
    return {
      usable: true,
      price,
      reasonCode: 'CACHED_MARKET_CLOSED',
      warning: 'Market is closed — simulation uses the latest available quote.',
      freshnessState,
      marketSessionState: sessionState,
      quoteAgeSeconds,
      provider,
    };
  }

  if (sessionState === 'open') {
    if (quoteAgeSeconds !== undefined && quoteAgeSeconds > 15 * 60) {
      return {
        usable: false,
        price,
        reasonCode: 'STALE_DURING_MARKET_HOURS',
        warning: 'Quote is too old during market hours.',
        freshnessState,
        marketSessionState: sessionState,
        quoteAgeSeconds,
        provider,
      };
    }
    return {
      usable: true,
      price,
      reasonCode: freshnessState === 'delayed' ? 'DELAYED_QUOTE' : 'FRESH_QUOTE',
      warning: freshnessState === 'delayed' ? 'Delayed quote used for simulation estimate.' : undefined,
      freshnessState,
      marketSessionState: sessionState,
      quoteAgeSeconds,
      provider,
    };
  }

  return {
    usable: true,
    price,
    reasonCode: 'CACHED_SIMULATION_FALLBACK',
    warning: 'Quote freshness is limited — simulation-only estimate.',
    freshnessState,
    marketSessionState: sessionState,
    quoteAgeSeconds,
    provider,
  };
}
