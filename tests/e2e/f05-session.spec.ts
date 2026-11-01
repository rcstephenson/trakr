import { expect, test, type Page } from '@playwright/test';

async function startUpperA(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page).toHaveURL(/\/session\/[0-9A-Za-z]+$/);
}

function firstCard(page: Page) {
  return page.getByTestId('exercise-card').first();
}

test('log a full exercise by keyboard, reload, finish and see the summary', async ({ page }) => {
  await startUpperA(page);
  const card = firstCard(page);
  const rows = card.getByTestId('set-row');
  await expect(rows.first()).toBeVisible();
  const count = await rows.count();
  expect(count).toBeGreaterThanOrEqual(2);

  // Set 1: type weight x reps, Enter. Focus moves to set 2, prefilled with the same values.
  const first = card.getByLabel('Set 1 entry', { exact: true });
  await expect(first).toHaveAttribute('placeholder', 'weight x reps');
  await first.fill('100x8');
  await expect(card.getByTestId('set-feedback')).toHaveText('100 lb × 8');
  await first.press('Enter');
  await expect(rows.nth(0)).toHaveAttribute('data-completed', 'true');
  await expect(first).toHaveValue('100 x 8');

  // Later sets: Enter on the focused, prefilled rows.
  for (let n = 2; n <= count; n++) {
    const input = card.getByLabel(`Set ${n} entry`, { exact: true });
    await expect(input).toHaveValue('100 x 8');
    await expect(input).toBeFocused();
    await page.keyboard.press('Enter');
  }

  // All sets done: the card collapses to a one-line summary.
  await expect(card.getByRole('button', { name: /Expand/ })).toBeVisible();

  // Reload mid-session: everything persisted.
  await page.reload();
  const reloaded = firstCard(page);
  await expect(reloaded).toContainText('100 lb × ' + Array(count).fill('8').join(', '));
  await reloaded.getByRole('button', { name: /Expand/ }).click();
  await expect(reloaded.locator('[data-completed="true"]')).toHaveCount(count);

  // No timers anywhere in the session UI.
  await expect(page.getByLabel('Elapsed time')).toHaveCount(0);
  await expect(page.getByText(/rest timer/i)).toHaveCount(0);

  // Finish: summary (with the plain recorded duration) then back to Today.
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Workout summary' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Duration');
  await expect(dialog).toContainText(`${count}`);
  await dialog.getByRole('button', { name: 'Finish workout' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('invalid text shows a hint and does not log; editing a logged row updates it', async ({
  page,
}) => {
  await startUpperA(page);
  const card = firstCard(page);
  const first = card.getByLabel('Set 1 entry', { exact: true });
  await first.fill('lots');
  await expect(card.getByTestId('set-feedback')).toHaveText('weight x reps');
  await first.press('Enter');
  await expect(card.getByTestId('set-row').first()).toHaveAttribute('data-completed', 'false');

  await first.fill('100 x 8');
  await first.press('Enter');
  await expect(card.getByTestId('set-row').first()).toHaveAttribute('data-completed', 'true');

  await first.fill('105 8');
  await first.press('Enter');
  await expect(first).toHaveValue('105 x 8');
  await page.reload();
  const reloaded = firstCard(page);
  await expect(reloaded.getByLabel('Set 1 entry', { exact: true })).toHaveValue('105 x 8');

  // Tapping the check on a logged row un-logs it.
  await reloaded.getByRole('button', { name: 'Un-log set 1' }).click();
  await expect(reloaded.getByTestId('set-row').first()).toHaveAttribute('data-completed', 'false');
});

test('a second session shows Last and prefills from the first', async ({ page }) => {
  await startUpperA(page);
  const card = firstCard(page);
  await expect(card.getByTestId('set-row').first()).toBeVisible();
  const count = await card.getByTestId('set-row').count();
  await card.getByLabel('Set 1 entry', { exact: true }).fill('105 x 9');
  for (let n = 1; n <= count; n++) {
    await card.getByLabel(`Set ${n} entry`, { exact: true }).press('Enter');
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
  await expect(second.getByLabel('Set 1 entry', { exact: true })).toHaveValue('105 x 9');
  await expect(second.getByLabel(`Set ${count} entry`, { exact: true })).toHaveValue('105 x 9');
});

test('an empty session can be discarded', async ({ page }) => {
  await startUpperA(page);
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await page.getByRole('button', { name: 'Discard workout' }).click();
  await expect(page).toHaveURL(/\/$/);
});
