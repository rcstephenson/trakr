import { expect, test } from '@playwright/test';

test('fresh install shows Upper A and Start opens the session', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Upper A', level: 2 })).toBeVisible();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page).toHaveURL(/\/session\/[0-9A-Za-z]+$/);
});

test('shows Resume for an active session and lets the user pick a workout', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Choose another workout' }).click();
  await page.getByRole('button', { name: /Lower B/ }).click();
  await expect(page).toHaveURL(/\/session\//);
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Resume Lower B' })).toBeVisible();
});
