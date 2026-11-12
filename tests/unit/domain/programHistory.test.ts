import { describe, expect, it } from 'vitest';
import {
  filterSessionsByProgram,
  programIdsOf,
  programLabel,
  summarizePrograms,
} from '../../../src/domain/programHistory';
import { nextWorkoutIdForProgram } from '../../../src/domain/rotation';

const sess = (
  programId: string,
  workoutId: string,
  day: number,
  status = 'completed' as const,
) => ({
  programId,
  workoutId,
  status,
  startedAt: new Date(2026, 0, day, 10).toISOString(),
  finishedAt: new Date(2026, 0, day, 11).toISOString(),
});

const sessions = [
  sess('old', 'upper-a', 1),
  sess('old', 'lower-a', 2),
  sess('new', 'upper-a', 10),
  sess('gone', 'x', 5),
  sess('new', 'upper-a', 11, 'discarded' as never),
];

describe('filterSessionsByProgram / programIdsOf', () => {
  it('returns everything for null and only that program otherwise', () => {
    expect(filterSessionsByProgram(sessions, null)).toHaveLength(5);
    expect(filterSessionsByProgram(sessions, 'old').map((s) => s.workoutId)).toEqual([
      'upper-a',
      'lower-a',
    ]);
    expect(filterSessionsByProgram(sessions, 'nope')).toEqual([]);
  });
  it('lists distinct program ids in first-seen order', () => {
    expect(programIdsOf(sessions)).toEqual(['old', 'new', 'gone']);
  });
});

describe('programLabel', () => {
  it('uses the program name, or the id marked removed when the program is gone', () => {
    const programs = [{ id: 'old', name: 'Old Routine' }];
    expect(programLabel(programs, 'old')).toBe('Old Routine');
    expect(programLabel(programs, 'gone')).toBe('gone (removed)');
  });
});

describe('summarizePrograms', () => {
  const programs = [
    { id: 'old', name: 'Old Routine', isActive: 0 as const },
    { id: 'new', name: 'New Routine', isActive: 1 as const },
    { id: 'empty', name: 'Never Used', isActive: 0 as const },
  ];
  const out = summarizePrograms(programs, sessions);

  it('counts completed sessions with first/last dates and puts the active program first', () => {
    expect(out[0]).toMatchObject({ id: 'new', isActive: true, sessionCount: 1, installed: true });
    const old = out.find((p) => p.id === 'old')!;
    expect(old.sessionCount).toBe(2);
    expect(old.firstAt).toBe(sessions[0].startedAt);
    expect(old.lastAt).toBe(sessions[1].startedAt);
  });
  it('includes programs with no sessions and surviving ids without a definition', () => {
    expect(out.find((p) => p.id === 'empty')).toMatchObject({ sessionCount: 0, firstAt: null });
    expect(out.find((p) => p.id === 'gone')).toMatchObject({
      installed: false,
      isActive: false,
      sessionCount: 1,
      name: 'gone (removed)',
    });
  });
  it('orders inactive programs by most recent activity', () => {
    expect(out.map((p) => p.id)).toEqual(['new', 'gone', 'old', 'empty']);
  });
});

describe('nextWorkoutIdForProgram (rotation scoped to the active program)', () => {
  const schedule = ['upper-a', 'lower-a', 'rest', 'upper-b'];
  it('ignores other programs sessions, even with the same workout ids', () => {
    const newProgram = { id: 'new', schedule };
    // The old program's latest session is lower-a, but `new` has only done upper-a.
    const mixed = [sess('new', 'upper-a', 3), sess('old', 'lower-a', 20)];
    expect(nextWorkoutIdForProgram(newProgram, mixed)).toBe('lower-a');
  });
  it('starts at the first workout when the program has no sessions of its own', () => {
    expect(nextWorkoutIdForProgram({ id: 'new', schedule }, [sess('old', 'upper-b', 4)])).toBe(
      'upper-a',
    );
  });
  it('switching back resumes where that program left off', () => {
    const history = [sess('old', 'upper-a', 1), sess('new', 'lower-a', 8)];
    expect(nextWorkoutIdForProgram({ id: 'old', schedule }, history)).toBe('lower-a');
    expect(nextWorkoutIdForProgram({ id: 'new', schedule }, history)).toBe('upper-b');
  });
});
