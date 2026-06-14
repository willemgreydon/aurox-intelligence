import { describe, expect, it, beforeEach } from 'vitest';
import { InMemoryStore, NoOpStore, checkRateLimitWithStore, consumeRateLimit, extractIpFromHeaders } from './rate-limit';

// ---------------------------------------------------------------------------
// InMemoryStore unit tests
// ---------------------------------------------------------------------------

describe('InMemoryStore', () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore();
  });

  it('starts counter at 1 on first increment', async () => {
    const count = await store.increment('key:1', 60_000);
    expect(count).toBe(1);
  });

  it('increments counter on subsequent calls within window', async () => {
    await store.increment('key:1', 60_000);
    await store.increment('key:1', 60_000);
    const count = await store.increment('key:1', 60_000);
    expect(count).toBe(3);
  });

  it('isolates different keys independently', async () => {
    await store.increment('key:a', 60_000);
    await store.increment('key:a', 60_000);
    const countB = await store.increment('key:b', 60_000);
    expect(countB).toBe(1);
  });

  it('resets window when entry expires', async () => {
    // Use a 1ms window so it expires immediately
    await store.increment('key:exp', 1);
    await new Promise((r) => setTimeout(r, 5));
    const count = await store.increment('key:exp', 1);
    expect(count).toBe(1);
  });

  it('reset() clears the counter for the key', async () => {
    await store.increment('key:reset', 60_000);
    await store.increment('key:reset', 60_000);
    await store.reset('key:reset');
    const count = await store.increment('key:reset', 60_000);
    expect(count).toBe(1);
  });

  it('reset() on unknown key does not throw', async () => {
    await expect(store.reset('never-seen-key')).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// NoOpStore unit tests
// ---------------------------------------------------------------------------

describe('NoOpStore', () => {
  it('always returns 0 — never triggers rate limit', async () => {
    const store = new NoOpStore();
    for (let i = 0; i < 100; i++) {
      const count = await store.increment('any-key', 60_000);
      expect(count).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// checkRateLimitWithStore integration tests
// ---------------------------------------------------------------------------

function makeRequest(ip = '1.2.3.4') {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: {
      'x-forwarded-for': ip,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: 'x@example.com', password: 'pass' }),
  });
}

describe('checkRateLimitWithStore', () => {
  it('returns null when request count is within limit', async () => {
    const store = new InMemoryStore();
    const result = await checkRateLimitWithStore(makeRequest(), 'test:route', { max: 5, windowMs: 60_000 }, store);
    expect(result).toBeNull();
  });

  it('returns 429 response once the limit is exceeded', async () => {
    const store = new InMemoryStore();
    const opts = { max: 3, windowMs: 60_000 };

    for (let i = 0; i < 3; i++) {
      const r = await checkRateLimitWithStore(makeRequest(), 'test:route', opts, store);
      expect(r).toBeNull(); // first 3 are allowed
    }

    const blocked = await checkRateLimitWithStore(makeRequest(), 'test:route', opts, store);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
  });

  it('429 response body has generic safe message — no email or app state', async () => {
    const store = new InMemoryStore();
    const opts = { max: 1, windowMs: 60_000 };

    await checkRateLimitWithStore(makeRequest(), 'test:route', opts, store); // allowed
    const blocked = await checkRateLimitWithStore(makeRequest(), 'test:route', opts, store);
    const body = await blocked!.json();

    expect(body.error).toBe('too_many_requests');
    expect(body.message).toMatch(/too many requests/i);
    // Must never reveal email, user existence, or internal state
    expect(body.email).toBeUndefined();
    expect(body.exists).toBeUndefined();
    expect(body.userId).toBeUndefined();
  });

  it('429 response includes Retry-After header', async () => {
    const store = new InMemoryStore();
    await checkRateLimitWithStore(makeRequest(), 'test:route', { max: 1, windowMs: 60_000 }, store);
    const blocked = await checkRateLimitWithStore(makeRequest(), 'test:route', { max: 1, windowMs: 60_000 }, store);
    expect(blocked!.headers.get('retry-after')).toBeTruthy();
  });

  it('different IPs are tracked independently', async () => {
    const store = new InMemoryStore();
    const opts = { max: 1, windowMs: 60_000 };

    await checkRateLimitWithStore(makeRequest('10.0.0.1'), 'test:route', opts, store);
    // IP 10.0.0.1 is now at limit, but 10.0.0.2 should still be allowed
    const r2 = await checkRateLimitWithStore(makeRequest('10.0.0.2'), 'test:route', opts, store);
    expect(r2).toBeNull();

    const blocked = await checkRateLimitWithStore(makeRequest('10.0.0.1'), 'test:route', opts, store);
    expect(blocked!.status).toBe(429);
  });

  it('different routes are tracked independently', async () => {
    const store = new InMemoryStore();
    const opts = { max: 1, windowMs: 60_000 };

    await checkRateLimitWithStore(makeRequest(), 'route:A', opts, store);
    // route:A is at limit but route:B is still fresh
    const rB = await checkRateLimitWithStore(makeRequest(), 'route:B', opts, store);
    expect(rB).toBeNull();
  });

  it('after reset, the counter starts fresh', async () => {
    const store = new InMemoryStore();
    const opts = { max: 1, windowMs: 60_000 };
    const ip = '5.5.5.5';

    await checkRateLimitWithStore(makeRequest(ip), 'test:route', opts, store);
    // Blocked now
    const blocked = await checkRateLimitWithStore(makeRequest(ip), 'test:route', opts, store);
    expect(blocked!.status).toBe(429);

    // Reset this specific key
    await store.reset(`rl:test:route:${ip}`);

    // Should be allowed again
    const after = await checkRateLimitWithStore(makeRequest(ip), 'test:route', opts, store);
    expect(after).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// forgot-password specific: generic response regardless of rate limit state
// ---------------------------------------------------------------------------

describe('forgot-password rate limit — information leak prevention', () => {
  it('a 429 from forgot-password reveals no email state', async () => {
    const store = new InMemoryStore();
    const opts = { max: 2, windowMs: 60_000 };
    const req = new Request('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'x-forwarded-for': '9.9.9.9', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'target@example.com' }),
    });

    await checkRateLimitWithStore(req, 'auth:forgot-password', opts, store);
    await checkRateLimitWithStore(req, 'auth:forgot-password', opts, store);
    const blocked = await checkRateLimitWithStore(req, 'auth:forgot-password', opts, store);

    expect(blocked).not.toBeNull();
    const body = await blocked!.json();

    // Must not say "account exists", "account does not exist", or echo the email
    expect(JSON.stringify(body)).not.toContain('target@example.com');
    expect(JSON.stringify(body)).not.toContain('exists');
    expect(JSON.stringify(body)).not.toContain('account');
  });
});

// ---------------------------------------------------------------------------
// consumeRateLimit — the primitive used by the login/register SERVER ACTIONS
// (AUR-038). Server actions have no Request/NextResponse, so they enforce the
// limit via this identifier-based verdict and return a typed FormState.
// ---------------------------------------------------------------------------

describe('consumeRateLimit (server-action enforcement)', () => {
  it('extractIpFromHeaders reads x-forwarded-for (first hop) then x-real-ip', () => {
    expect(extractIpFromHeaders(new Headers({ 'x-forwarded-for': '5.5.5.5, 10.0.0.1' }))).toBe('5.5.5.5');
    expect(extractIpFromHeaders(new Headers({ 'x-real-ip': '6.6.6.6' }))).toBe('6.6.6.6');
    expect(extractIpFromHeaders(new Headers())).toBe('unknown');
  });

  it('login action limit: allows the first 10 attempts per IP, blocks the 11th', async () => {
    const store = new InMemoryStore();
    const opts = { max: 10, windowMs: 60_000 }; // matches /api/auth/login + loginAction

    for (let i = 0; i < 10; i++) {
      const verdict = await consumeRateLimit('1.1.1.1', 'auth:login', opts, store);
      expect(verdict.limited).toBe(false);
    }
    const blocked = await consumeRateLimit('1.1.1.1', 'auth:login', opts, store);
    expect(blocked.limited).toBe(true);
    expect(blocked.retryAfterSeconds).toBe(60);
  });

  it('register action limit blocks after 10 attempts per IP', async () => {
    const store = new InMemoryStore();
    const opts = { max: 10, windowMs: 60_000 };
    let lastVerdict = { limited: false, retryAfterSeconds: 0 };
    for (let i = 0; i < 11; i++) {
      lastVerdict = await consumeRateLimit('2.2.2.2', 'auth:register', opts, store);
    }
    expect(lastVerdict.limited).toBe(true);
  });

  it('limits are isolated per IP', async () => {
    const store = new InMemoryStore();
    const opts = { max: 1, windowMs: 60_000 };

    await consumeRateLimit('1.1.1.1', 'auth:login', opts, store); // count 1 (ok)
    const sameIp = await consumeRateLimit('1.1.1.1', 'auth:login', opts, store); // count 2 (blocked)
    const otherIp = await consumeRateLimit('9.9.9.9', 'auth:login', opts, store); // count 1 (ok)

    expect(sameIp.limited).toBe(true);
    expect(otherIp.limited).toBe(false);
  });

  it('a server action and its mirror route handler share one limit per IP (same key)', async () => {
    const store = new InMemoryStore();
    const opts = { max: 2, windowMs: 60_000 };

    // Route handler path increments rl:auth:login:7.7.7.7
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': '7.7.7.7' },
    });
    expect(await checkRateLimitWithStore(req, 'auth:login', opts, store)).toBeNull(); // 1
    // Server-action path increments the SAME key
    expect((await consumeRateLimit('7.7.7.7', 'auth:login', opts, store)).limited).toBe(false); // 2
    // Third hit (either path) is blocked
    expect((await consumeRateLimit('7.7.7.7', 'auth:login', opts, store)).limited).toBe(true); // 3
  });

  it('isolates different routes for the same IP', async () => {
    const store = new InMemoryStore();
    const opts = { max: 1, windowMs: 60_000 };

    await consumeRateLimit('3.3.3.3', 'auth:login', opts, store); // login ok
    const loginBlocked = await consumeRateLimit('3.3.3.3', 'auth:login', opts, store); // login blocked
    const registerOk = await consumeRateLimit('3.3.3.3', 'auth:register', opts, store); // register independent

    expect(loginBlocked.limited).toBe(true);
    expect(registerOk.limited).toBe(false);
  });
});
