import { expect, test } from '@playwright/test';

test('authenticated account paints the Aurox identity card before the hero', async ({ page }) => {
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
  await page.goto('/account');

  const card = page.locator('.aurox-identity-card');
  const hero = page.locator('.account-hero__head');
  await expect(card).toBeVisible();
  await expect(hero).toBeVisible();

  const order = await page.evaluate(() => {
    const cardNode = document.querySelector('.aurox-identity-card');
    const heroNode = document.querySelector('.account-hero__head');
    return Boolean(cardNode && heroNode && (cardNode.compareDocumentPosition(heroNode) & Node.DOCUMENT_POSITION_FOLLOWING));
  });

  expect(order).toBe(true);
});
