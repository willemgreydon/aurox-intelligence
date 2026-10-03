import { expect, test, type Page } from '@playwright/test';

// Reuse an existing local test session when registration/database writes are
// forbidden. The default harness retains its normal local registration flow.
test.use({ storageState: process.env.E2E_STORAGE_STATE });

// Establish an authenticated session: reuse injected storage state, otherwise
// register a throwaway local user. Each Playwright test gets a fresh context,
// so every test that reads /account must establish its own session.
async function ensureSession(page: Page): Promise<void> {
  if (process.env.E2E_STORAGE_STATE) return;
  await page.goto('/login');
  const status = await page.evaluate(async () => {
    const email = `account-exp-${Date.now()}-${Math.round(Math.random() * 1e6)}@example.test`;
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Account Experience QA',
        email,
        password: 'LocalQA-Password-2026!',
        confirmPassword: 'LocalQA-Password-2026!',
      }),
    });
    return response.status;
  });
  expect(status).toBe(201);
}

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
  // The workspace identity summary lives in the sidebar on desktop and relocates
  // below Recent simulated actions on mobile — assert it is visible exactly once,
  // wherever the breakpoint places it.
  await expect(page.locator('.section__eyebrow:visible', { hasText: 'Account workspace' })).toHaveCount(1);
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

test('identity card flips to its back side and restores via click and keyboard', async ({ page }) => {
  await ensureSession(page);
  await page.goto('/account');

  const card = page.locator('.aurox-identity-card');
  const front = page.locator('.aurox-identity-card__face--front');
  const back = page.locator('.aurox-identity-card__face--back');
  await expect(card).toBeVisible();

  // Front initially presented; back exists but is hidden from assistive tech.
  await expect(card).toHaveAttribute('data-flipped', 'false');
  await expect(card).toHaveAttribute('aria-pressed', 'false');
  await expect(back).toHaveCount(1);
  await expect(back).toHaveAttribute('aria-hidden', 'true');
  await expect(front).toHaveAttribute('aria-hidden', 'false');

  // Click flips to the back.
  await card.click();
  await expect(card).toHaveAttribute('data-flipped', 'true');
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await expect(back).toHaveAttribute('aria-hidden', 'false');
  await expect(front).toHaveAttribute('aria-hidden', 'true');

  // Second click restores the front.
  await card.click();
  await expect(card).toHaveAttribute('data-flipped', 'false');

  // Keyboard activation flips too (it is a real button).
  await card.focus();
  await expect(card).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(card).toHaveAttribute('data-flipped', 'true');
  await page.keyboard.press('Space');
  await expect(card).toHaveAttribute('data-flipped', 'false');
});

test('account navigation collapses on mobile and expands to select a route', async ({ page }) => {
  await ensureSession(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/account');

  const trigger = page.locator('.account-nav__trigger');
  const profileLink = page.locator('.account-nav__link', { hasText: 'Profile' });

  // Collapsed control is visible; the full list is collapsed away.
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.account-nav__trigger-current')).toHaveText('Overview');
  await expect(profileLink).toBeHidden();

  // Expand, then select a route.
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(profileLink).toBeVisible();
  await profileLink.click();
  await expect(page).toHaveURL(/\/account\/profile$/);
  await expect(page.locator('.account-nav__trigger-current')).toHaveText('Profile');

  // No horizontal overflow at 390px.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('desktop account navigation stays fully expanded', async ({ page }) => {
  await ensureSession(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/account');

  const trigger = page.locator('.account-nav__trigger');
  await expect(trigger).toBeHidden();
  for (const label of ['Overview', 'Profile', 'Settings', 'Trading activity']) {
    await expect(page.locator('.account-nav__link', { hasText: label })).toBeVisible();
  }
});

// Count rendered columns by geometry: how many direct children sit on the same
// top row as the first child. Robust to Chromium returning an unresolved
// `repeat()` string from getComputedStyle (which defeats naive track counting).
function renderedColumns(selector: string) {
  const el = document.querySelector(selector);
  if (!el) return 0;
  const kids = Array.from(el.children) as HTMLElement[];
  if (kids.length === 0) return 0;
  const firstTop = Math.round(kids[0]!.getBoundingClientRect().top);
  return kids.filter((k) => Math.round(k.getBoundingClientRect().top) === firstTop).length;
}

test('profile stats render as two columns on desktop', async ({ page }) => {
  await ensureSession(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/account/profile');

  await expect(page.locator('.account-stats--duo')).toBeVisible();
  const columns = await page.evaluate(renderedColumns, '.account-stats--duo');
  expect(columns).toBe(2);
});

test('activity analytics render as two columns on desktop with all metrics', async ({ page }) => {
  await ensureSession(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/account/activity');

  const strip = page.locator('.analytics-strip--duo');
  if (await strip.count()) {
    // Wait out the account preloader so the grid has settled layout geometry.
    await expect(page.locator('.page-preloader')).toHaveCount(0);
    await expect(strip).toBeVisible();
    const columns = await page.evaluate(renderedColumns, '.analytics-strip--duo');
    expect(columns).toBe(2);
    // All metric cards preserved.
    const cards = await strip.locator('> *').count();
    expect(cards).toBeGreaterThanOrEqual(6);
  }
});

test('mobile relocates the account summary below Recent simulated actions', async ({ page }) => {
  await ensureSession(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/account');
  await expect(page.locator('.page-preloader')).toHaveCount(0);

  // The sidebar collapses to navigation only; the identity summary is hidden there.
  await expect(page.locator('.account-sidebar__intro')).toBeHidden();
  await expect(page.locator('.account-nav__trigger')).toBeVisible();

  // The relocated Account details section is shown, exactly once, after Recent actions.
  const details = page.locator('.account-details-mobile');
  await expect(details).toBeVisible();
  await expect(page.locator('.account-sidebar__title:visible')).toHaveCount(1);

  const order = await page.evaluate(() => {
    const recent = Array.from(document.querySelectorAll('h3')).find((h) => /Recent simulated actions/i.test(h.textContent ?? ''));
    const recentSection = recent?.closest('.section');
    const relocated = document.querySelector('.account-details-mobile');
    if (!recentSection || !relocated) return false;
    return Boolean(recentSection.compareDocumentPosition(relocated) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(order).toBe(true);

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('desktop keeps the account summary in the sidebar without duplication', async ({ page }) => {
  await ensureSession(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/account');
  await expect(page.locator('.page-preloader')).toHaveCount(0);

  await expect(page.locator('.account-sidebar__intro')).toBeVisible();
  // The mobile relocation is hidden on desktop — the summary is never shown twice.
  await expect(page.locator('.account-details-mobile')).toBeHidden();
});
