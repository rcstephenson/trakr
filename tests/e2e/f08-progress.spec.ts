import { expect, test, type Page } from '@playwright/test';

const DAY = 86_400_000;

/** Writes completed bench-press sessions straight into IndexedDB (the /dev routes are not in the production build). */
async function seedBench(page: Page) {
  await page.goto('/');
  await page.getByRole('heading', { name: 'Today', level: 1 }).waitFor();
  await page.evaluate(async (day) => {
    const open = indexedDB.open('trakr');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    const ages = [200, 70, 45, 20, 5];
    const tx = db.transaction(['sessions', 'sets'], 'readwrite');
    ages.forEach((age, i) => {
      const startedAt = new Date(Date.now() - age * day).toISOString();
      const id = `e2e-session-${i}`;
      tx.objectStore('sessions').put({
        id,
        programId: '5day-upperlower-rev2',
        workoutId: 'upper-a',
        workoutName: 'Upper A',
        startedAt,
        finishedAt: startedAt,
        status: 'completed',
        targets: [],
      });
      for (let s = 0; s < 3; s++) {
        tx.objectStore('sets').put({
          id: `${id}-set-${s}`,
          sessionId: id,
          exerciseId: 'barbell-bench-press',
          slotIndex: 0,
          setIndex: s,
          weight: 135 + i * 10,
          unit: 'lb',
          reps: 8 - s,
          isWarmup: false,
          completedAt: startedAt,
        });
      }
    });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, DAY);
}

test('open an exercise, switch metric and range, and the chart updates', async ({ page }) => {
  await seedBench(page);

  await page.goto('/progress');
  await page.getByRole('searchbox', { name: 'Search exercises' }).fill('bench');
  const row = page.getByRole('link', { name: /Barbell Bench Press/ });
  await expect(row).toContainText('175 lb');
  await row.click();

  await expect(page).toHaveURL(/\/progress\/barbell-bench-press$/);
  await expect(page.getByRole('heading', { name: 'Barbell Bench Press', level: 1 })).toBeVisible();

  const summary = page.getByTestId('chart-summary');
  const chart = page.getByTestId('progress-chart');

  // Default: Top weight, 3M -> sessions at 5, 20, 45 and 70 days ago.
  await expect(summary).toContainText('Top weight · 4 sessions · latest 175 lb');
  await expect(chart).toHaveAttribute('data-points', '4');

  await page.getByRole('radio', { name: 'Volume' }).click();
  await expect(summary).toContainText('Volume · 4 sessions');
  await expect(summary).toContainText('latest');
  await expect(page.getByRole('radio', { name: 'Volume' })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('radio', { name: 'Est. 1RM' }).click();
  await expect(summary).toContainText('Est. 1RM · 4 sessions · latest 222 lb');

  await page.getByRole('button', { name: '1M' }).click();
  await expect(chart).toHaveAttribute('data-points', '2');
  await page.getByRole('button', { name: 'All' }).click();
  await expect(chart).toHaveAttribute('data-points', '5');

  // PR cards and table.
  await expect(page.getByText('Heaviest weight')).toBeVisible();
  await expect(page.getByText('Best est. 1RM')).toBeVisible();
  const rows = page.getByRole('link', { name: /\d+ lb × \d+/ });
  await expect(rows).toHaveCount(5);
  await rows.first().click();
  await expect(page).toHaveURL(/\/history\/session\/e2e-session-4$/);
});

test('an exercise without history shows an empty state, not a chart', async ({ page }) => {
  await page.goto('/progress/barbell-bench-press');
  await expect(page.getByText('No history yet')).toBeVisible();
  await expect(page.getByTestId('progress-chart')).toHaveCount(0);

  await page.goto('/progress');
  await page.getByText(/^Not logged yet \(/).click();
  await expect(page.getByRole('link', { name: /Barbell Bench Press/ })).toBeVisible();
});
