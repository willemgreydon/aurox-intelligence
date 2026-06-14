/**
 * Central, asset-class-aware quote-freshness display model.
 *
 * This is a PURE function module (no I/O, no `Date.now()` baked in — `now` is
 * injectable) so it can be unit-tested deterministically and used from both
 * server and client code. It composes the same thresholds the simulation
 * engine uses (`apps/web/server/services/simulation-quote-usability.ts`) into a
 * single display contract the UI can render without re-deriving anything.
 *
 * Design rules honored:
 *  - Crypto trades 24/7 → it is never "market closed"; it goes live → delayed → stale.
 *  - Equities/ETFs can be benignly "market closed" (last close), distinct from
 *    "stale" (unexpectedly old during open hours).
 *  - A missing/incomplete payload is "partial"; no usable price is "unavailable".
 *  - Stale / partial / unavailable quotes are NEVER reported as tradable or as
 *    reliable for valuation — they render with a clear, reduced-confidence label.
 */

export type QuoteFreshnessState =
  | 'live'
  | 'delayed'
  | 'market_closed'
  | 'stale'
  | 'partial'
  | 'unavailable';

/** Maps to the workstation `status-pill--*` tone vocabulary. */
export type QuoteFreshnessTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export type QuoteFreshnessDisplay = {
  state: QuoteFreshnessState;
  tone: QuoteFreshnessTone;
  /** Safe to use as the execution/preview price for a *simulation* order. */
  isTradableForSimulation: boolean;
  /** Reliable enough to value a holding (drives the portfolio approximate-valuation warning). */
  isReliableForValuation: boolean;
  ageSeconds: number | null;
  lastUpdatedAt: number | null;
  providerLabel: string | null;
};

export type QuoteFreshnessInput = {
  assetClass: string;
  /** Unix ms, ISO string, or null. */
  timestamp?: number | string | null;
  price?: number | null;
  /**
   * Set false when the provider returned a quote object but with missing/invalid
   * fields (incomplete payload). Defaults to true.
   */
  hasCompletePayload?: boolean;
  /** Injectable clock (Unix ms). Defaults to runtime now. */
  now?: number;
  /** Optional explicit market-session override; otherwise derived for equities. */
  marketOpen?: boolean;
  provider?: string | null;
};

// Thresholds (seconds). Equity values mirror getFreshnessState (live ≤ 20m);
// crypto live boundary mirrors the simulation engine's 120s tradability rule.
const CRYPTO_LIVE_MAX_SEC = 120;
const CRYPTO_DELAYED_MAX_SEC = 15 * 60;
const EQUITY_LIVE_MAX_SEC = 20 * 60;
const EQUITY_DELAYED_MAX_SEC = 120 * 60;

const EQUITY_CLASSES = new Set(['stock', 'etf', 'index', 'fx', 'forex']);

function toMillis(timestamp: number | string | null | undefined): number | null {
  if (timestamp === null || timestamp === undefined) return null;
  if (typeof timestamp === 'number') return Number.isFinite(timestamp) ? timestamp : null;
  const parsed = new Date(timestamp).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

/** Pure US-market-hours check (Mon–Fri, 09:30–16:00 ET) for a given instant. */
export function isUsMarketOpenAt(now: number): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(now));
  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  if (dayIndex < 1 || dayIndex > 5) return false;
  const totalMinutes = hour * 60 + minute;
  return totalMinutes >= 570 && totalMinutes < 960;
}

const TONE_BY_STATE: Record<QuoteFreshnessState, QuoteFreshnessTone> = {
  live: 'success',
  market_closed: 'info',
  delayed: 'warning',
  stale: 'danger',
  partial: 'warning',
  unavailable: 'neutral',
};

function hasUsablePrice(price: number | null | undefined): boolean {
  return typeof price === 'number' && Number.isFinite(price) && price > 0;
}

export function classifyQuoteFreshness(input: QuoteFreshnessInput): QuoteFreshnessDisplay {
  const now = input.now ?? Date.now();
  const assetClass = input.assetClass.trim().toLowerCase();
  const isCrypto = assetClass === 'crypto';
  const provider = typeof input.provider === 'string' && input.provider.trim() ? input.provider.trim() : null;
  const lastUpdatedAt = toMillis(input.timestamp);
  const ageSeconds = lastUpdatedAt === null ? null : Math.max(0, Math.floor((now - lastUpdatedAt) / 1000));

  const base = {
    tone: TONE_BY_STATE.unavailable,
    isTradableForSimulation: false,
    isReliableForValuation: false,
    ageSeconds,
    lastUpdatedAt,
    providerLabel: provider,
  };

  // No usable price → unavailable, regardless of timestamp.
  if (!hasUsablePrice(input.price)) {
    return { ...base, state: 'unavailable', tone: TONE_BY_STATE.unavailable };
  }

  // Price present but payload flagged incomplete, or timestamp unusable → partial.
  if (input.hasCompletePayload === false || lastUpdatedAt === null || ageSeconds === null) {
    return { ...base, state: 'partial', tone: TONE_BY_STATE.partial };
  }

  let state: QuoteFreshnessState;
  if (isCrypto) {
    if (ageSeconds <= CRYPTO_LIVE_MAX_SEC) state = 'live';
    else if (ageSeconds <= CRYPTO_DELAYED_MAX_SEC) state = 'delayed';
    else state = 'stale';
  } else {
    const marketOpen = input.marketOpen ?? (EQUITY_CLASSES.has(assetClass) ? isUsMarketOpenAt(now) : true);
    if (!marketOpen && EQUITY_CLASSES.has(assetClass)) {
      state = 'market_closed';
    } else if (ageSeconds <= EQUITY_LIVE_MAX_SEC) {
      state = 'live';
    } else if (ageSeconds <= EQUITY_DELAYED_MAX_SEC) {
      state = 'delayed';
    } else {
      state = 'stale';
    }
  }

  const tone = TONE_BY_STATE[state];

  // Tradability: crypto must be live (≤120s, matching the engine); equities may
  // trade on live/delayed/market_closed but never on stale.
  const isTradableForSimulation = isCrypto
    ? state === 'live'
    : state === 'live' || state === 'delayed' || state === 'market_closed';

  // Valuation reliability: live, delayed (reduced confidence), and last-close
  // (market_closed) are acceptable; stale is not.
  const isReliableForValuation = state === 'live' || state === 'delayed' || state === 'market_closed';

  return {
    state,
    tone,
    isTradableForSimulation,
    isReliableForValuation,
    ageSeconds,
    lastUpdatedAt,
    providerLabel: provider,
  };
}

export type QuoteFreshnessLabelSet = Record<QuoteFreshnessState, string>;

/** Map a freshness state to its short localized label (pass i18n `common.freshness*`). */
export function getQuoteFreshnessShortLabel(
  state: QuoteFreshnessState,
  labels: Partial<QuoteFreshnessLabelSet> = {},
): string {
  const fallback: QuoteFreshnessLabelSet = {
    live: 'Live',
    delayed: 'Delayed',
    market_closed: 'Market closed',
    stale: 'Stale',
    partial: 'Partial',
    unavailable: 'Unavailable',
  };
  return labels[state] ?? fallback[state];
}
