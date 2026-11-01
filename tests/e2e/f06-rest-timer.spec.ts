import { expect, test } from '@playwright/test';

function seconds(text: string | null): number {
  const [m, s] = (text ?? '0:00').split(':').map(Number);
  return m * 60 + s;
}

test('completing a set shows the rest timer; +15 s adds time; dismiss hides it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page).toHaveURL(/\/session\/[0-9A-Za-z]+$/);

  const timer = page.getByTestId('rest-timer');
  await expect(timer).toBeHidden();

  const card = page.getByTestId('exercise-card').first();
  await card.getByLabel('Set 1 weight', { exact: true }).fill('100');
  await card.getByLabel('Set 1 reps', { exact: true }).fill('8');
  await card.getByRole('button', { name: 'Complete set 1' }).click();

  await expect(timer).toBeVisible();
  const remaining = page.getByTestId('rest-remaining');
  const before = seconds(await remaining.textContent());
  expect(before).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Add 15 seconds' }).click();
  const after = seconds(await remaining.textContent());
  expect(after).toBeGreaterThan(before + 10);

  await page.getByRole('button', { name: 'Dismiss rest timer' }).click();
  await expect(timer).toBeHidden();
});
