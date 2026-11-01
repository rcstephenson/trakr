import { expect, test, type Page } from '@playwright/test';

/** Logs every set of the first exercise of Upper A (set 1 = 100 lb x 8) and finishes. */
async function logUpperA(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /^Start / }).click();
  await expect(page).toHaveURL(/\/session\/[0-9A-Za-z]+$/);
  const card = page.getByTestId('exercise-card').first();
  const count = await card.getByTestId('set-row').count();
  await card.getByLabel('Set 1 entry', { exact: true }).fill('100 x 8');
  for (let n = 1; n <= count; n++) {
    await card.getByLabel(`Set ${n} entry`, { exact: true }).press('Enter');
  }
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
  await expect(page.getByTestId('detail-set').first()).toContainText('100 lb × 8');

  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const entry = page.getByLabel('Set 1 entry', { exact: true }).first();
  await expect(entry).toHaveValue('100 x 8');
  await entry.fill('120 x 8');
  await entry.press('Enter');
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
