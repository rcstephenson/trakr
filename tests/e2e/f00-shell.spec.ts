import { expect, test } from '@playwright/test';

test('navigates all four tabs and hides the tab bar in a session', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Primary' });
  await expect(nav).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();

  for (const tab of ['History', 'Progress', 'Program', 'Today']) {
    await nav.getByRole('link', { name: tab }).click();
    await expect(page.getByRole('heading', { name: tab, level: 1 })).toBeVisible();
    await expect(nav.getByRole('link', { name: tab })).toHaveAttribute('aria-current', 'page');
  }

  await nav.getByRole('link', { name: 'Program' }).click();
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/\/settings$/);

  await page.goto('/session/x');
  await expect(page.getByRole('heading', { name: 'Session', level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
});

test('fits the 390px phone viewport without horizontal scroll', async ({ page }) => {
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
