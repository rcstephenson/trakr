import { describe, expect, it } from 'vitest';
import {
  formatSets,
  prefillForSet,
  readSlotNotes,
  writeSlotNote,
} from '../../../src/components/session/prefill';

const last = [
  { weight: 15, reps: 20, unit: 'lb' as const },
  { weight: 15, reps: 20, unit: 'lb' as const },
  { weight: 15, reps: 18, unit: 'lb' as const },
];

describe('prefillForSet', () => {
  it('uses the same set number from last time, unmodified', () => {
    expect(prefillForSet(last, 0, 'lb')).toEqual({ weight: 15, reps: 20 });
    expect(prefillForSet(last, 2, 'lb')).toEqual({ weight: 15, reps: 18 });
  });

  it('repeats the last set when last time had fewer sets', () => {
    expect(prefillForSet(last, 3, 'lb')).toEqual({ weight: 15, reps: 18 });
    expect(prefillForSet(last, 6, 'lb')).toEqual({ weight: 15, reps: 18 });
  });

  it('ignores extra sets from last time when this session has fewer', () => {
    expect(prefillForSet(last, 1, 'lb')).toEqual({ weight: 15, reps: 20 });
  });

  it('returns null with no history', () => {
    expect(prefillForSet(null, 0, 'lb')).toBeNull();
    expect(prefillForSet(undefined, 0, 'lb')).toBeNull();
    expect(prefillForSet([], 0, 'lb')).toBeNull();
  });

  it('converts to the display unit without otherwise adjusting', () => {
    expect(prefillForSet([{ weight: 100, reps: 5, unit: 'kg' }], 0, 'lb')).toEqual({
      weight: 220,
      reps: 5,
    });
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

describe('slot notes', () => {
  it('round-trips and preserves other text', () => {
    let notes = writeSlotNote('felt good', 2, 'seat at 4');
    notes = writeSlotNote(notes, 0, 'slow negatives');
    expect(readSlotNotes(notes)).toEqual({ 2: 'seat at 4', 0: 'slow negatives' });
    expect(notes).toContain('felt good');
    expect(writeSlotNote(notes, 2, '')).not.toContain('seat at 4');
    expect(writeSlotNote(undefined, 1, '  ')).toBeUndefined();
  });
});
