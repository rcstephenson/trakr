import { expect, test } from '@playwright/test';

test('log, edit and delete a run', async ({ page }) => {
  await page.goto('/activity/new');
  await expect(page.getByRole('heading', { name: 'Log activity', level: 1 })).toBeVisible();

  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByLabel('Title (optional)').fill('Morning run');
  await page.getByLabel('Minutes').fill('28');
  await page.getByLabel('Distance', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'km', exact: true }).click();
  await expect(page.getByTestId('pace')).toHaveText('5:36 /km');
  await page.getByRole('button', { name: 'Intensity 3' }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  // Saved: left the form (opened directly, so we land on History).
  await expect(page).toHaveURL(/\/history$/);

  // Find the saved activity's id via the repository-backed edit route.
  const id = await page.evaluate(async () => {
    const req = indexedDB.open('trakr');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const all = await new Promise<{ id: string }[]>((resolve, reject) => {
      const r = db.transaction('activities').objectStore('activities').getAll();
      r.onsuccess = () => resolve(r.result as { id: string }[]);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return all[0]?.id ?? '';
  });
  expect(id).not.toBe('');

  // Reopen and edit.
  await page.goto(`/activity/${id}`);
  await expect(page.getByRole('heading', { name: 'Edit activity', level: 1 })).toBeVisible();
  await expect(page.getByLabel('Title (optional)')).toHaveValue('Morning run');
  await expect(page.getByLabel('Minutes')).toHaveValue('28');
  await expect(page.getByTestId('pace')).toHaveText('5:36 /km');
  await page.getByLabel('Minutes').fill('30');
  await expect(page.getByTestId('pace')).toHaveText('6:00 /km');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/history$/);

  await page.goto(`/activity/${id}`);
  await expect(page.getByLabel('Minutes')).toHaveValue('30');

  // Delete with confirmation; cancel first.
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByLabel('Minutes')).toHaveValue('30');

  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete' }).last().click();
  await expect(page).toHaveURL(/\/history$/);

  await page.goto(`/activity/${id}`);
  await expect(page.getByText('Activity not found')).toBeVisible();
});

test('hides distance for non-distance types', async ({ page }) => {
  await page.goto('/activity/new');
  await expect(page.getByLabel('Distance', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Class' }).click();
  await expect(page.getByLabel('Distance', { exact: true })).toHaveCount(0);
});
