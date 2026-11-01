import { describe, expect, it } from 'vitest';
import {
  estimate1RM,
  exerciseSessionMetrics,
  findPRs,
  weeklyCounts,
} from '../../../src/domain/stats';

const w = (weight: number, reps: number, isWarmup = false) => ({ weight, reps, isWarmup });

describe('estimate1RM', () => {
  it('applies Epley', () => {
    expect(estimate1RM(100, 10)).toBeCloseTo(133.333, 3);
    expect(estimate1RM(135, 1)).toBeCloseTo(139.5, 5);
  });
  it('is defined at 12 reps and null at 13', () => {
    expect(estimate1RM(100, 12)).toBeCloseTo(140, 5);
    expect(estimate1RM(100, 13)).toBeNull();
  });
  it('is null for 0 reps', () => {
    expect(estimate1RM(100, 0)).toBeNull();
  });
});

describe('exerciseSessionMetrics', () => {
  it('summarises working sets and ignores warm-ups', () => {
    const m = exerciseSessionMetrics([w(45, 10, true), w(100, 8), w(110, 6), w(100, 8)]);
    expect(m.topWeight).toBe(110);
    expect(m.volume).toBe(800 + 660 + 800);
    expect(m.totalReps).toBe(22);
    expect(m.setCount).toBe(3);
    expect(m.bestE1RM).toBeCloseTo(Math.max(100 * (1 + 8 / 30), 110 * (1 + 6 / 30)), 5);
  });
  it('returns zeros and null e1RM when empty or warm-up only', () => {
    const empty = { topWeight: 0, bestE1RM: null, volume: 0, totalReps: 0, setCount: 0 };
    expect(exerciseSessionMetrics([])).toEqual(empty);
    expect(exerciseSessionMetrics([w(50, 10, true)])).toEqual(empty);
  });
  it('has null e1RM when all sets exceed 12 reps', () => {
    expect(exerciseSessionMetrics([w(20, 15)]).bestE1RM).toBeNull();
  });
});

describe('findPRs', () => {
  const prior = [w(100, 8), w(105, 5)];
  it('flags a heavier weight', () => {
    const [pr] = findPRs(prior, [w(110, 3)]);
    expect(pr?.weight).toBe(true);
  });
  it('flags a better e1RM at the same weight', () => {
    const r = findPRs(prior, [w(105, 8)]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ weight: false, e1rm: true });
  });
  it('does not flag ties', () => {
    expect(findPRs(prior, [w(105, 5), w(100, 8)])).toEqual([]);
  });
  it('does not flag lighter sets or warm-ups', () => {
    expect(findPRs(prior, [w(95, 8), w(200, 5, true)])).toEqual([]);
  });
  it('ignores prior warm-ups', () => {
    expect(findPRs([w(300, 1, true), w(100, 5)], [w(110, 5)])).toHaveLength(1);
  });
  it('does not flag a repeat within the new sets', () => {
    expect(findPRs(prior, [w(110, 5), w(110, 5)])).toHaveLength(1);
  });
  it('flags nothing when there is no prior history', () => {
    expect(findPRs([], [w(100, 5)])).toEqual([]);
  });
});

describe('weeklyCounts', () => {
  const monday = new Date(2026, 0, 5); // Mon 5 Jan 2026 local
  const at = (day: number, hour = 12) => new Date(2026, 0, day, hour).toISOString();
  it('returns seven days Mon-Sun with counts', () => {
    const r = weeklyCounts(
      [
        { status: 'completed', startedAt: at(5) },
        { status: 'completed', startedAt: at(5, 18) },
        { status: 'completed', startedAt: at(7) },
        { status: 'discarded', startedAt: at(6) },
        { status: 'active', startedAt: at(8) },
        { status: 'completed', startedAt: at(4) }, // previous week
        { status: 'completed', startedAt: at(12) }, // next week
      ],
      [{ startedAt: at(7) }, { startedAt: at(11, 23) }, { startedAt: at(13) }],
      monday,
    );
    expect(r.map((d) => d.date)).toEqual([
      '2026-01-05',
      '2026-01-06',
      '2026-01-07',
      '2026-01-08',
      '2026-01-09',
      '2026-01-10',
      '2026-01-11',
    ]);
    expect(r.map((d) => d.workouts)).toEqual([2, 0, 1, 0, 0, 0, 0]);
    expect(r.map((d) => d.activities)).toEqual([0, 0, 1, 0, 0, 0, 1]);
  });
  it('handles empty input', () => {
    expect(weeklyCounts([], [], monday).every((d) => d.workouts === 0 && d.activities === 0)).toBe(
      true,
    );
  });
});
