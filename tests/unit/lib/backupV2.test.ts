import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../../src/db/schema';
import { ensureSeeded } from '../../../src/db/seed';
import * as programsRepo from '../../../src/db/repositories/programs';
import type { Activity, Session, SetEntry, StoredProgram } from '../../../src/domain/types';
import { exportBackup, exportBackupText, importBackup, parseBackup } from '../../../src/lib/backup';
import { encodeBackupV2, serializeBackupV2 } from '../../../src/lib/backupV2';

async function wipe() {
  await Promise.all(db.tables.map((t) => t.clear()));
}

const T0 = '2026-03-02T17:00:00.000Z';
const at = (min: number, sec = 0) =>
  new Date(Date.parse(T0) + min * 60000 + sec * 1000).toISOString();

let n = 0;
function set(
  sessionId: string,
  slotIndex: number,
  setIndex: number,
  exerciseId: string,
  over: Partial<SetEntry> = {},
): SetEntry {
  return {
    id: `legacy-set-${++n}`,
    sessionId,
    exerciseId,
    slotIndex,
    setIndex,
    weight: 135,
    unit: 'lb',
    reps: 8,
    isWarmup: false,
    completedAt: at(5),
    ...over,
  };
}

/** Populates every table with the awkward cases the compact format has to carry. */
async function populate() {
  await ensureSeeded();
  const base = (await programsRepo.getActive())!;
  const workout = base.workouts[0];
  const [a, b, c] = workout.items;

  // A custom exercise and a second program that shares ids with the first but redefines one.
  const custom = {
    id: 'sled-push',
    name: 'Sled Push',
    equipment: 'other' as const,
    kind: 'compound' as const,
    load: 'none' as const,
    muscles: ['quads', 'glutes'],
    custom: true,
  };
  const pullup = {
    id: 'weighted-pull-up',
    name: 'Weighted Pull-up',
    equipment: 'bodyweight' as const,
    kind: 'compound' as const,
    load: 'bodyweight-plus' as const,
    muscles: ['lats'],
  };
  await db.exercises.bulkPut([custom, pullup]);
  const exById = (id: string) => base.exercises.find((e) => e.id === id)!;
  const redefined = { ...exById(a.exerciseId), name: 'Renamed in program two' };
  const second: StoredProgram = {
    schemaVersion: 1,
    id: 'second-program',
    name: 'Second',
    description: 'Another plan',
    schedule: ['day-a', 'rest'],
    exercises: [redefined, exById(b.exerciseId), exById(c.exerciseId), custom, pullup],
    workouts: [
      {
        id: 'day-a',
        name: 'Day A',
        items: [
          {
            ...a,
            exerciseId: redefined.id,
            notes: 'Pause on chest',
            alternatives: [b.exerciseId],
            primary: true,
          },
          { ...b, notes: '', alternatives: [] },
          { ...c, exerciseId: custom.id, sets: 4, repMin: 10, repMax: 10, alternatives: [] },
        ],
      },
    ],
    notes: '# Notes\nLine two',
    isActive: 0,
    importedAt: '2026-02-01T00:00:00.000Z',
  };
  await db.programs.put(second);
  await db.settings.put({ key: 'app', unit: 'kg', theme: 'dark', rotationPointer: 'day-a' });

  const target = (slotIndex: number, i: typeof a, kind?: 'compound' | 'isolation') => ({
    slotIndex,
    exerciseId: i.exerciseId,
    sets: i.sets,
    repMin: i.repMin,
    repMax: i.repMax,
    kind: kind ?? ('compound' as const),
  });

  const s1: Session = {
    id: 'session-1',
    programId: base.id,
    workoutId: workout.id,
    workoutName: workout.name,
    startedAt: T0,
    finishedAt: at(50),
    status: 'completed',
    notes: 'Felt "strong"\nsecond line',
    bodyweight: 82.5,
    // slot 1 swapped to a custom exercise after logging one set of the original
    targets: [target(0, a), target(1, { ...b, exerciseId: custom.id }), target(2, c, 'isolation')],
    skippedSlots: [2],
  };
  const s2: Session = {
    id: 'session-2',
    programId: 'second-program',
    workoutId: 'day-a',
    workoutName: 'Day A (renamed since)',
    startedAt: at(24 * 60),
    finishedAt: at(24 * 60 + 40),
    status: 'completed',
    targets: [target(0, a), target(1, b), target(2, c)],
    skippedSlots: [],
  };
  const s3: Session = {
    id: 'session-3',
    programId: base.id,
    workoutId: workout.id,
    workoutName: workout.name,
    startedAt: at(48 * 60),
    status: 'active',
    targets: [target(0, a)],
  };
  const s4: Session = {
    id: 'session-4',
    programId: 'a-program-that-was-deleted',
    workoutId: 'gone',
    workoutName: 'Old Name',
    startedAt: at(72 * 60),
    finishedAt: 'not-an-iso-date',
    status: 'discarded',
    targets: [
      { slotIndex: 5, exerciseId: a.exerciseId, sets: 2, repMin: 5, repMax: 5, kind: 'isolation' },
    ],
  };
  await db.sessions.bulkPut([s1, s2, s3, s4]);

  await db.sets.bulkPut([
    // slot 0: warm-up, three identical working sets sharing a timestamp, one with rir, one in kg
    set('session-1', 0, 0, a.exerciseId, {
      weight: 45,
      reps: 10,
      isWarmup: true,
      completedAt: at(3),
    }),
    set('session-1', 0, 1, a.exerciseId, { rir: 2, completedAt: at(8) }),
    set('session-1', 0, 2, a.exerciseId, { rir: 2, completedAt: at(8) }),
    set('session-1', 0, 3, a.exerciseId, { rir: 2, completedAt: at(8) }),
    set('session-1', 0, 4, a.exerciseId, {
      weight: 60,
      unit: 'kg',
      reps: 6,
      completedAt: at(14, 7),
    }),
    // slot 1: one set of the original exercise (before the swap), then two of the swap, with
    // different per-set timestamps, a decimal weight and a bodyweight-style zero
    set('session-1', 1, 0, b.exerciseId, { weight: 62.5, reps: 12, completedAt: at(20) }),
    set('session-1', 1, 0, custom.id, { weight: 0, reps: 30, completedAt: at(26) }),
    set('session-1', 1, 1, custom.id, { weight: 0, reps: 25, completedAt: at(27, 30) }),
    // second program session: kg default, per-hand style loads
    set('session-2', 0, 0, redefined.id, {
      unit: 'kg',
      weight: 40,
      reps: 8,
      completedAt: at(24 * 60 + 5),
    }),
    set('session-2', 0, 1, redefined.id, {
      unit: 'kg',
      weight: 40,
      reps: 8,
      completedAt: at(24 * 60 + 5),
    }),
    set('session-2', 2, 0, custom.id, {
      unit: 'kg',
      weight: 0,
      reps: 1,
      completedAt: at(24 * 60 + 30),
    }),
    // active session in progress
    set('session-3', 0, 0, a.exerciseId, { weight: 100, completedAt: at(48 * 60 + 2) }),
    // backdated set logged before the session start
    set('session-4', 5, 0, a.exerciseId, { weight: 20, reps: 5, completedAt: at(72 * 60 - 10) }),
  ]);

  const activities: Activity[] = [
    {
      id: 'act-1',
      type: 'run',
      title: 'Morning run',
      startedAt: '2026-03-01T08:00:00.000Z',
      durationMin: 28.5,
      distance: 5,
      distanceUnit: 'mi',
      intensity: 3,
      notes: 'Easy',
    },
    { id: 'act-2', type: 'class', startedAt: '2026-03-05T08:00:00.000Z' },
  ];
  await db.activities.bulkPut(activities);
}

