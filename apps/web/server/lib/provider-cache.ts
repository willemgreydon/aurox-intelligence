type CacheValue<T> = {
  value: T;
  expiresAt: number;
  staleUntil: number;
  updatedAt: number;
  source: string;
};

type GetOrLoadOptions<T> = {
  key: string;
  ttlMs: number;
  staleWhileRevalidateMs?: number;
  source: string;
  loader: () => Promise<T>;
  shouldStore?: (value: T) => boolean;
};

type CacheStatus = 'hit' | 'stale' | 'miss' | 'error-fallback';

export type ProviderCacheRead<T> = {
  value: T;
  status: CacheStatus;
  updatedAt: number;
  source: string;
};

const providerCache = new Map<string, CacheValue<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

function now() {
  return Date.now();
}

function getEntry<T>(key: string): CacheValue<T> | null {
  const entry = providerCache.get(key) as CacheValue<T> | undefined;
  return entry ?? null;
}

function setEntry<T>(key: string, value: T, ttlMs: number, staleMs: number, source: string) {
  const timestamp = now();
  providerCache.set(key, {
    value,
    expiresAt: timestamp + ttlMs,
    staleUntil: timestamp + ttlMs + staleMs,
    updatedAt: timestamp,
    source,
  });
}

async function revalidateInBackground<T>(key: string, opts: GetOrLoadOptions<T>) {
  if (inFlight.has(key)) {
    return;
  }
  const promise = (async () => {
    try {
      const loaded = await opts.loader();
      if (!opts.shouldStore || opts.shouldStore(loaded)) {
        setEntry(key, loaded, opts.ttlMs, opts.staleWhileRevalidateMs ?? 0, opts.source);
      }
    } finally {
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, promise);
}

export async function getOrLoadProviderCache<T>(opts: GetOrLoadOptions<T>): Promise<ProviderCacheRead<T>> {
  const staleMs = opts.staleWhileRevalidateMs ?? 0;
  const entry = getEntry<T>(opts.key);
  const timestamp = now();

  if (entry && timestamp <= entry.expiresAt) {
    return { value: entry.value, status: 'hit', updatedAt: entry.updatedAt, source: entry.source };
  }

  if (entry && timestamp <= entry.staleUntil) {
    void revalidateInBackground(opts.key, opts);
    return { value: entry.value, status: 'stale', updatedAt: entry.updatedAt, source: entry.source };
  }

  const existingPromise = inFlight.get(opts.key) as Promise<T> | undefined;
  if (existingPromise) {
    const value = await existingPromise;
    const fresh = getEntry<T>(opts.key);
    return {
      value,
      status: fresh ? 'hit' : 'miss',
      updatedAt: fresh?.updatedAt ?? timestamp,
      source: fresh?.source ?? opts.source,
    };
  }

  const promise = opts.loader();
  inFlight.set(opts.key, promise);
  try {
    const loaded = await promise;
    if (!opts.shouldStore || opts.shouldStore(loaded)) {
      setEntry(opts.key, loaded, opts.ttlMs, staleMs, opts.source);
      const fresh = getEntry<T>(opts.key);
      return {
        value: loaded,
        status: 'miss',
        updatedAt: fresh?.updatedAt ?? now(),
        source: opts.source,
      };
    }
    if (entry) {
      return {
        value: entry.value,
        status: 'error-fallback',
        updatedAt: entry.updatedAt,
        source: entry.source,
      };
    }
    return {
      value: loaded,
      status: 'miss',
      updatedAt: now(),
      source: opts.source,
    };
  } catch {
    if (entry) {
      return {
        value: entry.value,
        status: 'error-fallback',
        updatedAt: entry.updatedAt,
        source: entry.source,
      };
    }
    throw new Error(`provider-cache-miss-no-fallback:${opts.key}`);
  } finally {
    inFlight.delete(opts.key);
  }
}

export function clearProviderCacheForTests() {
  providerCache.clear();
  inFlight.clear();
}
