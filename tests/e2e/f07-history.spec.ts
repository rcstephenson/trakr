import { expect, test, type Page } from '@playwright/test';
import { exerciseRow, expectLogged, logRow } from './session-helpers';

/** Logs the first exercise of Upper A (100 lb x 8, applied to all its sets) and finishes. */
async function logUpperA(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /^Start / }).click();
  await expect(page).toHaveURL(/\/session\/[0-9A-Za-z]+$/);
  await logRow(exerciseRow(page, 0), '100', '8');
  await expectLogged(exerciseRow(page, 0));
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await expect(page).toHaveURL(/\/$/);
}

test('empty history invites the first workout', async ({ page }) => {
  await page.goto('/history');
  await expect(page.getByText('Nothing logged yet')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start your first workout' })).toBeVisible();
});

test('edited set weight shows up as Last on the next session', async ({ page }) => {
  await logUpperA(page);

  await page.getByRole('link', { name: 'History', exact: true }).last().click();
  await expect(page.getByText('This week')).toBeVisible();
  await page.getByTestId('feed-session').first().click();
  await expect(page).toHaveURL(/\/history\/session\//);
  // Identical working sets read as one compact line.
  await expect(page.getByTestId('detail-set')).toHaveCount(1);
  await expect(page.getByTestId('detail-set').first()).toContainText(/^\d+ × 100 lb × 8/);

  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const weight = page.getByLabel('Set 1 weight', { exact: true });
  await expect(weight).toHaveValue('100');
  await weight.fill('120');
  await page.getByLabel('Set 1 reps', { exact: true }).press('Enter');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByTestId('detail-set').first()).toContainText('120 lb × 8');

  await page.goto('/');
  await page.getByRole('radio', { name: /Upper A/ }).click();
  await page.getByRole('button', { name: /^Start / }).click();
  await expect(page).toHaveURL(/\/session\//);
  await expect(page.getByTestId('last-line').first()).toContainText('120 lb × 8');
});

test('deleting a session needs confirmation and removes it from the feed', async ({ page }) => {
  await logUpperA(page);
  await page.goto('/history');
  await expect(page.getByTestId('feed-session')).toHaveCount(1);
  await page.getByTestId('feed-session').first().click();

  await page.getByRole('button', { name: 'Delete session' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete this session?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page).toHaveURL(/\/history\/session\//);

  await page.getByRole('button', { name: 'Delete session' }).click();
  await page
    .getByRole('dialog', { name: 'Delete this session?' })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(page.getByTestId('feed-session')).toHaveCount(0);
  await expect(page.getByText('Nothing logged yet')).toBeVisible();
});
