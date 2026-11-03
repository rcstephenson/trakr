import { describe, expect, it } from 'vitest';
import {
  allIdentical,
  entrySet,
  formatLast,
  formatSets,
  prefillFromLast,
  readSlotNotes,
} from '../../../src/components/session/prefill';

const last = [
  { weight: 15, reps: 20, unit: 'lb' as const },
  { weight: 15, reps: 20, unit: 'lb' as const },
  { weight: 15, reps: 18, unit: 'lb' as const },
];

describe('prefillFromLast', () => {
  it('uses the first working set of the previous session, unmodified', () => {
    expect(prefillFromLast(last, 'lb')).toEqual({ weight: 15, reps: 20 });
  });

  it('returns null with no history', () => {
    expect(prefillFromLast(null, 'lb')).toBeNull();
    expect(prefillFromLast(undefined, 'lb')).toBeNull();
    expect(prefillFromLast([], 'lb')).toBeNull();
  });

  it('converts to the display unit without otherwise adjusting', () => {
    expect(prefillFromLast([{ weight: 100, reps: 5, unit: 'kg' }], 'lb')).toEqual({
      weight: 220,
      reps: 5,
    });
  });
});

describe('entrySet', () => {
  const mk = (setIndex: number, isWarmup = false) => ({ setIndex, isWarmup });
  it('is the first working set', () => {
    expect(entrySet([mk(2), mk(0, true), mk(1)])).toEqual(mk(1));
  });
  it('falls back to the first set when only warm-ups exist, and to undefined when empty', () => {
    expect(entrySet([mk(1, true), mk(0, true)])).toEqual(mk(0, true));
    expect(entrySet([])).toBeUndefined();
  });
});

describe('formatSets', () => {
  it('groups consecutive sets with the same weight', () => {
    expect(formatSets(last, 'lb', { load: 'total' })).toBe('15 lb × 20, 20, 18');
  });

  it('separates weight changes', () => {
    const sets = [
      { weight: 135, reps: 8, unit: 'lb' as const },
      { weight: 145, reps: 6, unit: 'lb' as const },
    ];
    expect(formatSets(sets, 'lb', { load: 'total' })).toBe('135 lb × 8 · 145 lb × 6');
  });

  it('honours per-hand loads', () => {
    expect(formatSets([last[0]], 'lb', { load: 'per-hand' })).toBe('15 lb ea × 20');
  });
});

describe('formatLast (compact LAST line)', () => {
  const same = [
    { weight: 105, reps: 9, unit: 'lb' as const },
    { weight: 105, reps: 9, unit: 'lb' as const },
    { weight: 105, reps: 9, unit: 'lb' as const },
  ];
  it('collapses identical working sets to one entry', () => {
    expect(allIdentical(same)).toBe(true);
    expect(formatLast(same, 'lb', { load: 'total' })).toBe('105 x 9');
  });
  it('lists differing sets joined by a middle dot', () => {
    expect(formatLast(last, 'lb', { load: 'total' })).toBe('15 lb × 20, 20, 18');
    const two = [same[0], { weight: 110, reps: 7, unit: 'lb' as const }];
    expect(formatLast(two, 'lb', { load: 'total' })).toBe('105 lb × 9 · 110 lb × 7');
  });
  it('handles bodyweight, added load and reps-only', () => {
    const bw = [{ weight: 0, reps: 12, unit: 'lb' as const }];
    const plus = [{ weight: 25, reps: 8, unit: 'lb' as const }];
    expect(formatLast(bw, 'lb', { load: 'bodyweight-plus' })).toBe('bw x 12');
    expect(formatLast(plus, 'lb', { load: 'bodyweight-plus' })).toBe('+25 x 8');
    expect(formatLast(bw, 'lb', { load: 'none' })).toBe('12 reps');
  });
  it('converts units for display', () => {
    expect(formatLast([{ weight: 100, reps: 5, unit: 'kg' }], 'lb', { load: 'total' })).toBe(
      '220 x 5',
    );
  });
  it('is empty with no sets', () => {
    expect(formatLast([], 'lb', undefined)).toBe('');
  });
});

describe('legacy slot notes', () => {
  it('reads per-exercise note lines', () => {
    expect(readSlotNotes('felt good\nExercise 3: seat at 4\nExercise 1: slow')).toEqual({
      2: 'seat at 4',
      0: 'slow',
    });
  });
});
