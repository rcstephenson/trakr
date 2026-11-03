import { expect, test, type Page } from '@playwright/test';
import {
  exerciseRow,
  expectLogged,
  logRow,
  repsField,
  startWorkout,
  weightField,
} from './session-helpers';

interface StoredSet {
  slotIndex: number;
  setIndex: number;
  weight: number;
  reps: number;
  isWarmup: boolean;
  exerciseId: string;
}

async function storedSets(page: Page): Promise<StoredSet[]> {
  return page.evaluate(async () => {
    const req = indexedDB.open('trakr');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const rows = await new Promise<StoredSet[]>((resolve, reject) => {
      const r = db.transaction('sets').objectStore('sets').getAll();
      r.onsuccess = () => resolve(r.result as StoredSet[]);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return rows;
  });
}

/** Sets per exercise, read from the "3 × 6–10" target line of the row. */
async function targetSets(page: Page, slot: number): Promise<number> {
  const text = await exerciseRow(page, slot).locator('p.num').first().innerText();
  return Number(/^(\d+)\s*×/.exec(text)?.[1]);
}

test('a whole workout by keyboard: one entry per exercise stores N identical sets', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await startWorkout(page);
  const rows = page.getByTestId('exercise-row');
  const total = await rows.count();
  const expected: number[] = [];
  for (let i = 0; i < total; i++) expected.push(await targetSets(page, i));

  await weightField(exerciseRow(page, 0)).click();
  for (let i = 0; i < total; i++) {
    const row = exerciseRow(page, i);
    const fields = row.getByRole('textbox');
    await expect(fields.first()).toBeFocused();
    if ((await fields.count()) === 2) {
      await page.keyboard.type(String(40 + i));
      await page.keyboard.press('Enter');
      await expect(fields.last()).toBeFocused();
    }
    await page.keyboard.type(String(6 + (i % 5)));
    await page.keyboard.press('Enter');
    await expectLogged(row);
  }
  // The last exercise blurs the keyboard.
  await expect(page.locator('input:focus')).toHaveCount(0);

  const sets = await storedSets(page);
  expect(sets.length).toBe(expected.reduce((a, b) => a + b, 0));
  for (let i = 0; i < total; i++) {
    const mine = sets.filter((s) => s.slotIndex === i).sort((a, b) => a.setIndex - b.setIndex);
    expect(mine, `slot ${i}`).toHaveLength(expected[i]);
    expect(mine.map((s) => s.setIndex)).toEqual(mine.map((_, k) => k));
    expect(new Set(mine.map((s) => `${s.weight}x${s.reps}`)).size).toBe(1);
    expect(mine.every((s) => !s.isWarmup)).toBe(true);
  }
  await expect(
    page.getByRole('img', { name: `${total} of ${total} exercises logged` }),
  ).toBeVisible();
});

test('editing a logged entry rewrites all its sets; un-logging deletes them', async ({ page }) => {
  await startWorkout(page);
  const row = exerciseRow(page, 0);
  const n = await targetSets(page, 0);
  await logRow(row, '100', '8');
  await expectLogged(row);
  await expect.poll(async () => (await storedSets(page)).length).toBe(n);

  await weightField(row).fill('105');
  await expect(row.getByTestId('entry-caption')).toHaveText('105 lb × 8');
  await repsField(row).fill('7');
  await repsField(row).press('Enter');
  await expect
    .poll(async () => {
      const s = await storedSets(page);
      return s.length === n && s.every((x) => x.weight === 105 && x.reps === 7);
    })
    .toBe(true);
  // Editing does not skip ahead to the next exercise.
  await expect(repsField(row)).toBeFocused();

  await row.getByRole('button', { name: /^Un-log / }).click();
  await expectLogged(row, false);
  await expect.poll(async () => (await storedSets(page)).length).toBe(0);
  // The typed numbers stay in the fields.
  await expect(weightField(row)).toHaveValue('105');
});

test('the log button logs when both fields are valid', async ({ page }) => {
  await startWorkout(page);
  const row = exerciseRow(page, 0);
  const button = row.getByRole('button', { name: /^Log / });
  await weightField(row).fill('62.5');
  await expect(button).toBeDisabled();
  await repsField(row).fill('10');
  await button.click();
  await expectLogged(row);
  const sets = await storedSets(page);
  expect(sets.every((s) => s.weight === 62.5 && s.reps === 10)).toBe(true);
});

test('no Add set, Swap exercise, Note or per-set options on the session screen', async ({
  page,
}) => {
  await startWorkout(page);
  await expect(page.getByTestId('exercise-row').first()).toBeVisible();
  await expect(page.getByText(/add set|swap exercise/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^note$/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /options/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Finish', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Discard workout' })).toBeVisible();
});

