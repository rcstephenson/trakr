import { expect, type Locator, type Page } from '@playwright/test';

/** The ledger row of exercise `n` (0-based slot) on the session screen. */
export function exerciseRow(page: Page, n: number): Locator {
  return page.locator(`[data-testid="exercise-row"][data-slot="${n}"]`);
}

/** The weight field of a row (load `none` rows have no weight field; use `repsField`). */
export function weightField(row: Locator): Locator {
  return row.getByRole('textbox').first();
}

export function repsField(row: Locator): Locator {
  return row.getByRole('textbox').last();
}

/** Types weight then reps, pressing Enter after each, exactly like a keyboard user. */
export async function logRow(row: Locator, weight: string, reps: string): Promise<void> {
  await weightField(row).fill(weight);
  await weightField(row).press('Enter');
  await expect(repsField(row)).toBeFocused();
  await repsField(row).fill(reps);
  await repsField(row).press('Enter');
}

export async function expectLogged(row: Locator, logged = true): Promise<void> {
  await expect(row).toHaveAttribute('data-logged', String(logged));
}

export async function startWorkout(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /^Start / }).click();
  await expect(page).toHaveURL(/\/session\/[0-9A-Za-z]+$/);
}
