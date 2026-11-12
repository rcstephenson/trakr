import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BUNDLED_PROGRAMS, DEFAULT_PROGRAM } from '../../../src/db/bundled';
import { findLookalikes, nameSimilarity, programWarnings } from '../../../src/domain/programCheck';
import { parseProgram } from '../../../src/domain/programSchema';
import frozen from '../../fixtures/workout_A.program.json';
import type { Program } from '../../../src/domain/types';

const root = resolve(__dirname, '../../..');
const read = (rel: string): unknown => JSON.parse(readFileSync(join(root, rel), 'utf8'));
const load = (rel: string): Program => {
  const r = parseProgram(read(rel));
  if (!r.ok) throw new Error(r.errors.join('\n'));
  return r.program;
};

describe('bundled programs', () => {
  it('are valid, have unique ids, and the rev 2 routine is the only one and the default', () => {
    for (const p of BUNDLED_PROGRAMS) expect(parseProgram(p).ok, p.id).toBe(true);
    const ids = BUNDLED_PROGRAMS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(['5day-upperlower-rev2']);
    expect(DEFAULT_PROGRAM.id).toBe('5day-upperlower-rev2');
  });

  it('name each file after the program id', () => {
    for (const p of BUNDLED_PROGRAMS) expect(load(`programs/${p.id}.json`).id).toBe(p.id);
  });

  it('ship no personal, dietary, revision, research or disclaimer content', () => {
    const banned = [
      /lifter/i,
      /\b\d{2}\s?[MF]\b/,
      /\d'\d+"/,
      /\b\d{2,3}\s?lb\b/i,
      /nutrition|calorie|protein|lean bulk|maintenance/i,
      /changes from the original|revision/i,
      /research|et al\./i,
      /medical advice|disclaimer/i,
    ];
    for (const p of BUNDLED_PROGRAMS) {
      const text = `${p.name}\n${p.description ?? ''}\n${p.notes ?? ''}`;
      for (const re of banned) expect(text, `${p.id} matches ${re}`).not.toMatch(re);
    }
  });

  it('notes avoid markdown tables, which the notes renderer (no GFM) shows as raw text', () => {
    for (const p of BUNDLED_PROGRAMS) {
      expect(p.notes ?? '', p.id).not.toMatch(/^\s*\|.*\|\s*$/m);
    }
  });

  it('shares exercise ids with the earlier 4-day program so logged progress carries over', () => {
    const [current] = BUNDLED_PROGRAMS;
    const old = load('tests/fixtures/workout_A.program.json');
    expect(old.id).toBe('v-taper-upper-lower');
    const shared = current.exercises.filter((e) => old.exercises.some((a) => a.id === e.id));
    expect(shared.length).toBeGreaterThan(20);
    expect(shared.map((e) => e.id)).toContain('barbell-bench-press');
    expect(shared.map((e) => e.id)).toContain('back-squat');
  });
});

describe('programs/_template.json', () => {
  const template = load('programs/_template.json');

  it('validates against the program schema', () => {
    expect(template.workouts.length).toBeGreaterThanOrEqual(2);
  });

  it('has a unique id that is not a bundled program', () => {
    expect(BUNDLED_PROGRAMS.map((p) => p.id)).not.toContain(template.id);
  });

  it('covers every load type, rest days, alternatives and notes', () => {
    expect(new Set(template.exercises.map((e) => e.load))).toEqual(
      new Set(['total', 'per-hand', 'bodyweight-plus', 'none']),
    );
    expect(template.schedule).toContain('rest');
    const items = template.workouts.flatMap((w) => w.items);
    expect(items.some((i) => i.alternatives.length > 0)).toBe(true);
    expect(items.some((i) => i.notes.length > 0)).toBe(true);
    expect(template.notes).toBeTruthy();
  });

  it('reuses existing exercise ids (no lookalike warnings against the bundled programs)', () => {
    const others = BUNDLED_PROGRAMS.map((program) => ({ file: `${program.id}.json`, program }));
    expect(programWarnings(template, others)).toEqual([]);
    const known = new Set(BUNDLED_PROGRAMS.flatMap((p) => p.exercises.map((e) => e.id)));
    for (const e of template.exercises) expect(known.has(e.id), e.id).toBe(true);
  });
});

describe('programCheck helpers', () => {
  const [current] = BUNDLED_PROGRAMS;
  const archived = frozen as unknown as Program;
  const others = [{ file: 'v-taper-upper-lower.json', program: archived }];

  it('scores names by shared words', () => {
    expect(nameSimilarity('Barbell Bench Press', 'Bench Press (Barbell)')).toBeGreaterThanOrEqual(
      0.5,
    );
    expect(nameSimilarity('Back Squat', 'Lat Pulldown')).toBe(0);
  });

  it('flags a new id whose name matches an existing exercise', () => {
    const renamed: Program = {
      ...current,
      exercises: current.exercises.map((e) =>
        e.id === 'barbell-bench-press' ? { ...e, id: 'bench-press-barbell' } : e,
      ),
      workouts: current.workouts.map((w) => ({
        ...w,
        items: w.items.map((i) =>
          i.exerciseId === 'barbell-bench-press' ? { ...i, exerciseId: 'bench-press-barbell' } : i,
        ),
      })),
    };
    const found = findLookalikes(renamed, others).filter((l) => l.id === 'bench-press-barbell');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ id: 'bench-press-barbell', similarId: 'barbell-bench-press' });
  });

  it('warns when the program id is already used by another file', () => {
    const warnings = programWarnings(archived, [{ file: 'copy.json', program: archived }]);
    expect(warnings.some((w) => w.includes('also used by copy.json'))).toBe(true);
  });

  it('warns about unused exercises and unscheduled workouts', () => {
    const p: Program = {
      ...current,
      schedule: ['upper-a'],
      exercises: [
        ...current.exercises,
        {
          id: 'zz-unused',
          name: 'Zz Unused',
          equipment: 'other',
          kind: 'isolation',
          load: 'total',
          muscles: [],
        },
      ],
    };
    const warnings = programWarnings(p, []);
    expect(warnings.some((w) => w.includes('"zz-unused" is defined but no workout uses it'))).toBe(
      true,
    );
    expect(warnings.some((w) => w.includes('workout "lower-a" is not in the schedule'))).toBe(true);
  });
});

describe('npm run program:check (scripts/program-check.mjs)', () => {
  const run = (file: string) =>
    spawnSync(process.execPath, [join(root, 'scripts/program-check.mjs'), file], {
      encoding: 'utf8',
      cwd: root,
    });

  it('accepts the template', () => {
    const r = run('programs/_template.json');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('OK');
  });

  it('rejects an invalid file with readable errors and a non-zero exit code', () => {
    const dir = mkdtempSync(join(tmpdir(), 'trakr-check-'));
    const bad = join(dir, 'bad.json');
    const broken = { ...(read('programs/_template.json') as object), schedule: ['nope'] };
    writeFileSync(bad, JSON.stringify(broken));
    const r = run(bad);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('unknown workout "nope"');
  });
});
