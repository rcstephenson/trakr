import { expect, test, type Page } from '@playwright/test';

/** Words that would indicate coaching / recommendations. */
const ADVICE = /\b(recommend\w*|suggest\w*|advice|advise\w*|you should|try adding|deload)\b/i;
/** A running clock reads like 12:34 or 0:05:12 (a pace such as 5:36 /km is not a clock). */
const CLOCK = /(^|\s)\d{1,2}:\d{2}(:\d{2})?(?!\s*\/)(\s|$)/;

async function startNext(page: Page, name: string) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible();
  await page.getByRole('button', { name: /^Start / }).click();
  await expect(page).toHaveURL(/\/session\/[0-9A-Za-z]+$/);
}

async function loggedSetCount(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const req = indexedDB.open('trakr');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const n = await new Promise<number>((resolve, reject) => {
      const r = db.transaction('sets').objectStore('sets').count();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return n;
  });
}

const FOCUSED = 'input:focus';

/**
 * Logs the focused exercise using only the keyboard: types a weight when the field is empty
 * (otherwise accepts the prefill), Enter to reps, types reps when empty, Enter to log. Returns once
 * the exercise is stored.
 */
async function logFocusedExercise(page: Page, weight: number) {
  await expect(page.locator(FOCUSED)).toBeFocused();
  const row = page.locator('[data-testid="exercise-row"]', { has: page.locator(FOCUSED) });
  const slot = await row.getAttribute('data-slot');
  const fields = row.getByRole('textbox');
  if ((await fields.count()) === 2) {
    if ((await fields.first().inputValue()) === '') await page.keyboard.type(String(weight));
    await page.keyboard.press('Enter');
    await expect(fields.last()).toBeFocused();
  }
  if ((await fields.last().inputValue()) === '') await page.keyboard.type('8');
  await page.keyboard.press('Enter');
  await expect(page.locator(`[data-testid="exercise-row"][data-slot="${slot}"]`)).toHaveAttribute(
    'data-logged',
    'true',
  );
}

/** Keyboard-only: tap into the first row once, then type the whole workout. */
async function logWholeWorkout(page: Page, baseWeight: number) {
  await page.locator('[data-logged="false"] input').first().click();
  for (let slot = 0; slot < 20; slot++) {
    if ((await page.locator('[data-logged="false"]').count()) === 0) break;
    await logFocusedExercise(page, baseWeight + slot * 5);
  }
  await expect(page.locator('[data-logged="false"]')).toHaveCount(0);
}

async function finishWorkout(page: Page) {
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Workout summary' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Finish workout' }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function expectNoTimersOrAdvice(page: Page) {
  await expect(page.getByRole('timer')).toHaveCount(0);
  await expect(page.getByText(/rest timer|rest\s*:|elapsed/i)).toHaveCount(0);
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(CLOCK);
  expect(text).not.toMatch(ADVICE);
}

test('keyboard flow: focus follows into the next exercise after each log', async ({ page }) => {
  await startNext(page, 'Upper A');
  const second = page.locator('[data-testid="exercise-row"][data-slot="1"]');
  await page.locator('[data-slot="0"]').getByRole('textbox').first().click();

  // Exercise 1, purely from the keyboard.
  await logFocusedExercise(page, 100);

  // Focus is now in exercise 2 (not <body>), so the phone keyboard stays up.
  await expect(second.getByRole('textbox').first()).toBeFocused();
  await expect(second).toBeInViewport();

  // Exercise 2 with the keyboard, then focus lands in exercise 3.
  await logFocusedExercise(page, 60);
  await expect(page.locator('[data-slot="2"]').getByRole('textbox').first()).toBeFocused();
});

test('keyboard flow: finishing the last exercise blurs and leaves Finish available', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await startNext(page, 'Upper A');
  await logWholeWorkout(page, 50);
  await expect(page.locator('input:focus')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Finish', exact: true })).toBeVisible();
});

test('tapping into a filled field selects its text for easy replacement', async ({ page }) => {
  await startNext(page, 'Upper A');
  const row = page.locator('[data-slot="0"]');
  const input = row.getByRole('textbox').first();
  await input.fill('100');
  await input.press('Enter');
  await row.getByRole('textbox').last().fill('8');
  await row.getByRole('textbox').last().press('Enter');
  await page.locator('body').click({ position: { x: 5, y: 300 } });
  await input.tap();
  const sel = await input.evaluate((el: HTMLInputElement) => [
    el.selectionStart,
    el.selectionEnd,
    el.value.length,
  ]);
  expect(sel).toEqual([0, sel[2], sel[2]]);
});