/**
 * Documented normalisations of the v2 round trip: set ids are regenerated, setIndex is re-numbered
 * 0.. within each (slot, exercise) group, and an empty skippedSlots array is the same as none.
 */
async function normalised() {
  const [programs, exercises, sessions, sets, activities, settings] = await Promise.all([
    db.programs.toArray(),
    db.exercises.toArray(),
    db.sessions.toArray(),
    db.sets.toArray(),
    db.activities.toArray(),
    db.settings.get('app'),
  ]);
  const grouped = new Map<string, SetEntry[]>();
  for (const s of sets) {
    const key = `${s.sessionId}|${s.slotIndex}|${s.exerciseId}`;
    grouped.set(key, [...(grouped.get(key) ?? []), s]);
  }
  const flat = [...grouped.entries()]
    .sort(([x], [y]) => x.localeCompare(y))
    .flatMap(([, g]) =>
      g
        .sort((p, q) => p.setIndex - q.setIndex)
        .map((s, i) => {
          const { id, ...rest } = s;
          void id;
          return { ...rest, setIndex: i };
        }),
    );
  return {
    programs,
    exercises,
    sessions: sessions.map((s) =>
      s.skippedSlots?.length === 0 ? { ...s, skippedSlots: undefined } : s,
    ),
    sets: flat,
    activities,
    settings,
  };
}

beforeEach(wipe);

