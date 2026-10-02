import { expect, test } from '@playwright/test';

// Reuse an existing local test session when registration/database writes are
// forbidden. The default harness retains its normal local registration flow.
test.use({ storageState: process.env.E2E_STORAGE_STATE });

test('authenticated account aligns its workspace and identity opening', async ({ page }, testInfo) => {
  if (!process.env.E2E_STORAGE_STATE) {
    await page.goto('/login');

    const registration = await page.evaluate(async () => {
      const email = `account-identity-${Date.now()}@example.test`;
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Account Identity QA',
          email,
          password: 'LocalQA-Password-2026!',
          confirmPassword: 'LocalQA-Password-2026!',
        }),
      });
      return response.status;
    });

    expect(registration).toBe(201);
  }
  await page.goto('/account');

  const sidebar = page.locator('.account-sidebar__card');
  const card = page.locator('.aurox-identity-card');
  const hero = page.locator('.account-hero__head');
  await expect(sidebar).toBeVisible();
  await expect(sidebar.getByText('Account workspace', { exact: true })).toBeVisible();
  await expect(card).toBeVisible();
  await expect(hero).toBeVisible();
  await expect(page.locator('.page-preloader')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);

  const geometry = await page.evaluate(() => {
    const sidebar = document.querySelector('.account-sidebar__card')!.getBoundingClientRect();
    const card = document.querySelector('.aurox-identity-card')!.getBoundingClientRect();
    const hero = document.querySelector('.account-hero__head')!.getBoundingClientRect();
    const column = document.querySelector('.account-content')!.getBoundingClientRect();
    return {
      viewport: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      sidebarTop: sidebar.top,
      cardTop: card.top,
      topDelta: Math.abs(sidebar.top - card.top),
      cardBottom: card.bottom,
      nextContentTop: hero.top,
      postCardGap: hero.top - card.bottom,
      sidebarWidth: sidebar.width,
      sidebarHeight: sidebar.height,
      cardWidth: card.width,
      cardHeight: card.height,
      cardLeft: card.left,
      cardRight: card.right,
      sidebarLeft: sidebar.left,
      sidebarRight: sidebar.right,
      cardCenterDelta: Math.abs((card.left + card.right - column.left - column.right) / 2),
    };
  });
  await testInfo.attach('account-opening-geometry', {
    body: JSON.stringify(geometry, null, 2),
    contentType: 'application/json',
  });

  for (const size of [geometry.sidebarWidth, geometry.sidebarHeight, geometry.cardWidth, geometry.cardHeight]) {
    expect(size).toBeGreaterThan(0);
  }
  if (geometry.viewport > 960) {
    expect(geometry.topDelta, 'Workspace and identity card share the desktop grid top').toBeLessThanOrEqual(2);
  }
  expect(geometry.postCardGap, 'Welcome content has a deliberate gap below the identity card').toBeGreaterThanOrEqual(20);
  expect(geometry.cardCenterDelta, 'Identity card is centered within the right content column').toBeLessThanOrEqual(2);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.cardLeft).toBeGreaterThanOrEqual(0);
  expect(geometry.cardRight).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.sidebarLeft).toBeGreaterThanOrEqual(0);
  expect(geometry.sidebarRight).toBeLessThanOrEqual(geometry.viewport + 1);

  const order = await page.evaluate(() => {
    const cardNode = document.querySelector('.aurox-identity-card');
    const heroNode = document.querySelector('.account-hero__head');
    return Boolean(cardNode && heroNode && (cardNode.compareDocumentPosition(heroNode) & Node.DOCUMENT_POSITION_FOLLOWING));
  });

  expect(order).toBe(true);
});
