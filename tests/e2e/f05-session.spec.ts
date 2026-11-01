import { expect, test, type Page } from '@playwright/test';

async function startUpperA(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page).toHaveURL(/\/session\/[0-9A-Za-z]+$/);
}

function firstCard(page: Page) {
  return page.getByTestId('exercise-card').first();
}

test('log a full exercise, reload, finish and see the summary', async ({ page }) => {
  await startUpperA(page);
  const card = firstCard(page);
  const rows = card.getByTestId('set-row');
  await expect(rows.first()).toBeVisible();
  const count = await rows.count();
  expect(count).toBeGreaterThanOrEqual(2);

  // Set 1: type weight and reps, then complete.
  await card.getByLabel('Set 1 weight', { exact: true }).fill('100');
  await card.getByLabel('Set 1 reps', { exact: true }).fill('8');
  await card.getByRole('button', { name: 'Complete set 1' }).click();
  await expect(rows.nth(0)).toHaveAttribute('data-completed', 'true');

  // Later sets are auto-filled: one tap each.
  for (let n = 2; n <= count; n++) {
    await card.getByRole('button', { name: `Complete set ${n}` }).click();
  }

  // All sets done: the card collapses to a one-line summary.
  await expect(card.getByRole('button', { name: /Expand/ })).toBeVisible();

  // Reload mid-session: everything persisted (card collapsed, all done).
  await page.reload();
  const reloaded = firstCard(page);
  await expect(reloaded).toContainText('100 lb × ' + Array(count).fill('8').join(', '));
  await reloaded.getByRole('button', { name: /Expand/ }).click();
  await expect(reloaded.locator('[data-completed="true"]')).toHaveCount(count);

  // Finish: summary then back to Today.
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Workout summary' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Duration');
  await expect(dialog).toContainText(`${count}`);
  await dialog.getByRole('button', { name: 'Finish workout' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('a second session shows Last and prefills from the first', async ({ page }) => {
  await startUpperA(page);
  const card = firstCard(page);
  await expect(card.getByTestId('set-row').first()).toBeVisible();
  const count = await card.getByTestId('set-row').count();
  await card.getByLabel('Set 1 weight', { exact: true }).fill('105');
  await card.getByLabel('Set 1 reps', { exact: true }).fill('9');
  for (let n = 1; n <= count; n++) {
    await card.getByRole('button', { name: `Complete set ${n}` }).click();
  }
  await expect(card.getByRole('button', { name: /Expand/ })).toBeVisible();
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await expect(page).toHaveURL(/\/$/);

  // Choose Upper A again.
  await page.getByRole('button', { name: 'Choose another workout' }).click();
  await page.getByRole('button', { name: /Upper A/ }).click();
  await expect(page).toHaveURL(/\/session\//);

  const second = firstCard(page);
  await expect(second.getByTestId('last-line')).toContainText(
    'Last: 105 lb × ' + Array(count).fill('9').join(', '),
  );
  await expect(second.getByLabel('Set 1 weight', { exact: true })).toHaveValue('105');
  await expect(second.getByLabel(`Set ${count} reps`, { exact: true })).toHaveValue('9');
});

test('an empty session can be discarded', async ({ page }) => {
  await startUpperA(page);
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await page.getByRole('button', { name: 'Discard workout' }).click();
  await expect(page).toHaveURL(/\/$/);
});
