import { describe, expect, it } from 'vitest';
import { nextWorkoutId } from '../../../src/domain/rotation';

const program = {
  schedule: ['upper-a', 'lower-a', 'rest', 'upper-b', 'lower-b', 'rest', 'rest'],
};
const done = (workoutId: string, day: number) => ({
  workoutId,
  status: 'completed' as const,
  startedAt: new Date(2026, 0, day, 10).toISOString(),
  finishedAt: new Date(2026, 0, day, 11).toISOString(),
});

describe('nextWorkoutId', () => {
  it('starts with the first workout when there are no sessions', () => {
    expect(nextWorkoutId(program, [])).toBe('upper-a');
  });
  it('skips a leading rest entry', () => {
    expect(nextWorkoutId({ schedule: ['rest', 'a', 'b'] }, [])).toBe('a');
  });
  it.each([
    ['upper-a', 'lower-a'],
    ['lower-a', 'upper-b'],
    ['upper-b', 'lower-b'],
    ['lower-b', 'upper-a'],
  ])('after %s comes %s (skipping rest, wrapping)', (last, next) => {
    expect(nextWorkoutId(program, [done(last, 1)])).toBe(next);
  });
  describe('bundled 5-day schedule (no trailing rest)', () => {
    const five = {
      schedule: ['upper-a', 'lower-a', 'rest', 'upper-b', 'lower-b', 'rest', 'full-body'],
    };
    it.each([
      ['upper-a', 'lower-a'],
      ['lower-a', 'upper-b'],
      ['upper-b', 'lower-b'],
      ['lower-b', 'full-body'],
      ['full-body', 'upper-a'],
    ])('after %s comes %s', (last, next) => {
      expect(nextWorkoutId(five, [done(last, 1)])).toBe(next);
    });
    it('starts with upper-a and cycles through all five in order', () => {
      const sessions: ReturnType<typeof done>[] = [];
      const seen: string[] = [];
      for (let i = 1; i <= 6; i++) {
        const id = nextWorkoutId(five, sessions);
        seen.push(id);
        sessions.push(done(id, i));
      }
      expect(seen).toEqual(['upper-a', 'lower-a', 'upper-b', 'lower-b', 'full-body', 'upper-a']);
    });
    it('a skipped (discarded) day does not advance the rotation', () => {
      const sessions = [
        done('lower-b', 1),
        { ...done('full-body', 2), status: 'discarded' as const },
      ];
      expect(nextWorkoutId(five, sessions)).toBe('full-body');
    });
    it('an out-of-order session continues from it', () => {
      expect(nextWorkoutId(five, [done('upper-a', 1), done('full-body', 2)])).toBe('upper-a');
    });
  });
  it('uses the most recent completed session regardless of array order', () => {
    expect(nextWorkoutId(program, [done('lower-a', 5), done('upper-a', 1)])).toBe('upper-b');
  });
  it('ignores discarded and active sessions', () => {
    const sessions = [
      done('upper-a', 1),
      { ...done('lower-a', 2), status: 'discarded' as const },
      { ...done('upper-b', 3), status: 'active' as const },
    ];
    expect(nextWorkoutId(program, sessions)).toBe('lower-a');
  });
  it('falls back to the first workout when the last workout id is gone', () => {
    expect(nextWorkoutId(program, [done('deleted-workout', 1)])).toBe('upper-a');
  });
  it('handles a schedule with a single workout and rest-only gaps', () => {
    const p = { schedule: ['rest', 'full', 'rest', 'rest'] };
    expect(nextWorkoutId(p, [done('full', 1)])).toBe('full');
  });
  it('throws for a rest-only schedule', () => {
    expect(() => nextWorkoutId({ schedule: ['rest'] }, [])).toThrow();
  });
});
