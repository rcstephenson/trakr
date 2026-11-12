import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { exerciseRow, expectLogged, logRow, startWorkout } from './session-helpers';

test('a new program keeps old sessions attributed, and switching back works', async ({ page }) => {
  // Log one workout under the seeded program.
  await startWorkout(page);
  const row = exerciseRow(page, 0);
  await logRow(row, '100', '8');
  await expectLogged(row);
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await expect(page).toHaveURL(/\/$/);

  // Single program so far: no program label in History.
  await page.goto('/history');
  await expect(page.getByTestId('feed-session')).toHaveCount(1);
  await expect(page.getByTestId('session-program')).toHaveCount(0);

  // Import the template as a second program and make it active.
  await page.goto('/program');
  await page.getByRole('button', { name: 'Import program' }).click();
  await page.getByLabel('Program file').setInputFiles({
    name: '_template.json',
    mimeType: 'application/json',
    buffer: readFileSync(resolve(process.cwd(), 'programs/_template.json')),
  });
  await expect(page.getByTestId('import-preview')).toContainText('3 workouts');
  await page.getByRole('button', { name: 'Save program' }).click();

  // The new program starts at its own first workout; the old program is listed as past.
  await expect(page.getByText('My New Program', { exact: true })).toBeVisible();
  const past = page.getByTestId('past-programs');
  await expect(past).toContainText('Upper/Lower + Full Body');
  await expect(past).toContainText('1 session');
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Workout A', level: 2 })).toBeVisible();

  // History still has just the old session (labels only appear once two programs have sessions).
  await page.goto('/history');
  await expect(page.getByTestId('feed-session')).toHaveCount(1);
  await expect(page.getByTestId('session-program')).toHaveCount(0);

  // Log a workout in the new program: now History spans two programs.
  await startWorkout(page);
  await logRow(exerciseRow(page, 0), '120', '6');
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/history');
  await expect(page.getByTestId('feed-session')).toHaveCount(2);
  await expect(page.getByTestId('session-program')).toHaveText([
    'My New Program',
    /Upper\/Lower \+ Full Body/,
  ]);
  const filter = page.getByRole('group', { name: 'Filter by program' });
  await filter.getByRole('button', { name: 'My New Program' }).click();
  await expect(page.getByTestId('feed-session')).toHaveCount(1);
  await filter.getByRole('button', { name: /Upper\/Lower \+ Full Body/ }).click();
  await expect(page.getByTestId('feed-session')).toHaveCount(1);
  await filter.getByRole('button', { name: 'All programs' }).click();
  await expect(page.getByTestId('feed-session')).toHaveCount(2);

  // Bench press history spans both programs (shared exercise id) and can be filtered.
  await page.goto('/progress/barbell-bench-press');
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await expect(page.getByTestId('chart-summary')).toContainText('2 sessions');
  await page
    .getByRole('group', { name: 'Program' })
    .getByRole('button', { name: /Upper\/Lower \+ Full Body/ })
    .click();
  await expect(page.getByTestId('chart-summary')).toContainText('1 session');

  // Switch back to the original program from Past programs.
  await page.goto('/program');
  await page.getByRole('button', { name: /^Switch to Upper\/Lower \+ Full Body/ }).click();
  await expect(page.getByText('Active program')).toBeVisible();
  await expect(page.getByTestId('past-programs')).toContainText('My New Program');
});

test('the single built-in program is hidden while installed, and can be added back', async ({
  page,
}) => {
  // Fresh install seeds the only bundled program, so there is nothing left to offer.
  await page.goto('/program');
  await page.getByRole('button', { name: 'Import program' }).click();
  await expect(page.getByLabel('Program file')).toBeVisible();
  await expect(page.getByTestId('builtin-programs')).toHaveCount(0);

  // Import another program and make it active, then drop the built-in one from the database.
  await page.getByLabel('Program file').setInputFiles({
    name: '_template.json',
    mimeType: 'application/json',
    buffer: readFileSync(resolve(process.cwd(), 'programs/_template.json')),
  });
  await page.getByRole('button', { name: 'Save program' }).click();
  await expect(page.getByText('My New Program', { exact: true })).toBeVisible();
  await page.evaluate(async () => {
    const req = indexedDB.open('trakr');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction('programs', 'readwrite');
    tx.objectStore('programs').delete('5day-upperlower-rev2');
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();

  await page.getByRole('button', { name: 'Import program' }).click();
  const builtIns = page.getByTestId('builtin-programs');
  await expect(builtIns).toContainText('Upper/Lower + Full Body');
  await page.getByRole('button', { name: /^Add Upper\/Lower \+ Full Body/ }).click();
  await expect(page.getByRole('button', { name: 'Switch program' })).toBeVisible();
  await expect(page.getByTestId('past-programs')).toContainText('My New Program');
});