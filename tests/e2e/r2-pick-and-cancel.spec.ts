import { expect, test, type Page } from '@playwright/test';

const dayLabel = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const shortLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const yesterday = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

async function setCount(page: Page): Promise<number> {
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

/** Logs set 1 of the first exercise. */
async function logOneSet(page: Page) {
  const card = page.getByTestId('exercise-card').first();
  const entry = card.getByLabel('Set 1 entry', { exact: true });
  await entry.fill('100 x 8');
  await entry.press('Enter');
  await expect(card.getByTestId('set-row').first()).toHaveAttribute('data-completed', 'true');
}

async function finishWithOneSet(page: Page) {
  await logOneSet(page);
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await page.getByRole('button', { name: 'Finish workout' }).click();
  await expect(page).toHaveURL(/\/$/);
}

test('Today lists all four workouts, marks NEXT, and starts a non-next one', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('radio')).toHaveCount(4);
  await expect(page.getByRole('radio', { name: /Upper A/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: /Upper A/ })).toContainText('NEXT');
  await expect(page.getByRole('button', { name: 'Start Upper A' })).toBeVisible();

  await page.getByRole('radio', { name: /Lower B/ }).click();
  await expect(page.getByRole('heading', { name: 'Lower B', level: 2 })).toBeVisible();
  await page.getByRole('button', { name: 'Start Lower B' }).click();
  await expect(page).toHaveURL(/\/session\/[0-9A-Za-z]+$/);
  await expect(page.getByRole('heading', { name: 'Lower B', level: 1 })).toBeVisible();
});

test('a workout logged for yesterday sits on that day and leaves next up alone', async ({
  page,
}) => {
  await page.goto('/');
  // Today: Upper A. Rotation (sequence-based, by day) -> next is Lower A.
  await page.getByRole('button', { name: /^Start / }).click();
  await finishWithOneSet(page);
  await expect(page.getByRole('heading', { name: 'Lower A', level: 2 })).toBeVisible();

  // Backfill Upper B for yesterday. It is older than today's Upper A, so the latest workout is
  // still Upper A and Lower A stays next.
  await page.getByRole('radio', { name: /Upper B/ }).click();
  await page.getByRole('button', { name: 'Yesterday' }).click();
  const y = yesterday();
  await page.getByRole('button', { name: `Log Upper B · ${shortLabel(y)}` }).click();
  await expect(page).toHaveURL(/\/session\/[0-9A-Za-z]+$/);
  await logOneSet(page);
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  const summary = page.getByRole('dialog', { name: 'Workout summary' });
  await expect(summary).not.toContainText('Duration');
  await summary.getByRole('button', { name: 'Finish workout' }).click();
  await expect(page).toHaveURL(/\/$/);

  await expect(page.getByRole('heading', { name: 'Lower A', level: 2 })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Lower A/ })).toContainText('NEXT');
  await expect(page.getByRole('radio', { name: /Lower A/ })).toBeChecked();

  // History: Upper A (today) above Upper B (yesterday), with yesterday's date on the row.
  await page.goto('/history');
  const rows = page.getByTestId('feed-session');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('Upper A');
  await expect(rows.nth(1)).toContainText('Upper B');
  await expect(rows.nth(1)).toContainText(dayLabel(y));
});

test('the date picker accepts a past day and caps at today', async ({ page }) => {
  await page.goto('/');
  const picker = page.getByLabel('Pick a date');
  await expect(picker).toHaveAttribute('max', /^\d{4}-\d{2}-\d{2}$/);
  await picker.fill('2020-03-04');
  await expect(page.getByRole('button', { name: 'Log Upper A · Mar 4' })).toBeVisible();
  await page.getByRole('button', { name: 'Today' }).click();
  await expect(page.getByRole('button', { name: 'Start Upper A' })).toBeVisible();
});

test('discarding a session keeps it on Cancel and deletes it and its sets on confirm', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Start / }).click();
  await logOneSet(page);
  expect(await setCount(page)).toBe(1);

  await page.getByRole('button', { name: 'Discard workout' }).click();
  const dialog = page.getByRole('dialog', { name: 'Discard this workout?' });
  await expect(dialog).toContainText('1 logged set will be deleted.');
  await dialog.getByRole('button', { name: 'Keep logging' }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/session\//);
  expect(await setCount(page)).toBe(1);

  await page.getByRole('button', { name: 'Discard workout' }).click();
  await page
    .getByRole('dialog', { name: 'Discard this workout?' })
    .getByRole('button', { name: 'Discard', exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: 'Start Upper A' })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Resume/ })).toHaveCount(0);
  expect(await setCount(page)).toBe(0);
});

