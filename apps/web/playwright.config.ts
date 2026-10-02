import { defineConfig } from '@playwright/test';

/**
 * Responsive regression harness. The single hard invariant this enforces is:
 *   document.documentElement.scrollWidth <= window.innerWidth (+ tolerance)
 * at every target viewport, across the critical public routes — i.e. the page
 * must never be wider than the viewport (no horizontal scroll).
 *
 * Run against a running app:
 *   pnpm build:web            # once (prod build)
 *   pnpm --filter @repo/web test:e2e
 * Or point it at an already-running dev server on E2E_PORT (reuseExistingServer).
 */

const PORT = Number(process.env.E2E_PORT ?? 3123);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

// The target viewport matrix (mobile-first) plus tablet + desktop guards.
const VIEWPORTS = [
  { name: '320', width: 320, height: 568 },
  { name: '360', width: 360, height: 800 },
  { name: '375', width: 375, height: 667 },
  { name: '390', width: 390, height: 844 },
  { name: '393', width: 393, height: 852 },
  { name: '412', width: 412, height: 915 },
  { name: '430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1024', width: 1024, height: 900 },
  { name: 'desktop-1280', width: 1280, height: 800 },
  { name: 'desktop-1440', width: 1440, height: 1000 },
  { name: 'desktop-1536', width: 1536, height: 1000 },
] as const;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    browserName: 'chromium',
    // Deterministic: no animations affecting layout measurement.
    reducedMotion: 'reduce',
  },
  projects: VIEWPORTS.map((viewport) => ({
    name: viewport.name,
    use: { viewport: { width: viewport.width, height: viewport.height } },
  })),
  webServer: {
    command: `PORT=${PORT} pnpm start`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
