import { describe, expect, it, beforeEach } from 'vitest';
import { InMemoryStore, NoOpStore, checkRateLimitWithStore } from './rate-limit';

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
