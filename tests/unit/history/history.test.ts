import { describe, expect, it } from 'vitest';
import {
  buildFeed,
  formatVolume,
  sessionMinutes,
  sessionTotals,
  weekLabel,
} from '../../../src/components/history/feed';
import {
  formatUniformRun,
  freeNotes,
  groupSets,
  isUniformRun,
  withEmptySlots,
} from '../../../src/components/history/detail';
import type { Activity, Session, SessionTarget, SetEntry } from '../../../src/domain/types';

// Wednesday 2025-01-15 local time.
const NOW = new Date(2025, 0, 15, 12, 0, 0);
const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).toISOString();

function session(id: string, startedAt: string): Session {
  return {
    id,
    programId: 'p',
    workoutId: 'upper-a',
    workoutName: 'Upper A',
    startedAt,
    status: 'completed',
    targets: [],
  };
}

function activity(id: string, startedAt: string): Activity {
  return { id, type: 'run', startedAt };
}

function set(over: Partial<SetEntry>): SetEntry {
  return {
    id: 's',
    sessionId: 'x',
    exerciseId: 'bench',
    slotIndex: 0,
    setIndex: 0,
    weight: 100,
    unit: 'lb',
    reps: 5,
    isWarmup: false,
    completedAt: '2025-01-15T10:00:00.000Z',
    ...over,
  };
}

describe('weekLabel', () => {
  it('names this and last week', () => {
    expect(weekLabel(new Date(2025, 0, 13), NOW)).toBe('This week');
    expect(weekLabel(new Date(2025, 0, 6), NOW)).toBe('Last week');
  });

  it('shows a day range within a month and across months', () => {
    expect(weekLabel(new Date(2024, 11, 2), NOW)).toBe('Dec 2 – 8');
    expect(weekLabel(new Date(2024, 11, 30), NOW)).toBe('Dec 30 – Jan 5');
  });
});

describe('buildFeed', () => {
  const sessions = [
    session('a', at(2025, 1, 14)),
    session('b', at(2025, 1, 7)),
    session('c', at(2025, 1, 13, 8)),
  ];
  const activities = [activity('r1', at(2025, 1, 15)), activity('r2', at(2024, 12, 20))];

  it('merges newest first and groups by Monday-based week', () => {
    const groups = buildFeed(sessions, activities, 'all', NOW);
    expect(groups.map((g) => g.label)).toEqual(['This week', 'Last week', 'Dec 16 – 22']);
    expect(groups[0].items.map((i) => i.key)).toEqual(['a-r1', 's-a', 's-c']);
    expect(groups[1].items.map((i) => i.key)).toEqual(['s-b']);
    expect(groups[2].items.map((i) => i.key)).toEqual(['a-r2']);
  });

  it('puts Sunday and the following Monday in different weeks', () => {
    const groups = buildFeed(
      [session('sun', at(2025, 1, 12, 23)), session('mon', at(2025, 1, 13, 0))],
      [],
      'all',
      NOW,
    );
    expect(groups.map((g) => g.items.length)).toEqual([1, 1]);
  });

  it('filters to workouts or activities', () => {
    const w = buildFeed(sessions, activities, 'workouts', NOW).flatMap((g) => g.items);
    expect(w.every((i) => i.kind === 'session')).toBe(true);
    expect(w).toHaveLength(3);
    const a = buildFeed(sessions, activities, 'activities', NOW).flatMap((g) => g.items);
    expect(a.every((i) => i.kind === 'activity')).toBe(true);
    expect(a).toHaveLength(2);
  });

  it('returns no groups for empty input', () => {
    expect(buildFeed([], [], 'all', NOW)).toEqual([]);
  });
});

describe('sessionMinutes', () => {
  it('is null while unfinished or for negative spans', () => {
    expect(sessionMinutes({ startedAt: at(2025, 1, 15) })).toBeNull();
    expect(
      sessionMinutes({ startedAt: '2025-01-15T11:00:00Z', finishedAt: '2025-01-15T10:00:00Z' }),
    ).toBeNull();
  });

  it('returns minutes between start and finish', () => {
    expect(
      sessionMinutes({ startedAt: '2025-01-15T10:00:00Z', finishedAt: '2025-01-15T10:45:30Z' }),
    ).toBeCloseTo(45.5);
  });
});

describe('sessionTotals / formatVolume', () => {
  it('skips warm-ups and counts working sets', () => {
    const sets = [
      set({ weight: 100, reps: 5 }),
      set({ weight: 50, reps: 10, isWarmup: true }),
      set({ weight: 50, unit: 'kg', reps: 10 }),
    ];
    const lb = sessionTotals(sets, 'lb');
    expect(lb.setCount).toBe(2);
    expect(lb.volume).toBeGreaterThan(100 * 5 + 100 * 10);
    const kg = sessionTotals(sets, 'kg');
    expect(kg.setCount).toBe(2);
    expect(kg.volume).toBeLessThan(lb.volume);
  });

  it('formats volume with thousands separators', () => {
    expect(formatVolume(12345.6, 'lb')).toBe('12,346 lb');
    expect(formatVolume(0, 'kg')).toBe('0 kg');
  });
});

