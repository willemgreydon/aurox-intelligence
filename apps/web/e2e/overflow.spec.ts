import { expect, test } from '@playwright/test';

/**
 * Critical public routes (render without auth). Auth-gated routes redirect to
 * /login and are covered via /login itself here; add more as they stabilize.
 */
const ROUTES = [
  '/',
  '/market',
  '/stocks',
  '/signals',
  '/news',
  '/macro',
  '/markets/rankings',
  '/markets/intelligence',
  '/login',
] as const;

// Sub-pixel rounding / scrollbar gutter tolerance. Kept tight so real overflow
// (a fixed-width child, an unclamped flex item, a bleeding ticker) is caught.
const TOLERANCE_PX = 1;

interface OverflowReport {
  viewport: number;
  scrollWidth: number;
  offenders: Array<{ tag: string; cls: string; id: string; right: number; width: number }>;
}

/** Measure document overflow and, if any, the widest elements crossing the edge. */
async function measureOverflow(route: string, page: import('@playwright/test').Page): Promise<OverflowReport> {
  await page.goto(route, { waitUntil: 'load' });
  // Let client hydration / late layout settle before measuring.
  await page.waitForTimeout(400);
  return page.evaluate((tolerance) => {
    const viewport = window.innerWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const offenders: Array<{ tag: string; cls: string; id: string; right: number; width: number }> = [];
    if (scrollWidth > viewport + tolerance) {
      for (const el of Array.from(document.body.querySelectorAll('*'))) {
        const rect = el.getBoundingClientRect();
        // An element pushes the page wide if its right edge exceeds the viewport
        // or it starts left of 0 — and it actually has size.
        if ((rect.right > viewport + tolerance || rect.left < -tolerance) && rect.width > 0) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.getAttribute('class') ?? '').slice(0, 100),
            id: el.id ?? '',
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          });
        }
      }
      offenders.sort((a, b) => b.right - a.right);
    }
    return { viewport, scrollWidth, offenders: offenders.slice(0, 10) };
  }, tolerance);
}

const tolerance = TOLERANCE_PX;

for (const route of ROUTES) {
  test(`no horizontal overflow: ${route}`, async ({ page }) => {
    const report = await measureOverflow(route, page);
    expect(
      report.scrollWidth,
      `Horizontal overflow on ${route} @ ${report.viewport}px (scrollWidth=${report.scrollWidth}). ` +
        `Widest offenders:\n${JSON.stringify(report.offenders, null, 2)}`,
    ).toBeLessThanOrEqual(report.viewport + tolerance);
  });
}