test('load none rows have a reps field only; bodyweight-plus takes +25 and bw', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('radio', { name: /Upper B/ }).click();
  await page.getByRole('button', { name: /^Start / }).click();
  const pullUp = page.getByTestId('exercise-row').filter({ hasText: 'Pull-Up' });
  await expect(pullUp.getByRole('textbox')).toHaveCount(2);
  await logRow(pullUp, '+25', '8');
  await expect(pullUp).toHaveAttribute('data-logged', 'true');
  await expect(weightField(pullUp)).toHaveValue('+25');
  await weightField(pullUp).fill('bw');
  await expect(pullUp.getByTestId('entry-caption')).toHaveText('BW × 8');
});

test('load none (core work) shows only a reps field', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: /Lower A/ }).click();
  await page.getByRole('button', { name: /^Start / }).click();
  const core = page.getByTestId('exercise-row').filter({ hasText: 'Core / Leg Raise' });
  await expect(core.getByRole('textbox')).toHaveCount(1);
  await core.getByRole('textbox').fill('15');
  await core.getByRole('textbox').press('Enter');
  await expectLogged(core);
});

test('long exercise names wrap at 360px with no truncation or horizontal scroll', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Start / })).toBeVisible();
  // Give the first exercise a very long name, as an imported program might.
  await page.evaluate(async () => {
    const req = indexedDB.open('trakr');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction('exercises', 'readwrite');
    const store = tx.objectStore('exercises');
    const all = await new Promise<{ id: string; name: string }[]>((resolve) => {
      const r = store.getAll();
      r.onsuccess = () => resolve(r.result as { id: string; name: string }[]);
    });
    const target = all.find((e) => e.name === 'Barbell Bench Press')!;
    store.put({ ...target, name: 'Incline Dumbbell or Barbell Press' });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await page.getByRole('button', { name: /^Start / }).click();
  const row = exerciseRow(page, 0);
  await expect(row.locator('h3')).toContainText('Incline Dumbbell or Barbell Press');

  await logRow(row, '135', '12');
  await expectLogged(row);
  await weightField(row).fill('62.5');

  const audit = await page.evaluate(() => {
    const out: string[] = [];
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth) {
      out.push('page scrolls horizontally');
    }
    for (const h of document.querySelectorAll<HTMLElement>('[data-testid="exercise-row"] h3')) {
      if (h.scrollWidth > h.clientWidth + 1) out.push(`name overflows: ${h.textContent}`);
      if (h.getBoundingClientRect().height > 18 * 4) out.push(`name too tall: ${h.textContent}`);
    }
    for (const el of document.querySelectorAll<HTMLInputElement>(
      '[data-testid="exercise-row"] input',
    )) {
      const r = el.getBoundingClientRect();
      if (r.right > 360 || r.width < 47.5 || r.height < 47.5) {
        out.push(
          `input ${el.getAttribute('aria-label')} ${Math.round(r.width)}x${Math.round(r.height)}`,
        );
      }
      // "135.5" must not be clipped inside the field.
      if (el.scrollWidth > el.clientWidth)
        out.push(`input clips: ${el.getAttribute('aria-label')}`);
    }
    return out;
  });
  expect(audit).toEqual([]);
});

test('values like 62.5 and 100 x 12 fit the entry column at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await startWorkout(page);
  const row = exerciseRow(page, 0);
  await weightField(row).fill('135.5');
  await repsField(row).fill('12');
  const clipped = await row
    .locator('input')
    .evaluateAll((els) =>
      els.some((e) => (e as HTMLInputElement).scrollWidth > (e as HTMLInputElement).clientWidth),
    );
  expect(clipped).toBe(false);
});
