import { describe, expect, it } from 'vitest';
import { parseProgram } from '../../../src/domain/programSchema';
import type { Program } from '../../../src/domain/types';
import bundled from '../../../programs/v-taper-upper-lower.json';

const raw: unknown = bundled;
const result = parseProgram(raw);

function load(): Program {
  if (!result.ok) throw new Error(result.errors.join('\n'));
  return result.program;
}

describe('bundled v-taper-upper-lower program', () => {
  it('passes parseProgram', () => {
    expect(result.ok).toBe(true);
  });

  it('has 4 workouts with 8 / 7 / 9 / 9 items (33 total)', () => {
    const p = load();
    expect(p.workouts.map((w) => w.id)).toEqual(['upper-a', 'lower-a', 'upper-b', 'lower-b']);
    expect(p.workouts.map((w) => w.items.length)).toEqual([8, 7, 9, 9]);
    expect(p.workouts.reduce((n, w) => n + w.items.length, 0)).toBe(33);
  });

  it('has the 7-entry weekly schedule', () => {
    expect(load().schedule).toEqual([
      'upper-a',
      'lower-a',
      'rest',
      'upper-b',
      'lower-b',
      'rest',
      'rest',
    ]);
  });

  it('shares ids for exercises repeated across days', () => {
    const p = load();
    const shared = [
      'rear-delt-fly',
      'hip-thrust',
      'back-squat',
      'romanian-deadlift',
      'seated-leg-curl',
      'hip-abduction-machine',
      'core-leg-raise',
    ];
    for (const id of shared) {
      const days = p.workouts.filter((w) => w.items.some((i) => i.exerciseId === id));
      expect(days.length, id).toBe(2);
      expect(p.exercises.filter((e) => e.id === id)).toHaveLength(1);
    }
  });

  it('populates alternatives for the "X or Y" / "X / Y" rows and the DB overhead press swap', () => {
    const p = load();
    const upperB = p.workouts.find((w) => w.id === 'upper-b')!;
    expect(upperB.items[0]).toMatchObject({
      exerciseId: 'incline-dumbbell-press',
      alternatives: ['incline-barbell-press'],
    });
    expect(upperB.items[1]).toMatchObject({
      exerciseId: 'pull-up',
      alternatives: ['neutral-grip-lat-pulldown'],
    });
    expect(upperB.items[2].exerciseId).toBe('dips');
    expect(upperB.items[2].alternatives).toEqual([
      'machine-chest-press',
      'seated-db-overhead-press',
    ]);
    expect(upperB.items[5]).toMatchObject({
      exerciseId: 'machine-lateral-raise',
      alternatives: ['dumbbell-lateral-raise'],
    });
  });

  it('keeps sets, reps and notes as in the source', () => {
    const upperA = load().workouts[0];
    expect(upperA.items[4]).toMatchObject({
      sets: 5,
      repMin: 12,
      repMax: 20,
      notes: 'Cable behind body or lean away from stack',
    });
  });

  it('includes the source notes sections', () => {
    const notes = load().notes ?? '';
    for (const h of [
      '## Weekly Volume',
      '## Execution Rules',
      '## Nutrition',
      '## Changes From the Original Draft',
      '## Supporting Research',
    ]) {
      expect(notes).toContain(h);
    }
    expect(notes).toContain('**Goal:**');
  });
});