test('the Resume hero can discard the in-progress workout', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Start / }).click();
  await logOneSet(page);
  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Resume Upper A' })).toBeVisible();
  await expect(page.getByRole('radiogroup')).toHaveCount(0);
  await expect(page.getByText(/Finish or discard the workout in progress/)).toBeVisible();

  await page.getByRole('button', { name: 'Discard workout' }).click();
  const dialog = page.getByRole('dialog', { name: 'Discard this workout?' });
  await expect(dialog).toContainText('1 logged set will be deleted.');
  await dialog.getByRole('button', { name: 'Keep logging' }).click();
  await expect(page.getByRole('link', { name: 'Resume Upper A' })).toBeVisible();

  await page.getByRole('button', { name: 'Discard workout' }).click();
  await page
    .getByRole('dialog', { name: 'Discard this workout?' })
    .getByRole('button', { name: 'Discard', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Start Upper A' })).toBeVisible();
  expect(await setCount(page)).toBe(0);
});

test('activity form: Cancel and Clear are immediate when empty, confirm when dirty', async ({
  page,
}) => {
  await page.goto('/activity/new');
  await expect(page.getByRole('button', { name: 'Clear' })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page).toHaveURL(/\/history$/);

  await page.goto('/activity/new');
  const title = page.getByLabel('Title (optional)');
  await title.fill('Evening jog');
  await page.getByLabel('Minutes').fill('20');

  // Clear: keep, then confirm.
  await page.getByRole('button', { name: 'Clear' }).click();
  const clear = page.getByRole('dialog', { name: 'Clear the form?' });
  await clear.getByRole('button', { name: 'Keep editing' }).click();
  await expect(title).toHaveValue('Evening jog');
  await page.getByRole('button', { name: 'Clear' }).click();
  await page
    .getByRole('dialog', { name: 'Clear the form?' })
    .getByRole('button', { name: 'Clear' })
    .click();
  await expect(title).toHaveValue('');
  await expect(page.getByLabel('Minutes')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Clear' })).toBeDisabled();

  // Cancel with input: prompt, keep, then discard.
  await title.fill('Evening jog');
  await page.getByRole('button', { name: 'Cancel' }).click();
  const leave = page.getByRole('dialog', { name: 'Discard this activity?' });
  await leave.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page).toHaveURL(/\/activity\/new$/);
  await expect(title).toHaveValue('Evening jog');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page
    .getByRole('dialog', { name: 'Discard this activity?' })
    .getByRole('button', { name: 'Discard' })
    .click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(page.getByTestId('feed-activity')).toHaveCount(0);
});

test('activity form: the back arrow prompts when dirty and leaves when clean', async ({ page }) => {
  await page.goto('/activity/new');
  await page.getByLabel('Title (optional)').fill('Spin class');
  await page.getByRole('button', { name: 'Back' }).click();
  const leave = page.getByRole('dialog', { name: 'Discard this activity?' });
  await expect(leave).toBeVisible();
  await leave.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page).toHaveURL(/\/activity\/new$/);

  await page.getByLabel('Title (optional)').fill('');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page).toHaveURL(/\/history$/);
});

test('editing an activity: Cancel discards edits, confirming only when edited', async ({
  page,
}) => {
  await page.goto('/activity/new');
  await page.getByLabel('Title (optional)').fill('Park run');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/history$/);
  await page.getByTestId('feed-activity').first().click();
  await expect(page).toHaveURL(/\/activity\/[0-9A-Za-z]+$/);
  // No Clear on an existing activity; Delete keeps its own confirm.
  await expect(page.getByRole('button', { name: 'Clear' })).toHaveCount(0);

  await page.getByLabel('Title (optional)').fill('Park run (edited)');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page
    .getByRole('dialog', { name: 'Discard changes?' })
    .getByRole('button', { name: 'Discard' })
    .click();
  await expect(page).toHaveURL(/\/history$/);
  await expect(page.getByTestId('feed-activity').first()).toContainText('Park run');
  await expect(page.getByTestId('feed-activity').first()).not.toContainText('edited');

  await page.getByTestId('feed-activity').first().click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page).toHaveURL(/\/history$/);
});
