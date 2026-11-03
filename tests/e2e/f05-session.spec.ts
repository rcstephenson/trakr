import { expect, test } from '@playwright/test';
import {
  exerciseRow,
  expectLogged,
  logRow,
  repsField,
  startWorkout,
  weightField,
} from './session-helpers';

/** Sets per exercise, read from the "3 × 6–10" target line of a row. */
async function targetSets(row: ReturnType<typeof exerciseRow>): Promise<number> {
  const text = (await row.locator('p.num').first().innerText()) ?? '';
  return Number(/^(\d+)\s*×/.exec(text)?.[1] ?? 1);
}

test('log an exercise with weight then reps, reload, finish and see the summary', async ({
  page,
}) => {
  await startWorkout(page);
  const row = exerciseRow(page, 0);
  const sets = await targetSets(row);
  expect(sets).toBeGreaterThanOrEqual(2);

  // One entry per exercise: two fields and nothing about sets, swap or notes.
  await expect(row.getByRole('textbox')).toHaveCount(2);
  await expect(page.getByRole('button', { name: /add set|swap exercise|^note$/i })).toHaveCount(0);

  await weightField(row).fill('100');
  await weightField(row).press('Enter');
  await expect(repsField(row)).toBeFocused();
  await repsField(row).fill('8');
  await expect(row.getByTestId('entry-caption')).toHaveText('100 lb × 8');
  await repsField(row).press('Enter');
  await expectLogged(row);
  await expect(weightField(exerciseRow(page, 1))).toBeFocused();

  // Reload mid-session: everything persisted, with the entry shown once.
  await page.reload();
  const reloaded = exerciseRow(page, 0);
  await expectLogged(reloaded);
  await expect(weightField(reloaded)).toHaveValue('100');
  await expect(repsField(reloaded)).toHaveValue('8');

  // No timers anywhere in the session UI.
  await expect(page.getByLabel('Elapsed time')).toHaveCount(0);
  await expect(page.getByText(/rest timer/i)).toHaveCount(0);

  // Finish: summary then back to Today. A sub-minute duration is hidden (no timers, no noise).
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Workout summary' });
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toContainText('Duration');
  await expect(dialog).toContainText(`${sets}`);
  await dialog.getByRole('button', { name: 'Finish workout' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('invalid text shows a hint and does not log; editing a logged entry rewrites it', async ({
  page,
}) => {
  await startWorkout(page);
  const row = exerciseRow(page, 0);
  await weightField(row).fill('lots');
  await repsField(row).fill('8');
  await expect(row.getByTestId('entry-caption')).toContainText('weight');
  await repsField(row).press('Enter');
  await expectLogged(row, false);

  await logRow(row, '100', '8');
  await expectLogged(row);

  await weightField(row).fill('105');
  await repsField(row).fill('7');
  await repsField(row).press('Enter');
  await expect(weightField(row)).toHaveValue('105');
  await page.reload();
  const reloaded = exerciseRow(page, 0);
  await expect(weightField(reloaded)).toHaveValue('105');
  await expect(repsField(reloaded)).toHaveValue('7');

  // Tapping the check on a logged row un-logs it.
  await reloaded.getByRole('button', { name: /^Un-log / }).click();
  await expectLogged(reloaded, false);
});

test('a second session shows the compact Last line and prefills from the first', async ({
  page,
}) => {
  await startWorkout(page);
  await logRow(exerciseRow(page, 0), '105', '9');
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await expect(page).toHaveURL(/\/$/);

  // Choose Upper A again.
  await page.getByRole('radio', { name: /Upper A/ }).click();
  await page.getByRole('button', { name: /^Start / }).click();
  await expect(page).toHaveURL(/\/session\//);

  const second = exerciseRow(page, 0);
  await expect(second.getByTestId('last-line')).toContainText('Last 105 x 9');
  await expect(weightField(second)).toHaveValue('105');
  await expect(repsField(second)).toHaveValue('9');
  await expectLogged(second, false);
});

test('an empty session can be discarded', async ({ page }) => {
  await startWorkout(page);
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'No sets logged' });
  await sheet.getByRole('button', { name: 'Discard workout' }).click();
  const confirm = page.getByRole('dialog', { name: 'Discard this workout?' });
  await expect(confirm).toContainText('Nothing logged yet.');
  await confirm.getByRole('button', { name: 'Discard', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: /^Start / })).toBeVisible();
});