test('first week journey, keyboard only: Upper A, Lower A, run, Upper B, Upper A again, backup', async ({
  page,
}) => {
  test.setTimeout(240_000);

  // Fresh install, Upper A.
  await startNext(page, 'Upper A');
  await expectNoTimersOrAdvice(page);
  await logWholeWorkout(page, 100);
  await expectNoTimersOrAdvice(page);
  await finishWorkout(page);

  // Lower A.
  await startNext(page, 'Lower A');
  await logWholeWorkout(page, 80);
  await finishWorkout(page);

  // A run.
  await page.goto('/activity/new');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByLabel('Minutes').fill('28');
  await page.getByLabel('Distance', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'km', exact: true }).click();
  await expect(page.getByTestId('pace')).toHaveText('5:36 /km');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(page.getByText('5:36 /km').first()).toBeVisible();

  // Upper B: nothing to prefill from for new exercises, rows start empty (or carry over).
  await startNext(page, 'Upper B');
  await logWholeWorkout(page, 40);
  await finishWorkout(page);

  // Upper A again: the entry prefills from week 1. Barbell bench press was typed as 100 and 8.
  await page.goto('/');
  await page.getByRole('radio', { name: /Upper A/ }).click();
  await page.getByRole('button', { name: /^Start / }).click();
  await expect(page).toHaveURL(/\/session\/[0-9A-Za-z]+$/);
  const bench = page.locator('[data-slot="0"]');
  await expect(bench.getByTestId('last-line')).toContainText('Last 100 x 8');
  await expect(bench.getByRole('textbox').first()).toHaveValue('100');
  await expect(bench.getByRole('textbox').last()).toHaveValue('8');
  // Accept the prefill with Enter only.
  await bench.getByRole('textbox').first().click();
  await logFocusedExercise(page, 0);
  await expect(page.locator('[data-slot="1"]').getByRole('textbox').first()).toBeFocused();
  await finishWorkout(page);

  // History shows all of it.
  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'History', level: 1 })).toBeVisible();
  for (const name of ['Upper A', 'Lower A', 'Upper B']) {
    await expect(page.getByText(name).first()).toBeVisible();
  }
  await expectNoTimersOrAdvice(page);

  // Progress: bench press has a chart page.
  await page.goto('/progress');
  await expectNoTimersOrAdvice(page);
  await page.getByRole('searchbox').or(page.getByRole('textbox')).first().fill('bench');
  await page
    .getByRole('link', { name: /Barbell Bench Press/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: /Barbell Bench Press/, level: 1 })).toBeVisible();
  await expectNoTimersOrAdvice(page);

  // Other screens: no timers or advice.
  await page.goto('/settings');
  await expectNoTimersOrAdvice(page);

  // Export a backup, then import it back (replace all).
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export/ }).click();
  const path = await (await download).path();
  const setsBefore = await loggedSetCount(page);
  expect(setsBefore).toBeGreaterThan(30);

  await page.getByTestId('backup-file-input').setInputFiles(path);
  const dialog = page.getByRole('dialog', { name: 'Import backup' });
  await dialog.getByRole('button', { name: 'Replace all data' }).click();
  await expect(page.getByRole('status')).toHaveText('Backup restored.');
  expect(await loggedSetCount(page)).toBe(setsBefore);

  await page.goto('/history');
  await expect(page.getByText('Lower A').first()).toBeVisible();
  await expect(page.getByText('5:36 /km').first()).toBeVisible();
});

test('an IndexedDB from the earlier build (rest timers, increments) still opens and logs', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Upper A', level: 2 })).toBeVisible();
  // Rewrite the stored rows the way the earlier build left them.
  await page.evaluate(async () => {
    const req = indexedDB.open('trakr');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const all = await new Promise<Record<string, unknown>[]>((resolve) => {
      const r = db.transaction('programs').objectStore('programs').getAll();
      r.onsuccess = () => resolve(r.result as Record<string, unknown>[]);
    });
    const tx = db.transaction(['settings', 'programs'], 'readwrite');
    tx.objectStore('settings').put({
      key: 'app',
      unit: 'lb',
      theme: 'light',
      increments: { barbell: 5, dumbbell: 5, cable: 2.5, machine: 5, bodyweight: 5, other: 5 },
      restTimerEnabled: true,
      restTimerSound: true,
    });
    for (const p of all) {
      tx.objectStore('programs').put({ ...p, restSeconds: { compound: 150, isolation: 75 } });
    }
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Upper A', level: 2 })).toBeVisible();
  await page.getByRole('button', { name: /^Start / }).click();
  const row = page.locator('[data-slot="0"]');
  await row.getByRole('textbox').first().fill('100');
  await row.getByRole('textbox').last().fill('8');
  await row.getByRole('textbox').last().press('Enter');
  await expect(row).toHaveAttribute('data-logged', 'true');
  await expect(page.getByRole('timer')).toHaveCount(0);
});
