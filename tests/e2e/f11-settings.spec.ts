import { expect, test } from '@playwright/test';

test('dark theme sets data-theme and survives a reload', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('unit toggle persists and export downloads a backup file', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('radio', { name: 'kg' }).click();
  await expect(page.getByRole('radio', { name: 'kg' })).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(page.getByRole('radio', { name: 'kg' })).toHaveAttribute('aria-checked', 'true');

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export/ }).click();
  expect((await download).suggestedFilename()).toMatch(/^trakr-backup-\d{4}-\d{2}-\d{2}\.json$/);
});

test('clear all data needs two confirmations including typing DELETE', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('radio', { name: 'kg' }).click();
  await page.getByRole('button', { name: /^Clear/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  const erase = page.getByRole('button', { name: 'Erase all data' });
  await expect(erase).toBeDisabled();
  await page
    .getByRole('dialog', { name: /Type DELETE/ })
    .getByRole('textbox')
    .fill('DELETE');
  await erase.click();
  await expect(page.getByRole('status')).toHaveText('All data cleared.');
  await expect(page.getByRole('radio', { name: 'lb' })).toHaveAttribute('aria-checked', 'true');
});

test('import shows a summary and restores a backup', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('radio', { name: 'kg' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export/ }).click();
  const path = await (await download).path();

  await page.getByRole('radio', { name: 'lb' }).click();
  await page.getByTestId('backup-file-input').setInputFiles(path);
  const dialog = page.getByRole('dialog', { name: 'Import backup' });
  await expect(dialog).toContainText('Programs');
  await dialog.getByRole('button', { name: 'Replace all data' }).click();
  await expect(page.getByRole('status')).toHaveText('Backup restored.');
  await expect(page.getByRole('radio', { name: 'kg' })).toHaveAttribute('aria-checked', 'true');
});
