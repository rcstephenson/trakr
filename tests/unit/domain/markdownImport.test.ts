import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { markdownImport, splitExerciseNames } from '../../../src/domain/markdownImport';
import { parseProgram } from '../../../src/domain/programSchema';
import type { Program } from '../../../src/domain/types';
// The program workout_A.md converts to: the original 4-day plan, as first bundled. The bundled
// program has since been revised (5 days), so the converter is checked against this snapshot.
import bundled from '../../fixtures/workout_A.program.json';

const md = readFileSync(resolve(process.cwd(), 'workouts/workout_A.md'), 'utf8');

function imported(input = md): Program {
  const r = markdownImport(input);
  if (!r.ok) throw new Error(r.errors.join('\n'));
  return r.program;
}

const reference: Program = (() => {
  const r = parseProgram(bundled);
  if (!r.ok) throw new Error(r.errors.join('\n'));
  return r.program;
})();

describe('markdownImport(workout_A.md)', () => {
  const program = imported();

  it('matches the bundled schedule and workout names', () => {
    expect(program.schedule).toEqual(reference.schedule);
    expect(program.workouts.map((w) => [w.id, w.name])).toEqual(
      reference.workouts.map((w) => [w.id, w.name]),
    );
  });

  it('matches every item: order, exercise ids, sets, reps, notes, alternatives', () => {
    for (const ref of reference.workouts) {
      const got = program.workouts.find((w) => w.id === ref.id);
      expect(got?.items, ref.id).toEqual(ref.items);
    }
  });

  it('defines every referenced exercise with the bundled ids and names', () => {
    const byId = new Map(program.exercises.map((e) => [e.id, e.name]));
    for (const ex of reference.exercises) expect(byId.get(ex.id), ex.id).toBe(ex.name);
    expect(program.exercises).toHaveLength(reference.exercises.length);
  });

  it('infers sensible metadata', () => {
    const find = (id: string) => program.exercises.find((e) => e.id === id);
    expect(find('dumbbell-curl')).toMatchObject({
      equipment: 'dumbbell',
      load: 'per-hand',
      kind: 'isolation',
    });
    expect(find('pull-up')).toMatchObject({ equipment: 'bodyweight', load: 'bodyweight-plus' });
    expect(find('cable-lateral-raise')).toMatchObject({ equipment: 'cable', kind: 'isolation' });
    expect(find('back-squat')?.kind).toBe('compound');
  });

  it('keeps the remaining sections as notes', () => {
    expect(program.notes).toContain('## Nutrition');
    expect(program.notes).toContain('Lean muscle');
    expect(program.notes).not.toContain('Weekly layout');
  });
});

describe('splitExerciseNames', () => {
  it('splits only where it should', () => {
    expect(splitExerciseNames('Incline Dumbbell or Barbell Press')).toEqual([
      'Incline Dumbbell Press',
      'Incline Barbell Press',
    ]);
    expect(splitExerciseNames('Machine or Dumbbell Lateral Raise')).toEqual([
      'Machine Lateral Raise',
      'Dumbbell Lateral Raise',
    ]);
    expect(splitExerciseNames('Dips / Machine Chest Press')).toEqual([
      'Dips',
      'Machine Chest Press',
    ]);
    expect(splitExerciseNames('Core / Leg Raise')).toEqual(['Core / Leg Raise']);
  });
});

const HEADER = '| # | Exercise | Sets | Reps | Notes |\n|---|---|---|---|---|\n';

describe('markdownImport errors and edge cases', () => {
  it('reports plain errors for bad rows and missing tables', () => {
    const bad = markdownImport(`# X\n\n## DAY\n\n${HEADER}| 1 | Curl | many | 8 | |\n`);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors[0]).toMatch(/sets must be a whole number/);
    expect(markdownImport('# X\n\nHello').ok).toBe(false);
  });

  it('accepts a single rep number and a hyphen range', () => {
    const p = imported(
      `# T\n\n## Day\n\n${HEADER}| 1 | Curl | 3 | 8 | |\n| 2 | Row | 2 | 6-10 | |\n`,
    );
    expect(p.workouts[0].items.map((i) => [i.repMin, i.repMax])).toEqual([
      [8, 8],
      [6, 10],
    ]);
    expect(p.schedule).toEqual(['day']);
  });
});