describe('groupSets', () => {
  it('groups by slot and exercise, ordered by slot then set index', () => {
    const groups = groupSets([
      set({
        id: '3',
        slotIndex: 1,
        exerciseId: 'row',
        setIndex: 1,
        completedAt: '2025-01-15T10:03Z',
      }),
      set({
        id: '2',
        slotIndex: 0,
        exerciseId: 'bench',
        setIndex: 1,
        completedAt: '2025-01-15T10:02Z',
      }),
      set({
        id: '1',
        slotIndex: 0,
        exerciseId: 'bench',
        setIndex: 0,
        completedAt: '2025-01-15T10:01Z',
      }),
      set({
        id: '4',
        slotIndex: 1,
        exerciseId: 'row',
        setIndex: 0,
        completedAt: '2025-01-15T10:04Z',
      }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['0:bench', '1:row']);
    expect(groups[0].sets.map((s) => s.id)).toEqual(['1', '2']);
    expect(groups[1].sets.map((s) => s.id)).toEqual(['4', '3']);
  });

  it('keeps sets from before a swap in their own group for the same slot', () => {
    const groups = groupSets([
      set({ id: '1', exerciseId: 'bench', setIndex: 0, completedAt: '2025-01-15T10:01Z' }),
      set({ id: '2', exerciseId: 'dips', setIndex: 1, completedAt: '2025-01-15T10:02Z' }),
    ]);
    expect(groups.map((g) => g.key)).toEqual(['0:bench', '0:dips']);
  });

  it('returns nothing for no sets', () => {
    expect(groupSets([])).toEqual([]);
  });
});

describe('withEmptySlots', () => {
  const targets: SessionTarget[] = [
    { slotIndex: 0, exerciseId: 'bench', sets: 3, repMin: 6, repMax: 10, kind: 'compound' },
    { slotIndex: 1, exerciseId: 'row', sets: 3, repMin: 8, repMax: 12, kind: 'compound' },
  ];

  it('adds a placeholder for slots with no logged sets, in slot order', () => {
    const groups = groupSets([set({ slotIndex: 1, exerciseId: 'row' })]);
    const result = withEmptySlots(groups, targets);
    expect(result.map((g) => g.key)).toEqual(['0:bench', '1:row']);
    expect(result[0].sets).toEqual([]);
    expect(result[0].repMin).toBe(6);
  });

  it('leaves filled slots alone', () => {
    const groups = groupSets([set({ slotIndex: 0 }), set({ slotIndex: 1, exerciseId: 'row' })]);
    expect(withEmptySlots(groups, targets)).toEqual(groups);
  });
});

describe('freeNotes', () => {
  it('drops per-exercise lines and blanks', () => {
    expect(freeNotes('Felt good\nExercise 2: slow tempo\n\n  Slept badly ')).toEqual([
      'Felt good',
      'Slept badly',
    ]);
    expect(freeNotes(undefined)).toEqual([]);
  });
});

describe('compact working-set line', () => {
  const s = (weight: number, reps: number, unit: 'lb' | 'kg' = 'lb') => ({ weight, reps, unit });
  it('detects identical runs of more than one set', () => {
    expect(isUniformRun([s(100, 8), s(100, 8), s(100, 8)])).toBe(true);
    expect(isUniformRun([s(100, 8)])).toBe(false);
    expect(isUniformRun([s(100, 8), s(100, 7)])).toBe(false);
    expect(isUniformRun([s(100, 8), s(100, 8, 'kg')])).toBe(false);
  });
  it('formats "3 × 100 lb × 8" for each load type', () => {
    const run = [s(100, 8), s(100, 8), s(100, 8)];
    expect(formatUniformRun(run, { load: 'total' }, 'lb')).toBe('3 × 100 lb × 8');
    expect(formatUniformRun(run, { load: 'per-hand' }, 'lb')).toBe('3 × 100 lb ea × 8');
    expect(formatUniformRun([s(25, 8), s(25, 8)], { load: 'bodyweight-plus' }, 'lb')).toBe(
      '2 × BW + 25 lb × 8',
    );
    expect(formatUniformRun([s(0, 12), s(0, 12)], { load: 'none' }, 'lb')).toBe('2 × 12 reps');
  });
  it('converts to the display unit', () => {
    expect(formatUniformRun([s(100, 5, 'kg'), s(100, 5, 'kg')], { load: 'total' }, 'lb')).toBe(
      '2 × 220 lb × 5',
    );
  });
});