describe('backup v2', () => {
  it('round-trips every table through export, clear and import (replace)', async () => {
    await populate();
    const before = await normalised();
    const text = await exportBackupText();
    expect(JSON.parse(text).backupVersion).toBe(2);

    await wipe();
    const summary = await importBackup(text, 'replace');
    expect(summary.counts).toMatchObject({ sessions: 4, sets: 13, activities: 2, programs: 2 });
    expect(await normalised()).toEqual(before);
  });

  it('keeps programId per session and the program catalog separate from sessions', async () => {
    await populate();
    const doc = JSON.parse(await exportBackupText());
    expect(doc.sessions.map((s: { program: string }) => s.program)).toEqual([
      expect.any(String),
      'second-program',
      expect.any(String),
      'a-program-that-was-deleted',
    ]);
    // The redefined exercise is inlined only in the program that differs from the catalog.
    const inline = doc.programs['second-program'].exercises.filter(
      (e: unknown) => typeof e !== 'string',
    );
    expect(inline).toHaveLength(1);
    expect(inline[0].name).toBe('Renamed in program two');
  });

  it('writes derivable fields out: no set ids, slot indexes or default values', async () => {
    await populate();
    const text = await exportBackupText();
    expect(text).not.toContain('legacy-set');
    expect(text).not.toContain('isWarmup');
    expect(text).not.toContain('sessionId');
    expect(text).not.toContain('"alternatives"');
    const doc = JSON.parse(text);
    const s1 = doc.sessions[0];
    expect(s1.log[0].sets).toEqual(['w45lbx10', '135lbx8@2*3', '60x6']);
    expect(s1.plan[0]).toHaveLength(2);
    expect(s1.skipped).toEqual([2]);
    expect(doc.sessions[1].skipped).toBeUndefined();
  });

  it('is idempotent: merging the same file twice never duplicates sessions or sets', async () => {
    await populate();
    const text = await exportBackupText();
    const sessionsBefore = await db.sessions.count();
    await importBackup(text, 'merge');
    await importBackup(text, 'merge');
    expect(await db.sessions.count()).toBe(sessionsBefore);
    expect(await db.sets.count()).toBe(13);
    expect(await db.activities.count()).toBe(2);
    const after = await normalised();
    await wipe();
    await importBackup(text, 'replace');
    expect(await normalised()).toEqual(after);
  });

  it('merge replaces the sets of an incoming session instead of duplicating', async () => {
    await populate();
    const text = await exportBackupText();
    await db.sets.add(set('session-1', 0, 9, 'barbell-bench-press', { weight: 1 }));
    await importBackup(text, 'merge');
    expect(await db.sets.where('sessionId').equals('session-1').count()).toBe(8);
  });

  it('is materially smaller than the v1 JSON for the same data', async () => {
    await populate();
    const v1 = JSON.stringify(await exportBackup(), null, 2);
    const v2 = await exportBackupText();
    expect(v2.length).toBeLessThan(v1.length * 0.5);
  });

  it('is much smaller for a realistic history with identical sets per exercise', async () => {
    await ensureSeeded();
    const program = (await programsRepo.getActive())!;
    const workout = program.workouts[0];
    const sessions: Session[] = [];
    const sets: SetEntry[] = [];
    for (let i = 0; i < 30; i++) {
      const start = Date.parse(T0) + i * 86400000;
      const id = `s-${String(i).padStart(3, '0')}`;
      sessions.push({
        id,
        programId: program.id,
        workoutId: workout.id,
        workoutName: workout.name,
        startedAt: new Date(start).toISOString(),
        finishedAt: new Date(start + 3600000).toISOString(),
        status: 'completed',
        targets: workout.items.map((it, slotIndex) => ({
          slotIndex,
          exerciseId: it.exerciseId,
          sets: it.sets,
          repMin: it.repMin,
          repMax: it.repMax,
          kind: 'compound',
        })),
        skippedSlots: [],
      });
      workout.items.forEach((it, slotIndex) => {
        for (let k = 0; k < it.sets; k++) {
          sets.push(
            set(id, slotIndex, k, it.exerciseId, {
              weight: 100 + i,
              reps: 8,
              completedAt: new Date(start + (slotIndex + 1) * 300000).toISOString(),
            }),
          );
        }
      });
    }
    await db.sessions.bulkPut(sessions);
    await db.sets.bulkPut(sets);
    const v1 = JSON.stringify(await exportBackup(), null, 2).length;
    const v2 = (await exportBackupText()).length;
    expect(v2).toBeLessThan(v1 / 4);
  });

  it('serialises one entry per line and stays valid JSON', async () => {
    await populate();
    const text = await exportBackupText();
    expect(() => JSON.parse(text)).not.toThrow();
    expect(text.split('\n').length).toBeLessThan(80);
    const again = serializeBackupV2(encodeBackupV2(await exportBackup()));
    const strip = (t: string) => t.replace(/"exportedAt":"[^"]*"/, '');
    expect(strip(again)).toBe(strip(text));
  });
});

