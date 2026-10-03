import { expect, test } from '@playwright/test';

/**
 * Mobile geometry regression locks for the finalization pass.
 *
 * scrollWidth <= viewport (overflow.spec) is necessary but NOT sufficient: a
 * page can pass it while metric text paints over adjacent content or a dense
 * matrix collapses its cells on top of each other. These checks assert the
 * actual DOM geometry of the two primitives that were visibly broken on mobile:
 *
 *   1. InvestableAssetCard quote/move/sparkline row — the large mono quote value
 *      must not horizontally overlap the move value or the sparkline.
 *   2. Correlation heatmap — on a narrow viewport it must become a real
 *      horizontal scroll region (intrinsic width > its clipped viewport) rather
 *      than squeezing 14 columns into ~390px.
 *
 * Both primitives render on the PUBLIC /market route, so no auth is needed.
 */

const NARROW = 1; // px tolerance for sub-pixel rounding

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
}

/** True when two boxes overlap on BOTH axes (i.e. they visually collide). */
function collides(a: Box, b: Box): boolean {
  const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return overlapX > NARROW && overlapY > NARROW;
}

test('asset card quote/move/sparkline do not collide', async ({ page }, testInfo) => {
  // Desktop viewports keep the three-across row; this collision class only
  // manifests on narrow cards. Guard the primary phone targets.
  test.skip(testInfo.project.name !== '390' && testInfo.project.name !== '430', 'phone-only geometry');

  await page.goto('/market', { waitUntil: 'load' });
  await page.waitForTimeout(500);

  const grids = page.locator('.market-card__quote-grid');
  const count = await grids.count();
  expect(count, 'at least one asset card should render on /market').toBeGreaterThan(0);

  const sample = Math.min(count, 12);
  for (let i = 0; i < sample; i += 1) {
    const grid = grids.nth(i);
    const value = grid.locator('.comparison-stat__value').first();
    const subvalue = grid.locator('.comparison-stat__subvalue').first();
    const chart = grid.locator('.market-card__chart').first();

    const [vBox, sBox, cBox] = await Promise.all([
      value.boundingBox(),
      subvalue.boundingBox(),
      chart.boundingBox(),
    ]);
    if (!vBox) continue;

    const v: Box = { ...vBox, right: vBox.x + vBox.width, bottom: vBox.y + vBox.height, left: vBox.x, top: vBox.y };
    if (sBox) {
      const s: Box = { ...sBox, right: sBox.x + sBox.width, bottom: sBox.y + sBox.height, left: sBox.x, top: sBox.y };
      expect(collides(v, s), `quote value overlaps move value on card ${i}`).toBe(false);
    }
    if (cBox) {
      const c: Box = { ...cBox, right: cBox.x + cBox.width, bottom: cBox.y + cBox.height, left: cBox.x, top: cBox.y };
      expect(collides(v, c), `quote value overlaps sparkline on card ${i}`).toBe(false);
    }
  }
});

test('correlation matrix is a legible horizontal scroll region on mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== '390' && testInfo.project.name !== '430', 'phone-only geometry');

  await page.goto('/market', { waitUntil: 'load' });
  await page.waitForTimeout(500);

  const viewport = page.locator('.corrheat__viewport').first();
  if ((await viewport.count()) === 0) {
    test.skip(true, 'correlation matrix not present (insufficient data)');
    return;
  }

  // The scroll container is clipped to the card width, but the grid inside is
  // intrinsically wider → the matrix pans instead of collapsing.
  const { clientWidth, scrollWidth } = await viewport.evaluate((el) => ({
    clientWidth: el.clientWidth,
    scrollWidth: el.scrollWidth,
  }));
  expect(scrollWidth, 'matrix should overflow its viewport (scrollable)').toBeGreaterThan(clientWidth + 4);

  // Each cell must stay legible — never collapse toward zero width.
  const firstCell = page.locator('.corrheat__cell').first();
  const box = await firstCell.boundingBox();
  expect(box, 'a matrix cell should render').not.toBeNull();
  if (box) {
    expect(box.width, 'matrix cells must not collapse').toBeGreaterThan(28);
  }
});
