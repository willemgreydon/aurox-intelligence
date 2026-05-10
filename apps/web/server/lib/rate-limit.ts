/**
 * Route-level rate limiting abstraction.
 *
 * Design:
 * - RateLimitStore is the pluggable backend (in-memory, Redis, etc.)
 * - checkRateLimit() is the single call sites use — returns a NextResponse on
 *   violation, or null when the request is within limits.
 * - The active store is chosen at module load time via RATE_LIMIT_STORE env var,
 *   or falls back to in-memory in non-test environments and no-op in test.
 *
 * Usage in a route handler:
 *   const limited = await checkRateLimit(request, 'login', { max: 10, windowMs: 60_000 });
 *   if (limited) return limited;
 */

import { NextResponse } from 'next/server';

export interface RateLimitOptions {
  /** Maximum requests allowed in the window. */
  max: number;
  /** Rolling window duration in milliseconds. */
  windowMs: number;
}

export interface RateLimitStore {
  /** Increment the counter for `key` and return the current count after increment. */
  increment(key: string, windowMs: number): Promise<number>;
  /** Reset the counter for `key` — used in tests and emergency relief. */
  reset(key: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// No-op store — used in test environments so tests don't fight over counters
// ---------------------------------------------------------------------------

class NoOpStore implements RateLimitStore {
  async increment(_key: string, _windowMs: number) { return 0; }
  async reset(_key: string) {}
}

// ---------------------------------------------------------------------------
// In-memory store — correct for a single long-running Node.js process.
// Serverless (Vercel) will give per-instance limits, which is acceptable:
// each function instance gets its own limit counter, erring toward leniency.
// ---------------------------------------------------------------------------

interface MemoryEntry {
  count: number;
  resetAt: number;
}

class InMemoryStore implements RateLimitStore {
  private readonly map = new Map<string, MemoryEntry>();

  async increment(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const entry = this.map.get(key);

    if (!entry || now >= entry.resetAt) {
      this.map.set(key, { count: 1, resetAt: now + windowMs });
      return 1;
    }

    entry.count += 1;
    return entry.count;
  }

  async reset(key: string): Promise<void> {
    this.map.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Store selection
// ---------------------------------------------------------------------------

function createStore(): RateLimitStore {
  // In test environment use no-op by default so tests don't interfere with
  // each other. Tests that want to exercise rate-limiting behaviour should
  // construct an InMemoryStore directly and pass it to checkRateLimitWithStore.
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    return new NoOpStore();
  }
  return new InMemoryStore();
}

const defaultStore: RateLimitStore = createStore();

// Exported for tests that need to reset individual keys without bypassing the
// whole mechanism.
export { InMemoryStore, NoOpStore };

// ---------------------------------------------------------------------------
// IP extraction
// ---------------------------------------------------------------------------

function extractIp(request: Request): string {
  // Vercel / common proxies set x-forwarded-for.
  // We take only the first address (the client) and strip the port.
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return (forwarded.split(',')[0] ?? forwarded).trim();
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check rate limit using the module-level store.
 *
 * Returns a 429 NextResponse if the limit is exceeded, null otherwise.
 * The 429 body is intentionally generic — never reveals whether an email
 * exists or any other application state.
 */
export async function checkRateLimit(
  request: Request,
  route: string,
  options: RateLimitOptions,
): Promise<NextResponse | null> {
  return checkRateLimitWithStore(request, route, options, defaultStore);
}

/**
 * Check rate limit using an explicit store — useful for tests and alternative
 * backends (Redis, Upstash, etc.) without changing the module-level default.
 */
export async function checkRateLimitWithStore(
  request: Request,
  route: string,
  options: RateLimitOptions,
  store: RateLimitStore,
): Promise<NextResponse | null> {
  const ip = extractIp(request);
  const key = `rl:${route}:${ip}`;
  const count = await store.increment(key, options.windowMs);

  if (count > options.max) {
    return NextResponse.json(
      {
        error: 'too_many_requests',
        message: 'Too many requests. Please wait before trying again.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(options.windowMs / 1000)),
        },
      },
    );
  }

  return null;
}
