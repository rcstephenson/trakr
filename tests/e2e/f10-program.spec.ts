import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/** Reads rows from the app's IndexedDB without going through the app code. */
async function readAll(page: Page, store: string): Promise<Record<string, unknown>[]> {
  return page.evaluate(
    (name) =>
      new Promise<Record<string, unknown>[]>((resolveRows, reject) => {
        const open = indexedDB.open('trakr');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const req = open.result.transaction(name).objectStore(name).getAll();
          req.onsuccess = () => resolveRows(req.result as Record<string, unknown>[]);
          req.onerror = () => reject(req.error);
        };
      }),
    store,
  );
}

async function putRow(page: Page, store: string, row: unknown): Promise<void> {
  await page.evaluate(
    ([name, value]) =>
      new Promise<void>((resolveDone, reject) => {
        const open = indexedDB.open('trakr');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction(name as string, 'readwrite');
          tx.objectStore(name as string).put(value);
          tx.oncomplete = () => resolveDone();
          tx.onerror = () => reject(tx.error);
        };
      }),
    [store, row] as const,
  );
}

interface StoredShape {
  workouts: { id: string; items: { exerciseId: string }[] }[];
}

test('reordering an exercise changes the template but not an earlier session', async ({ page }) => {
  await page.goto('/program');
  await expect(page.getByRole('heading', { name: 'Upper A', level: 2 })).toBeVisible();

  const [program] = (await readAll(page, 'programs')) as unknown as StoredShape[];
  const original = program.workouts.find((w) => w.id === 'upper-a')!.items.map((i) => i.exerciseId);
  expect(original.slice(0, 2)).toEqual(['barbell-bench-press', 'chest-supported-row']);

  // An earlier completed session, as sessions.start would have snapshotted it.
  await putRow(page, 'sessions', {
    id: 'earlier-session',
    programId: 'v-taper-upper-lower',
    workoutId: 'upper-a',
    workoutName: 'Upper A',
    startedAt: '2026-01-01T10:00:00.000Z',
    finishedAt: '2026-01-01T11:00:00.000Z',
    status: 'completed',
    targets: original.map((exerciseId, slotIndex) => ({
      slotIndex,
      exerciseId,
      sets: 3,
      repMin: 6,
      repMax: 10,
      kind: 'compound',
    })),
  });

  await page.getByRole('link', { name: 'Edit Upper A' }).click();
  await expect(page).toHaveURL(/\/program\/edit\/upper-a$/);

  // Move the first exercise down one place with the keyboard.
  const handle = page.getByRole('button', { name: 'Reorder Barbell Bench Press' });
  await handle.focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(250);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(250);
  await page.keyboard.press('Space');

  const headings = page.locator('h2');
  await expect(headings.first()).toHaveText('Chest-Supported Row');
  await page.getByRole('button', { name: 'Save workout' }).click();
  await expect(page).toHaveURL(/\/program$/);

  // The template now has the new order, which is what the next session snapshots.
  const [saved] = (await readAll(page, 'programs')) as unknown as StoredShape[];
  const updated = saved.workouts.find((w) => w.id === 'upper-a')!.items.map((i) => i.exerciseId);
  expect(updated.slice(0, 2)).toEqual(['chest-supported-row', 'barbell-bench-press']);
  expect(updated).toHaveLength(original.length);

  // The earlier session keeps its original order.
  const sessions = (await readAll(page, 'sessions')) as unknown as {
    id: string;
    targets: { exerciseId: string }[];
  }[];
  const earlier = sessions.find((s) => s.id === 'earlier-session')!;
  expect(earlier.targets.map((t) => t.exerciseId)).toEqual(original);
});

test('importing an invalid JSON file shows readable errors and saves nothing', async ({ page }) => {
  await page.goto('/program');
  await page.getByRole('button', { name: 'Import program' }).click();

  const bad = {
    schemaVersion: 1,
    id: 'broken',
    name: 'Broken',
    schedule: ['day-one'],
    exercises: [],
    workouts: [
      {
        id: 'day-one',
        name: 'Day one',
        items: [
          { exerciseId: 'ghost', sets: 0, repMin: 12, repMax: 8, notes: '', alternatives: [] },
        ],
      },
    ],
  };
  await page.getByLabel('Program file').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(bad)),
  });

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('could not be imported');
  await expect(alert).toContainText('sets');
  await expect(alert).toContainText('unknown exercise "ghost"');
  await expect(page.getByRole('button', { name: 'Save program' })).toHaveCount(0);

  await page.getByLabel('Program file').setInputFiles({
    name: 'garbage.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{not json'),
  });
  await expect(alert).toContainText('not valid JSON');

  expect(await readAll(page, 'programs')).toHaveLength(1);
});

test('importing workout_A.md previews and saves a second program that can be switched', async ({
  page,
}) => {
  await page.goto('/program');
  await page.getByRole('button', { name: 'Import program' }).click();
  await page.getByLabel('Program file').setInputFiles({
    name: 'workout_A.md',
    mimeType: 'text/markdown',
    buffer: readFileSync(resolve(process.cwd(), 'workouts/workout_A.md')),
  });
  const preview = page.getByTestId('import-preview');
  await expect(preview).toContainText('4 workouts');
  await expect(preview).toContainText('33 exercise slots');
  await expect(page.getByLabel('Make active')).toBeChecked();
  await page.getByRole('button', { name: 'Save program' }).click();

  await expect(page.getByRole('button', { name: 'Switch program' })).toBeVisible();
  expect(await readAll(page, 'programs')).toHaveLength(2);
});
