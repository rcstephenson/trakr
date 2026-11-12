import { describe, expect, it } from 'vitest';
import { parseProgram } from '../../../src/domain/programSchema';
import type { Program } from '../../../src/domain/types';
import bundled from '../../../programs/5day-upperlower-rev2.json';

const raw: unknown = bundled;
const result = parseProgram(raw);

function load(): Program {
  if (!result.ok) throw new Error(result.errors.join('\n'));
  return result.program;
}

describe('bundled 5day-upperlower-rev2 program', () => {
  it('passes parseProgram', () => {
    expect(result.ok).toBe(true);
    expect(load().id).toBe('5day-upperlower-rev2');
  });

  it('marks the first three lifts of each upper and lower day as primary, and nothing else', () => {
    const primaries = Object.fromEntries(
      load().workouts.map((w) => [w.id, w.items.filter((i) => i.primary).map((i) => i.exerciseId)]),
    );
    expect(primaries).toEqual({
      'upper-a': ['barbell-bench-press', 'chest-supported-row', 'lat-pulldown'],
      'lower-a': ['hip-thrust', 'back-squat', 'romanian-deadlift'],
      'upper-b': ['barbell-bench-press', 'chest-supported-row', 'lat-pulldown'],
      'lower-b': ['back-squat', 'hip-thrust', 'romanian-deadlift'],
      'full-body': [],
    });
    for (const w of load().workouts) {
      w.items.forEach((item, i) => {
        if (item.primary) expect(i, `${w.id} ${item.exerciseId}`).toBeLessThan(3);
      });
    }
  });

  it('has 5 workouts with 7 / 7 / 8 / 7 / 9 items (38 total)', () => {
    const p = load();
    expect(p.workouts.map((w) => w.id)).toEqual([
      'upper-a',
      'lower-a',
      'upper-b',
      'lower-b',
      'full-body',
    ]);
    expect(p.workouts.map((w) => w.items.length)).toEqual([7, 7, 8, 7, 9]);
    expect(p.workouts.reduce((n, w) => n + w.items.length, 0)).toBe(38);
  });

  it('has the 7-entry, 5-day weekly schedule', () => {
    expect(load().schedule).toEqual([
      'upper-a',
      'lower-a',
      'rest',
      'upper-b',
      'lower-b',
      'rest',
      'full-body',
    ]);
  });

  it('has the expected exercises on each day', () => {
    const p = load();
    const day = (id: string) => p.workouts.find((w) => w.id === id)!.items.map((i) => i.exerciseId);
    expect(day('upper-a')).toEqual([
      'barbell-bench-press',
      'chest-supported-row',
      'lat-pulldown',
      'cable-lateral-raise',
      'rear-delt-fly',
      'triceps-pressdown',
      'dumbbell-curl',
    ]);
    expect(day('lower-a')).toEqual([
      'hip-thrust',
      'back-squat',
      'romanian-deadlift',
      'seated-leg-curl',
      'hip-abduction-machine',
      'standing-calf-raise',
      'ab-wheel-rollout',
    ]);
    expect(day('upper-b')).toEqual([
      'barbell-bench-press',
      'chest-supported-row',
      'lat-pulldown',
      'seated-cable-row',
      'cable-lateral-raise',
      'rear-delt-fly',
      'overhead-triceps-extension',
      'dumbbell-curl',
    ]);
    expect(day('lower-b')).toEqual([
      'back-squat',
      'hip-thrust',
      'romanian-deadlift',
      'leg-extension',
      'hip-abduction-machine',
      'seated-calf-raise',
      'core-leg-raise',
    ]);
    expect(day('full-body')).toEqual([
      'bulgarian-split-squat',
      'seated-leg-curl',
      'leg-extension',
      'incline-dumbbell-press',
      'neutral-grip-lat-pulldown',
      'cable-lateral-raise',
      'machine-triceps-extension',
      'dumbbell-curl',
      'core-leg-raise',
    ]);
  });

  it('only references exercises that exist, with unique exercise and workout ids', () => {
    const p = load();
    const ids = new Set(p.exercises.map((e) => e.id));
    expect(ids.size).toBe(p.exercises.length);
    expect(new Set(p.workouts.map((w) => w.id)).size).toBe(p.workouts.length);
    for (const w of p.workouts) {
      for (const item of w.items) {
        expect(ids.has(item.exerciseId), `${w.id}: ${item.exerciseId}`).toBe(true);
        for (const alt of item.alternatives) expect(ids.has(alt), `alt ${alt}`).toBe(true);
      }
    }
  });

  it('is a clean program file (no backup-only fields or logged data)', () => {
    const keys = Object.keys(bundled);
    expect(keys).not.toContain('isActive');
    expect(keys).not.toContain('importedAt');
    expect(keys).not.toContain('sessions');
  });

  it('drops the exercises removed in rev 2 and keeps stair-master as an alternative only', () => {
    const p = load();
    const ids = new Set(p.exercises.map((e) => e.id));
    for (const gone of ['dips', 'seated-db-overhead-press', 'single-arm-cable-pulldown']) {
      expect(ids.has(gone), gone).toBe(false);
    }
    const stair = p.exercises.find((e) => e.id === 'stair-master');
    expect(stair?.load).toBe('none');
    const used = p.workouts.flatMap((w) => w.items.map((i) => i.exerciseId));
    expect(used).not.toContain('stair-master');
    const alts = p.workouts.flatMap((w) => w.items.flatMap((i) => i.alternatives));
    expect(alts).toContain('stair-master');
  });

  it('shares ids for exercises repeated across days', () => {
    const p = load();
    const shared: Record<string, number> = {
      'barbell-bench-press': 2,
      'chest-supported-row': 2,
      'lat-pulldown': 2,
      'cable-lateral-raise': 3,
      'rear-delt-fly': 2,
      'dumbbell-curl': 3,
      'hip-thrust': 2,
      'back-squat': 2,
      'seated-leg-curl': 2,
      'hip-abduction-machine': 2,
      'core-leg-raise': 2,
    };
    for (const [id, count] of Object.entries(shared)) {
      const days = p.workouts.filter((w) => w.items.some((i) => i.exerciseId === id));
      expect(days.length, id).toBe(count);
      expect(p.exercises.filter((e) => e.id === id)).toHaveLength(1);
    }
  });

  it('populates alternatives for swappable movements', () => {
    const p = load();
    const item = (w: string, ex: string) =>
      p.workouts.find((x) => x.id === w)!.items.find((i) => i.exerciseId === ex)!;
    expect(item('upper-a', 'barbell-bench-press').alternatives).toEqual(['machine-chest-press']);
    expect(item('upper-a', 'cable-lateral-raise').alternatives).toEqual([
      'machine-lateral-raise',
      'dumbbell-lateral-raise',
    ]);
    expect(item('full-body', 'incline-dumbbell-press').alternatives).toEqual([
      'incline-barbell-press',
    ]);
  });

  it('keeps sets and rep ranges', () => {
    const upperA = load().workouts[0];
    expect(upperA.items[3]).toMatchObject({
      exerciseId: 'cable-lateral-raise',
      sets: 4,
      repMin: 10,
      repMax: 15,
    });
  });

  it('notes cover only muscles worked and progression, without tables', () => {
    const notes = load().notes ?? '';
    expect(notes).toContain('## Muscle Focus');
    expect(notes).toContain('### High priority');
    expect(notes).toContain('## Progression');
    expect(notes).not.toMatch(/^\s*\|.*\|\s*$/m);
  });
});