describe('backup import compatibility', () => {
  const v1 = {
    app: 'trakr',
    backupVersion: 1,
    exportedAt: '2026-03-10T00:00:00.000Z',
    programs: [
      {
        schemaVersion: 1,
        id: 'p1',
        name: 'P1',
        schedule: ['w1', 'rest'],
        exercises: [
          {
            id: 'squat',
            name: 'Squat',
            equipment: 'barbell',
            kind: 'compound',
            load: 'total',
            muscles: ['quads'],
          },
        ],
        workouts: [
          {
            id: 'w1',
            name: 'W1',
            items: [
              { exerciseId: 'squat', sets: 3, repMin: 5, repMax: 5, notes: '', alternatives: [] },
            ],
          },
        ],
        isActive: 1,
        importedAt: '2026-03-01T00:00:00.000Z',
      },
    ],
    exercises: [
      {
        id: 'squat',
        name: 'Squat',
        equipment: 'barbell',
        kind: 'compound',
        load: 'total',
        muscles: ['quads'],
      },
    ],
    sessions: [
      {
        id: 'sess-a',
        programId: 'p1',
        workoutId: 'w1',
        workoutName: 'W1',
        startedAt: '2026-03-09T10:00:00.000Z',
        finishedAt: '2026-03-09T11:00:00.000Z',
        status: 'completed',
        targets: [
          { slotIndex: 0, exerciseId: 'squat', sets: 3, repMin: 5, repMax: 5, kind: 'compound' },
        ],
      },
    ],
    sets: [0, 1, 2].map((i) => ({
      id: `set-${i}`,
      sessionId: 'sess-a',
      exerciseId: 'squat',
      slotIndex: 0,
      setIndex: i,
      weight: 225,
      unit: 'lb',
      reps: 5,
      isWarmup: false,
      completedAt: '2026-03-09T10:20:00.000Z',
    })),
    activities: [],
    settings: { unit: 'lb', theme: 'system' },
  };

  it('still imports v1 backups with their original ids', async () => {
    const parsed = parseBackup(JSON.stringify(v1));
    expect(parsed.ok && parsed.version).toBe(1);
    await importBackup(v1, 'replace');
    expect((await db.sets.toArray()).map((s) => s.id).sort()).toEqual(['set-0', 'set-1', 'set-2']);
    expect(await db.sessions.count()).toBe(1);
  });

  it('converts v1 to v2 and back without losing anything', async () => {
    await importBackup(v1, 'replace');
    const before = await normalised();
    const text = await exportBackupText();
    expect(text).toContain('225x5*3');
    await wipe();
    await importBackup(text, 'replace');
    expect(await normalised()).toEqual(before);
  });
});

describe('backup v2 validation', () => {
  const base = {
    app: 'trakr',
    backupVersion: 2,
    exportedAt: '2026-03-10T00:00:00.000Z',
    exercises: { squat: { name: 'Squat', equipment: 'barbell', kind: 'compound', muscles: [] } },
    programs: {},
    sessions: [] as unknown[],
    activities: [] as unknown[],
  };
  const session = (log: unknown, extra: object = {}) => ({
    ...base,
    sessions: [
      {
        id: 's',
        program: 'p',
        workout: 'w',
        name: 'W',
        start: T0,
        plan: [['squat', '3x5']],
        log,
        ...extra,
      },
    ],
  });

  const errorsOf = (value: unknown) => {
    const r = parseBackup(value);
    return r.ok ? [] : r.errors;
  };

  it('accepts a minimal hand-written file', () => {
    const r = parseBackup(session([{ slot: 0, sets: ['100x5*2'] }]));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.backup.sets).toHaveLength(2);
      expect(r.backup.sets[0]).toMatchObject({ exerciseId: 'squat', unit: 'lb', completedAt: T0 });
    }
  });

  it('explains a malformed set', () => {
    const [first] = errorsOf(session([{ slot: 0, sets: ['100 by 5'] }]));
    expect(first).toContain('sessions[0].log[0].sets[0]');
    expect(first).toContain('bad set "100 by 5"');
  });

  it('explains unknown exercise references and bad specs', () => {
    expect(errorsOf(session([{ slot: 3, sets: ['100x5'] }]))[0]).toContain('slot 3 is not in plan');
    const bad = {
      ...base,
      programs: { p: { name: 'P', imported: T0, schedule: [], exercises: ['nope'], workouts: [] } },
    };
    expect(errorsOf(bad)[0]).toContain('unknown exercise "nope"');
    expect(errorsOf(session([], { plan: [['squat', 'three sets']] }))[0]).toContain('bad spec');
  });

  it('rejects unsupported versions and wrong structure clearly', () => {
    expect(errorsOf({ ...base, backupVersion: 3 })[0]).toContain('not supported');
    expect(errorsOf({ ...base, sessions: 'nope' })[0]).toContain('sessions');
  });

  it('checks per-set time counts', () => {
    expect(errorsOf(session([{ slot: 0, t: [1, 2, 3], sets: ['100x5'] }]))[0]).toContain(
      '3 times for 1 sets',
    );
  });
});
