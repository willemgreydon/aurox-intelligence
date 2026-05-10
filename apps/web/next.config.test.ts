import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextConfig } from 'next';

// ---------------------------------------------------------------------------
// next.config.ts security headers tests
//
// We cannot spin up a Next.js server in unit tests, so we call the config
// module's headers() function directly and inspect its output.
//
// The HSTS header is production-only. We test that branch by temporarily
// setting NODE_ENV and re-importing the module after resetModules().
// ---------------------------------------------------------------------------

describe('next.config.ts — security headers (development / default)', () => {
  let config: NextConfig;

  beforeEach(async () => {
    // Import with NODE_ENV as set by the test runner (typically 'test')
    vi.resetModules();
    const mod = await import('./next.config');
    config = mod.default;
  });

  it('headers() returns exactly one rule matching all routes', async () => {
    const rules = await config.headers!();
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe('/(.*)');
  });

  it('includes X-Content-Type-Options: nosniff', async () => {
    const [rule] = await config.headers!();
    const h = rule.headers.find((x: { key: string }) => x.key === 'X-Content-Type-Options');
    expect(h?.value).toBe('nosniff');
  });

  it('includes X-Frame-Options: SAMEORIGIN', async () => {
    const [rule] = await config.headers!();
    const h = rule.headers.find((x: { key: string }) => x.key === 'X-Frame-Options');
    expect(h?.value).toBe('SAMEORIGIN');
  });

  it('includes Referrer-Policy: strict-origin-when-cross-origin', async () => {
    const [rule] = await config.headers!();
    const h = rule.headers.find((x: { key: string }) => x.key === 'Referrer-Policy');
    expect(h?.value).toBe('strict-origin-when-cross-origin');
  });

  it('Permissions-Policy denies camera, microphone, geolocation, and payment', async () => {
    const [rule] = await config.headers!();
    const h = rule.headers.find((x: { key: string }) => x.key === 'Permissions-Policy');
    expect(h).toBeDefined();
    expect(h!.value).toContain('camera=()');
    expect(h!.value).toContain('microphone=()');
    expect(h!.value).toContain('geolocation=()');
    expect(h!.value).toContain('payment=()');
  });

  it('Content-Security-Policy includes frame-ancestors self', async () => {
    const [rule] = await config.headers!();
    const h = rule.headers.find((x: { key: string }) => x.key === 'Content-Security-Policy');
    expect(h).toBeDefined();
    expect(h!.value).toContain("frame-ancestors 'self'");
  });

  it('does NOT include Strict-Transport-Security outside production', async () => {
    // NODE_ENV in test runner is 'test', not 'production'
    const [rule] = await config.headers!();
    const hsts = rule.headers.find((x: { key: string }) => x.key === 'Strict-Transport-Security');
    expect(hsts).toBeUndefined();
  });
});

describe('next.config.ts — HSTS header (production)', () => {
  const savedEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    vi.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = savedEnv;
    vi.resetModules();
  });

  it('includes Strict-Transport-Security in production', async () => {
    const mod = await import('./next.config');
    const config: NextConfig = mod.default;
    const [rule] = await config.headers!();
    const hsts = rule.headers.find((x: { key: string }) => x.key === 'Strict-Transport-Security');
    expect(hsts).toBeDefined();
  });

  it('HSTS value includes max-age, includeSubDomains, and preload in production', async () => {
    const mod = await import('./next.config');
    const config: NextConfig = mod.default;
    const [rule] = await config.headers!();
    const hsts = rule.headers.find((x: { key: string }) => x.key === 'Strict-Transport-Security');
    expect(hsts!.value).toMatch(/max-age=\d+/);
    expect(hsts!.value).toContain('includeSubDomains');
    expect(hsts!.value).toContain('preload');
  });

  it('HSTS max-age is at least 1 year (31536000 seconds) in production', async () => {
    const mod = await import('./next.config');
    const config: NextConfig = mod.default;
    const [rule] = await config.headers!();
    const hsts = rule.headers.find((x: { key: string }) => x.key === 'Strict-Transport-Security');
    const match = hsts!.value.match(/max-age=(\d+)/);
    expect(match).not.toBeNull();
    expect(parseInt(match![1], 10)).toBeGreaterThanOrEqual(31_536_000);
  });
});
