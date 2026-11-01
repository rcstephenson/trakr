import { expect, test, type Locator, type Page } from '@playwright/test';

/** Words that would indicate coaching / recommendations (SPEC 1 non-goals). */
const ADVICE = /\b(recommend\w*|suggest\w*|advice|advise\w*|you should|try adding|deload)\b/i;
/** A running clock reads like 12:34 or 0:05:12 (a pace such as 5:36 /km is not a clock). */
const CLOCK = /(^|\s)\d{1,2}:\d{2}(:\d{2})?(?!\s*\/)(\s|$)/;

async function startNext(page: Page, name: string) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
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

/** The set input that currently has focus, or null. */
function focusedSetInput(page: Page): Locator {
  return page.locator('input[aria-label$=" entry"]:focus');
}

/**
 * Logs the focused row and every following row of the current exercise using only the keyboard.
 * Types `weight` when the row is empty, otherwise accepts the prefill with Enter. Returns after
 * the exercise's last Enter has been persisted.
 */
async function logFocusedExercise(page: Page, weight: number) {
  for (let guard = 0; guard < 12; guard++) {
    const input = focusedSetInput(page);
    await expect(input).toBeFocused();
    const label = await input.getAttribute('aria-label');
    const card = page.locator('[data-testid="exercise-card"]', { has: input });
    const slot = await card.getAttribute('data-slot');
    const before = await loggedSetCount(page);
    if ((await input.inputValue()) === '') {
      const repsOnly = (await input.getAttribute('placeholder')) === 'reps';
      await page.keyboard.type(repsOnly ? '12' : `${weight} x 8`);
    }
    await page.keyboard.press('Enter');
    await expect.poll(() => loggedSetCount(page)).toBe(before + 1);
    // Stay in the same exercise while it still has unlogged rows after this one.
    const rowsLeft = await page
      .locator(`[data-testid="exercise-card"][data-slot="${slot}"] [data-completed="false"]`)
      .count();
    if (rowsLeft === 0) return;
    expect(label).toBeTruthy();
  }
}

/** Keyboard-only: tap into the first row once, then type the whole workout. */
async function logWholeWorkout(page: Page, baseWeight: number) {
  const unlogged = page.locator('[data-testid="set-row"][data-completed="false"] input');
  await unlogged.first().click();
  for (let slot = 0; slot < 20; slot++) {
    if ((await page.locator('[data-completed="false"]').count()) === 0) break;
    await expect(focusedSetInput(page)).toBeFocused();
    await logFocusedExercise(page, baseWeight + slot * 5);
  }
  await expect(page.locator('[data-completed="false"]')).toHaveCount(0);
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

test('keyboard flow: focus follows into the next exercise after the last set', async ({ page }) => {
  await startNext(page, 'Upper A');
  const firstCard = page.locator('[data-testid="exercise-card"][data-slot="0"]');
  const secondCard = page.locator('[data-testid="exercise-card"][data-slot="1"]');
  await firstCard.getByLabel('Set 1 entry', { exact: true }).click();

  // Exercise 1, purely from the keyboard.
  await logFocusedExercise(page, 100);
  await expect(firstCard.getByRole('button', { name: /Expand/ })).toBeVisible();

  // Focus is now in exercise 2 set 1 (not <body>), so the phone keyboard stays up.
  const ex2Set1 = secondCard.getByLabel('Set 1 entry', { exact: true });
  await expect(ex2Set1).toBeFocused();
  await expect(secondCard).toBeInViewport();

  // Exercise 2 with the keyboard, then focus lands in exercise 3.
  await logFocusedExercise(page, 60);
  await expect(secondCard.getByRole('button', { name: /Expand/ })).toBeVisible();
  const thirdSet1 = page
    .locator('[data-testid="exercise-card"][data-slot="2"]')
    .getByLabel('Set 1 entry', { exact: true });
  await expect(thirdSet1).toBeFocused();
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

test('tapping into a filled row selects its text for easy replacement', async ({ page }) => {
  await startNext(page, 'Upper A');
  const input = page.locator('[data-slot="0"]').getByLabel('Set 1 entry', { exact: true });
  await input.fill('100 x 8');
  await input.press('Enter');
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

  // Upper A again: rows prefill from week 1. Barbell bench press set 1 was typed as 100 x 8.
  await page.goto('/');
  await page.getByRole('button', { name: 'Choose another workout' }).click();
  await page
    .getByRole('button', { name: /Upper A/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/session\/[0-9A-Za-z]+$/);
  const bench = page.locator('[data-slot="0"]');
  await expect(bench.getByTestId('last-line')).toContainText('100');
  await expect(bench.getByLabel('Set 1 entry', { exact: true })).toHaveValue('100 x 8');
  await expect(bench.getByLabel('Set 2 entry', { exact: true })).toHaveValue('100 x 8');
  // Accept all prefills with Enter only.
  await bench.getByLabel('Set 1 entry', { exact: true }).click();
  await logFocusedExercise(page, 0);
  await expect(
    page.locator('[data-slot="1"]').getByLabel('Set 1 entry', { exact: true }),
  ).toBeFocused();
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
