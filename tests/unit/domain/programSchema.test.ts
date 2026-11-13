import { describe, expect, it } from 'vitest';
import { parseProgram } from '../../../src/domain/programSchema';
import type { Program } from '../../../src/domain/types';

function valid(): Program {
  return {
    schemaVersion: 1,
    id: 'p',
    name: 'P',
    schedule: ['a', 'rest'],
    exercises: [
      {
        id: 'x',
        name: 'X',
        equipment: 'barbell',
        kind: 'compound',
        load: 'total',
        muscles: ['chest'],
      },
      { id: 'y', name: 'Y', equipment: 'cable', kind: 'isolation', load: 'total', muscles: [] },
    ],
    workouts: [
      {
        id: 'a',
        name: 'A',
        items: [
          { exerciseId: 'x', sets: 3, repMin: 6, repMax: 10, notes: '', alternatives: ['y'] },
        ],
      },
    ],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = { [key: string]: any };
function clone(): Loose {
  return JSON.parse(JSON.stringify(valid()));
}

describe('parseProgram', () => {
  it('accepts a valid program', () => {
    const r = parseProgram(valid());
    expect(r.ok).toBe(true);
  });

  it('still accepts old program files that contain restSeconds', () => {
    const r = parseProgram({ ...valid(), restSeconds: { compound: 150, isolation: 75 } });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.program).not.toHaveProperty('restSeconds');
  });

  it('reports a broken exercise reference readably', () => {
    const p = clone();
    p.workouts[0].items[0].exerciseId = 'nope';
    const r = parseProgram(p);
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors).toContain(
        'workouts[0].items[0].exerciseId: unknown exercise "nope" (not in the exercises list)',
      );
  });

  it('reports a broken alternative and schedule reference', () => {
    const p = clone();
    p.workouts[0].items[0].alternatives = ['ghost'];
    p.schedule = ['a', 'missing'];
    const r = parseProgram(p);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(
        r.errors.some((e) =>
          e.startsWith('workouts[0].items[0].alternatives[0]: unknown exercise "ghost"'),
        ),
      ).toBe(true);
      expect(r.errors.some((e) => e.startsWith('schedule[1]: unknown workout "missing"'))).toBe(
        true,
      );
    }
  });

  it('reports repMin greater than repMax', () => {
    const p = clone();
    p.workouts[0].items[0].repMin = 12;
    const r = parseProgram(p);
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors).toContain(
        'workouts[0].items[0].repMin: repMin (12) must not be greater than repMax (10)',
      );
  });

  it('reports a missing field', () => {
    const p = clone();
    delete p.workouts[0].items[0].repMin;
    const r = parseProgram(p);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain('workouts[0].items[0].repMin: is missing');
  });

  it('reports a wrong type', () => {
    const p = clone();
    p.workouts[0].items[0].sets = 'three';
    const r = parseProgram(p);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain('workouts[0].items[0].sets: expected a number');
  });

  it('rejects sets below 1, bad slugs and duplicate ids', () => {
    const p = clone();
    p.workouts[0].items[0].sets = 0;
    p.exercises[1].id = 'x';
    p.exercises[0].id = 'Bad Id';
    const r = parseProgram(p);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.startsWith('workouts[0].items[0].sets:'))).toBe(true);
      expect(r.errors.some((e) => e.startsWith('exercises[0].id:'))).toBe(true);
    }
    const q = clone();
    q.exercises[1].id = 'x';
    const r2 = parseProgram(q);
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.errors).toContain('exercises[1].id: duplicate exercise id "x"');
  });

  it('accepts alternatives with their own sets, reps and notes, mixed with bare ids', () => {
    const p = clone();
    p.exercises.push({ ...p.exercises[1], id: 'z', name: 'Z' });
    p.workouts[0].items[0].alternatives = [
      'y',
      { exerciseId: 'z', sets: 4, repMin: 5, repMax: 8, notes: 'Slow eccentric' },
      // Partial: the rest is inherited from the item.
    ];
    const r = parseProgram(p);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.program.workouts[0].items[0].alternatives).toEqual([
        'y',
        { exerciseId: 'z', sets: 4, repMin: 5, repMax: 8, notes: 'Slow eccentric' },
      ]);
    }
    p.workouts[0].items[0].alternatives = [{ exerciseId: 'y', sets: 2 }];
    expect(parseProgram(p).ok).toBe(true);
  });

  it('reports a broken alternative object', () => {
    const p = clone();
    p.workouts[0].items[0].alternatives = [{ exerciseId: 'ghost' }];
    const r = parseProgram(p);
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors).toContain(
        'workouts[0].items[0].alternatives[0].exerciseId: unknown exercise "ghost" (not in the exercises list)',
      );
  });

  it("checks an alternative's rep range after inheriting from the item", () => {
    const p = clone();
    // repMax 10 is inherited, so repMin 12 is out of range.
    p.workouts[0].items[0].alternatives = [{ exerciseId: 'y', repMin: 12 }];
    const r = parseProgram(p);
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.errors).toContain(
        'workouts[0].items[0].alternatives[0].repMin: repMin (12) must not be greater than repMax (10)',
      );
  });

  it('rejects unknown fields on an alternative object', () => {
    const p = clone();
    p.workouts[0].items[0].alternatives = [{ exerciseId: 'y', reps: 8 }];
    expect(parseProgram(p).ok).toBe(false);
  });

  it('rejects non-object input', () => {
    const r = parseProgram(null);
    expect(r.ok).toBe(false);
  });
});
