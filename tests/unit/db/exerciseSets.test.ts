import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../../src/db/schema';
import * as setsRepo from '../../../src/db/repositories/sets';

const base = { sessionId: 's1', slotIndex: 2, exerciseId: 'bench', unit: 'lb' as const };

describe('one entry per exercise (replaceExerciseSets / removeExerciseSets)', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });

  it('writes `count` identical working sets with sequential setIndex', async () => {
    await setsRepo.replaceExerciseSets({ ...base, count: 3, weight: 135, reps: 8 });
    const sets = await setsRepo.listBySession('s1');
    expect(sets).toHaveLength(3);
    expect(sets.map((s) => s.setIndex)).toEqual([0, 1, 2]);
    for (const s of sets) {
      expect(s).toMatchObject({
        slotIndex: 2,
        exerciseId: 'bench',
        weight: 135,
        reps: 8,
        unit: 'lb',
        isWarmup: false,
      });
    }
    expect(new Set(sets.map((s) => s.id)).size).toBe(3);
  });

  it('falls back to one set for a zero or fractional count', async () => {
    await setsRepo.replaceExerciseSets({ ...base, count: 0, weight: 50, reps: 10 });
    expect(await setsRepo.listBySession('s1')).toHaveLength(1);
  });

  it('rewrites on edit: no duplicates, no orphans, other slots untouched', async () => {
    await setsRepo.replaceExerciseSets({
      ...base,
      slotIndex: 1,
      exerciseId: 'row',
      count: 2,
      weight: 90,
      reps: 10,
    });
    await setsRepo.replaceExerciseSets({ ...base, count: 3, weight: 135, reps: 8 });
    await setsRepo.replaceExerciseSets({ ...base, count: 3, weight: 140, reps: 6 });
    const sets = await setsRepo.listBySession('s1');
    expect(sets.filter((s) => s.slotIndex === 2)).toHaveLength(3);
    expect(
      sets.filter((s) => s.slotIndex === 2).every((s) => s.weight === 140 && s.reps === 6),
    ).toBe(true);
    expect(sets.filter((s) => s.slotIndex === 1)).toHaveLength(2);
  });

  it('normalises legacy differing sets (and warm-ups) to N identical sets', async () => {
    await setsRepo.add({ ...base, setIndex: 0, weight: 45, reps: 12, isWarmup: true });
    await setsRepo.add({ ...base, setIndex: 1, weight: 135, reps: 8 });
    await setsRepo.add({ ...base, setIndex: 2, weight: 135, reps: 7 });
    await setsRepo.add({ ...base, setIndex: 3, weight: 130, reps: 6 });
    await setsRepo.replaceExerciseSets({ ...base, count: 3, weight: 135, reps: 8 });
    const sets = await setsRepo.listBySession('s1');
    expect(sets).toHaveLength(3);
    expect(sets.every((s) => s.weight === 135 && s.reps === 8 && !s.isWarmup)).toBe(true);
  });

  it('removes all of an exercise sets only', async () => {
    await setsRepo.replaceExerciseSets({
      ...base,
      slotIndex: 1,
      exerciseId: 'row',
      count: 2,
      weight: 90,
      reps: 10,
    });
    await setsRepo.replaceExerciseSets({ ...base, count: 3, weight: 135, reps: 8 });
    await setsRepo.removeExerciseSets('s1', 2, 'bench');
    const sets = await setsRepo.listBySession('s1');
    expect(sets).toHaveLength(2);
    expect(sets.every((s) => s.slotIndex === 1)).toBe(true);
  });
});
