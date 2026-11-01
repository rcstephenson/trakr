import { expect, test, type Page } from '@playwright/test';

/** Text-entry controls that make iOS Safari zoom when their font-size is under 16px. */
async function smallTextControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const skip = new Set(['checkbox', 'radio', 'file', 'hidden', 'button', 'submit', 'range']);
    const out: string[] = [];
    document.querySelectorAll<HTMLElement>('input, textarea, select').forEach((el) => {
      if (el instanceof HTMLInputElement && skip.has(el.type)) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const px = parseFloat(getComputedStyle(el).fontSize);
      if (px < 16) {
        out.push(`${el.tagName.toLowerCase()}[${el.getAttribute('aria-label') ?? el.id}] ${px}px`);
      }
    });
    return out;
  });
}

async function startWorkout(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /^Start / }).click();
  await expect(page).toHaveURL(/\/session\/[0-9A-Za-z]+$/);
}

test('every text-entry control is at least 16px (no iOS focus zoom)', async ({ page }) => {
  const seen: Record<string, string[]> = {};
  const check = async (name: string) => {
    seen[name] = await smallTextControls(page);
  };

  await page.goto('/');
  await page.getByRole('button', { name: 'Yesterday' }).click();
  await expect(page.getByLabel('Pick a date')).toBeVisible();
  await check('today');

  await page.goto('/history');
  await check('history');
  await page.goto('/progress');
  await expect(
    page.getByRole('searchbox').or(page.locator('input[type=search], input')),
  ).toBeVisible();
  await check('progress');
  await page.goto('/program');
  await check('program');
  await page.getByRole('button', { name: 'Import program' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await check('import sheet');
  await page.keyboard.press('Escape');
  await page
    .getByRole('link', { name: /^Edit / })
    .first()
    .click();
  await expect(page).toHaveURL(/\/program\/edit\//);
  await check('workout editor');
  await page.getByRole('button', { name: 'Add exercise' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await check('exercise picker');
  await page.goto('/settings');
  await check('settings');
  await page.goto('/activity/new');
  await expect(page.getByRole('textbox').first()).toBeVisible();
  await check('activity form');

  await startWorkout(page);
  await expect(page.getByLabel('Set 1 entry').first()).toBeVisible();
  await check('session');
  await page.getByRole('button', { name: 'Note', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await check('note sheet');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Swap exercise' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await check('swap sheet');

  expect(seen).toEqual(Object.fromEntries(Object.keys(seen).map((k) => [k, [] as string[]])));
});

/** Contrast of the focus indicator against what is behind it, in the page's applied theme. */
async function focusContrast(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const el = document.querySelector<HTMLElement>(sel)!;
    const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const cs = getComputedStyle(el);
    if (cs.outlineStyle === 'none' || parseFloat(cs.outlineWidth) < 2) return 0;
    let bgc = [255, 255, 255];
    for (let n: HTMLElement | null = el; n; n = n.parentElement) {
      const p = parse(getComputedStyle(n).backgroundColor);
      if (p.length >= 3 && (p[3] ?? 1) > 0.5) {
        bgc = p;
        break;
      }
    }
    const a = lum(parse(cs.outlineColor));
    const b = lum(bgc);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }, selector);
}

for (const scheme of ['light', 'dark'] as const) {
  test(`focus indicators reach 3:1 in ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await startWorkout(page);
    const entry = page.getByLabel('Set 1 entry', { exact: true }).first();
    await entry.focus();
    await expect(entry).toBeFocused();
    expect(await focusContrast(page, '[aria-label="Set 1 entry"]')).toBeGreaterThanOrEqual(3);

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      el.setAttribute('data-focus-probe', '1');
      return el.tagName;
    });
    expect(first).not.toBe('BODY');
    expect(await focusContrast(page, '[data-focus-probe]')).toBeGreaterThanOrEqual(3);
  });

  test(`form-control borders reach 3:1 in ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/activity/new');
    await expect(page.locator('input').first()).toBeVisible();
    const ratio = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('input[type=text], input:not([type])')!;
      const cs = getComputedStyle(el);
      const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
      const f = (v: number) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      const lum = ([r, g, b]: number[]) => 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      const bg = document.documentElement.dataset.theme === 'dark' ? [10, 12, 16] : [238, 241, 244];
      const a = lum(parse(cs.borderTopColor));
      const b = lum(bg);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  test(`no horizontal scroll and 48px targets at 360px (${scheme})`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.emulateMedia({ colorScheme: scheme });
    const audit = async (name: string) => {
      const res = await page.evaluate(() => {
        const scroll = document.documentElement.scrollWidth > document.documentElement.clientWidth;
        const small: string[] = [];
        document
          .querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, [role=radio]')
          .forEach((el) => {
            if (el instanceof HTMLInputElement && ['checkbox', 'radio', 'file'].includes(el.type))
              return;
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0 || el.closest('[aria-hidden=true]')) return;
            if (r.width < 47.5 || r.height < 47.5) {
              small.push(
                `${el.tagName} ${el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 20)} ${Math.round(r.width)}x${Math.round(r.height)}`,
              );
            }
          });
        return { scroll, small };
      });
      expect(res.scroll, `${name} scrolls horizontally`).toBe(false);
      expect(res.small, `${name} small targets`).toEqual([]);
    };
    await page.goto('/');
    await audit('today');
    await page.goto('/activity/new');
    await audit('activity');
    await startWorkout(page);
    await audit('session');
  });
}
