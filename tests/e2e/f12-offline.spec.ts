import { expect, test } from '@playwright/test';

// Runs against the production build served by `vite preview` (service workers don't run in dev).
test('works offline after the first load: reload, start a workout, log a set', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();

  // Wait for the service worker to be active and controlling the page (precache complete).
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await context.setOffline(true);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();

  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page).toHaveURL(/\/session\/[0-9A-Za-z]+$/);

  const card = page.getByTestId('exercise-card').first();
  await expect(card.getByTestId('set-row').first()).toBeVisible();
  await card.getByLabel('Set 1 weight', { exact: true }).fill('100');
  await card.getByLabel('Set 1 reps', { exact: true }).fill('8');
  await card.getByRole('button', { name: 'Complete set 1' }).click();
  await expect(card.getByTestId('set-row').first()).toHaveAttribute('data-completed', 'true');

  // Still offline: a deep-link reload serves the app shell and the logged set persisted.
  await page.reload();
  const reloaded = page.getByTestId('exercise-card').first();
  await expect(reloaded.getByTestId('set-row').first()).toHaveAttribute('data-completed', 'true');
  await expect(reloaded.getByLabel('Set 1 weight', { exact: true })).toHaveValue('100');
});
