type IntegerFallbackOptions = {
  min: number;
  max: number;
  fallback: number;
};

function parseIntegerEnv(value: string | undefined, options: IntegerFallbackOptions): number {
  if (!value) {
    return options.fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return options.fallback;
  }

  return Math.min(options.max, Math.max(options.min, Math.floor(parsed)));
}

export function isPerfLoggingEnabled() {
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }

  const raw = process.env.ENABLE_PERF_LOGS;
  if (!raw) {
    return true;
  }

  return raw === '1' || raw.toLowerCase() === 'true';
}

export function getMarketQueryInitialLimit() {
  return parseIntegerEnv(process.env.MARKET_QUERY_INITIAL_LIMIT, {
    min: 8,
    max: 256,
    fallback: 32,
  });
}

export function getMarketSnapshotCacheTtlMs() {
  const fallback = process.env.NODE_ENV === 'development' ? 45_000 : 20_000;
  return parseIntegerEnv(process.env.MARKET_CACHE_TTL_MS, {
    min: 5_000,
    max: 5 * 60_000,
    fallback,
  });
}

export function getMarketHistoryCacheTtlMs() {
  return parseIntegerEnv(process.env.MARKET_HISTORY_CACHE_TTL_MS, {
    min: 30_000,
    max: 60 * 60_000,
    fallback: 10 * 60_000,
  });
}

export function getMarketCatalogCacheTtlMs() {
  return parseIntegerEnv(process.env.MARKET_CATALOG_CACHE_TTL_MS, {
    min: 5 * 60_000,
    max: 6 * 60 * 60_000,
    fallback: 30 * 60_000,
  });
}

