import { expect, test } from '@playwright/test';
import { exerciseRow, expectLogged, logRow, repsField, weightField } from './session-helpers';

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

  await page.getByRole('button', { name: /^Start / }).click();
  await expect(page).toHaveURL(/\/session\/[0-9A-Za-z]+$/);

  const row = exerciseRow(page, 0);
  await expect(row).toBeVisible();
  await logRow(row, '100', '8');
  await expectLogged(row);

  // Still offline: a deep-link reload serves the app shell and the logged entry persisted.
  await page.reload();
  const reloaded = exerciseRow(page, 0);
  await expectLogged(reloaded);
  await expect(weightField(reloaded)).toHaveValue('100');
  await expect(repsField(reloaded)).toHaveValue('8');
});
