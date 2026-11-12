import { afterEach, describe, expect, it, vi } from 'vitest';
import { newId } from '../../../src/lib/ids';
import {
  endOfWeek,
  formatRelativeDay,
  startOfWeek,
  toDateKey,
  weekDays,
} from '../../../src/lib/dates';
import { applyTheme } from '../../../src/lib/theme';
import { DEFAULT_SETTINGS, type Program } from '../../../src/domain/types';
import stub from '../../../programs/5day-upperlower-rev2.json';

describe('ids', () => {
  it('generates unique 26-char ULIDs', () => {
    const a = newId();
    const b = newId();
    expect(a).toHaveLength(26);
    expect(a).not.toBe(b);
  });
});

describe('dates', () => {
  it('starts the week on Monday', () => {
    // Wed 2026-11-04 and Sun 2026-11-08 both belong to the week of Mon 2026-11-02.
    expect(toDateKey(startOfWeek(new Date(2026, 10, 4)))).toBe('2026-11-02');
    expect(toDateKey(startOfWeek(new Date(2026, 10, 8, 23, 0)))).toBe('2026-11-02');
    expect(toDateKey(startOfWeek(new Date(2026, 10, 2)))).toBe('2026-11-02');
    expect(toDateKey(endOfWeek(new Date(2026, 10, 4)))).toBe('2026-11-08');
  });

  it('lists Mon-Sun', () => {
    const days = weekDays(new Date(2026, 10, 4));
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.getDay())).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it('formats relative days', () => {
    const now = new Date(2026, 10, 4, 12);
    expect(formatRelativeDay(new Date(2026, 10, 4, 6), now)).toBe('Today');
    expect(formatRelativeDay(new Date(2026, 10, 3, 23), now)).toBe('Yesterday');
    expect(formatRelativeDay(new Date(2026, 10, 1), now)).toBe('Sunday');
    expect(formatRelativeDay(new Date(2026, 9, 1), now)).toBe('Oct 1');
    expect(formatRelativeDay(new Date(2025, 9, 1), now)).toBe('Oct 1, 2025');
  });
});

describe('theme', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sets explicit themes and resolves system via matchMedia', () => {
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    applyTheme('system');
    expect(document.documentElement.dataset.theme).toBe('dark');
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    applyTheme('system');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('keeps every theme-color meta on the applied theme background', () => {
    document.head.innerHTML =
      '<meta name="theme-color" content="#eef1f4" media="(prefers-color-scheme: light)">' +
      '<meta name="theme-color" content="#0a0c10" media="(prefers-color-scheme: dark)">';
    const colors = () =>
      [...document.head.querySelectorAll('meta[name="theme-color"]')].map((m) =>
        m.getAttribute('content'),
      );
    applyTheme('dark');
    expect(colors()).toEqual(['#0a0c10', '#0a0c10']);
    applyTheme('light');
    expect(colors()).toEqual(['#eef1f4', '#eef1f4']);
    document.head.innerHTML = '';
  });
});

describe('types and stub program', () => {
  it('imports the stub as a Program', () => {
    const program: Program = stub as Program;
    expect(program.id).toBe('5day-upperlower-rev2');
    expect(program.workouts[0].items).toHaveLength(7);
  });

  it('has default settings per spec', () => {
    expect(DEFAULT_SETTINGS.unit).toBe('lb');
    expect(DEFAULT_SETTINGS.theme).toBe('system');
  });
});
