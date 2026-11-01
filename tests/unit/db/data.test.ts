import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../../src/db/schema';
import { ensureSeeded } from '../../../src/db/seed';
import * as programs from '../../../src/db/repositories/programs';
import * as exercises from '../../../src/db/repositories/exercises';
import * as sessions from '../../../src/db/repositories/sessions';
import * as sets from '../../../src/db/repositories/sets';
import * as history from '../../../src/db/repositories/history';
import * as activities from '../../../src/db/repositories/activities';
import * as settings from '../../../src/db/repositories/settings';
import { ActiveSessionExistsError } from '../../../src/db/repositories/sessions';
import { DEFAULT_SETTINGS, type Program } from '../../../src/domain/types';

function makeProgram(id = 'p1'): Program {
  return {
    schemaVersion: 1,
    id,
    name: 'Test',
    schedule: ['a', 'rest', 'b'],
    exercises: [
      {
        id: 'bench',
        name: 'Bench',
        equipment: 'barbell',
        kind: 'compound',
        load: 'total',
        muscles: [],
      },
      {
        id: 'curl',
        name: 'Curl',
        equipment: 'dumbbell',
        kind: 'isolation',
        load: 'per-hand',
        muscles: [],
      },
    ],
    workouts: [
      {
        id: 'a',
        name: 'Workout A',
        items: [
          { exerciseId: 'bench', sets: 3, repMin: 6, repMax: 10, notes: '', alternatives: [] },
          { exerciseId: 'curl', sets: 2, repMin: 10, repMax: 15, notes: '', alternatives: [] },
        ],
      },
      {
        id: 'b',
        name: 'Workout B',
        items: [
          { exerciseId: 'bench', sets: 4, repMin: 5, repMax: 8, notes: '', alternatives: [] },
        ],
      },
    ],
  };
}

async function logSet(
  sessionId: string,
  exerciseId: string,
  setIndex: number,
  extra: Partial<Parameters<typeof sets.add>[0]> = {},
) {
  return sets.add({
    sessionId,
    exerciseId,
    slotIndex: 0,
    setIndex,
    weight: 100,
    unit: 'lb',
    reps: 8,
    ...extra,
  });
}

/** Starts, back-dates and completes a session so ordering is deterministic. */
async function completedSession(workoutId: string, startedAt: string) {
  const s = await sessions.start('p1', workoutId);
  await sessions.update(s.id, { startedAt });
  await sessions.finish(s.id);
  return s;
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  await programs.save(makeProgram(), { activate: true });
});

describe('programs', () => {
  it('saves, activates, lists and upserts exercises into the catalog', async () => {
    expect((await programs.getActive())?.id).toBe('p1');
    expect((await exercises.list()).map((e) => e.id).sort()).toEqual(['bench', 'curl']);
    await programs.save(makeProgram('p2'));
    expect((await programs.get('p2'))?.isActive).toBe(0);
    expect(await programs.list()).toHaveLength(2);
    await programs.setActive('p2');
    expect((await programs.getActive())?.id).toBe('p2');
    expect((await programs.get('p1'))?.isActive).toBe(0);
    await programs.remove('p2');
    expect(await programs.get('p2')).toBeNull();
    expect(await programs.getActive()).toBeNull();
  });

  it('re-saving keeps the active flag', async () => {
    await programs.save({ ...makeProgram(), name: 'Renamed' });
    const p = await programs.getActive();
    expect(p?.name).toBe('Renamed');
  });

  it('setActive throws for unknown ids', async () => {
    await expect(programs.setActive('nope')).rejects.toThrow();
  });
});

describe('exercises', () => {
  it('upserts custom exercises', async () => {
    await exercises.upsert({
      id: 'x',
      name: 'Mine',
      equipment: 'other',
      kind: 'isolation',
      load: 'total',
      muscles: [],
      custom: true,
    });
    expect((await exercises.get('x'))?.custom).toBe(true);
    await exercises.upsert({
      id: 'x',
      name: 'Mine 2',
      equipment: 'other',
      kind: 'isolation',
      load: 'total',
      muscles: [],
      custom: true,
    });
    expect((await exercises.get('x'))?.name).toBe('Mine 2');
    expect(await exercises.get('missing')).toBeNull();
  });
});

describe('sessions', () => {
  it('start snapshots targets with exercise kind', async () => {
    const s = await sessions.start('p1', 'a');
    expect(s.status).toBe('active');
    expect(s.workoutName).toBe('Workout A');
    expect(s.targets).toEqual([
      { slotIndex: 0, exerciseId: 'bench', sets: 3, repMin: 6, repMax: 10, kind: 'compound' },
      { slotIndex: 1, exerciseId: 'curl', sets: 2, repMin: 10, repMax: 15, kind: 'isolation' },
    ]);
    expect((await sessions.getActive())?.id).toBe(s.id);
    expect((await sessions.get(s.id))?.id).toBe(s.id);
  });

  it('start throws ActiveSessionExistsError when one is active', async () => {
    await sessions.start('p1', 'a');
    await expect(sessions.start('p1', 'b')).rejects.toBeInstanceOf(ActiveSessionExistsError);
  });

  it('start throws for unknown program or workout', async () => {
    await expect(sessions.start('nope', 'a')).rejects.toThrow();
    await expect(sessions.start('p1', 'nope')).rejects.toThrow();
  });

  it('snapshot is unaffected by later program edits', async () => {
    const s = await sessions.start('p1', 'a');
    const edited = makeProgram();
    edited.workouts[0].items = [
      { exerciseId: 'curl', sets: 9, repMin: 1, repMax: 2, notes: '', alternatives: [] },
    ];
    edited.workouts[0].name = 'Changed';
    await programs.save(edited);
    const after = await sessions.get(s.id);
    expect(after?.targets).toEqual(s.targets);
    expect(after?.workoutName).toBe('Workout A');
  });

  it('finish, discard and update change status', async () => {
    const s = await sessions.start('p1', 'a');
    const updated = await sessions.update(s.id, { notes: 'hi', bodyweight: 180 });
    expect(updated.notes).toBe('hi');
    const done = await sessions.finish(s.id);
    expect(done.status).toBe('completed');
    expect(done.finishedAt).toBeTruthy();
    expect(await sessions.getActive()).toBeNull();
    const s2 = await sessions.start('p1', 'b');
    expect((await sessions.discard(s2.id)).status).toBe('discarded');
    await expect(sessions.update('missing', {})).rejects.toThrow();
  });

  it('swapExercise updates the slot target and its kind', async () => {
    await exercises.upsert({
      id: 'cable-curl',
      name: 'Cable Curl',
      equipment: 'cable',
      kind: 'isolation',
      load: 'total',
      muscles: [],
    });
    const s = await sessions.start('p1', 'a');
    const swapped = await sessions.swapExercise(s.id, 0, 'cable-curl');
    expect(swapped.targets[0]).toMatchObject({
      exerciseId: 'cable-curl',
      kind: 'isolation',
      sets: 3,
    });
    expect((await sessions.get(s.id))?.targets[1].exerciseId).toBe('curl');
  });

  it('list filters by range and status, newest first', async () => {
    const s1 = await completedSession('a', '2026-01-01T10:00:00.000Z');
    const s2 = await completedSession('b', '2026-02-01T10:00:00.000Z');
    const s3 = await sessions.start('p1', 'a');
    await sessions.update(s3.id, { startedAt: '2026-03-01T10:00:00.000Z' });
    expect((await sessions.list()).map((s) => s.id)).toEqual([s3.id, s2.id, s1.id]);
    expect((await sessions.list({ status: 'completed' })).map((s) => s.id)).toEqual([s2.id, s1.id]);
    expect(
      (
        await sessions.list({ from: '2026-01-15T00:00:00.000Z', to: '2026-02-15T00:00:00.000Z' })
      ).map((s) => s.id),
    ).toEqual([s2.id]);
  });

  it('remove cascades to its sets only', async () => {
    const s1 = await completedSession('a', '2026-01-01T10:00:00.000Z');
    const s2 = await completedSession('a', '2026-01-02T10:00:00.000Z');
    await logSet(s1.id, 'bench', 0);
    await logSet(s1.id, 'bench', 1);
    await logSet(s2.id, 'bench', 0);
    await sessions.remove(s1.id);
    expect(await sessions.get(s1.id)).toBeNull();
    expect(await sets.listBySession(s1.id)).toHaveLength(0);
    expect(await sets.listBySession(s2.id)).toHaveLength(1);
    expect(await db.sets.count()).toBe(1);
  });
});

describe('sets', () => {
  it('add defaults, update, remove and list orderings', async () => {
    const s = await sessions.start('p1', 'a');
    const second = await logSet(s.id, 'curl', 0, { slotIndex: 1 });
    const b = await logSet(s.id, 'bench', 1);
    const a = await logSet(s.id, 'bench', 0);
    expect(a.isWarmup).toBe(false);
    expect(a.id).toBeTruthy();
    expect(a.completedAt).toBeTruthy();
    expect((await sets.listBySession(s.id)).map((x) => x.id)).toEqual([a.id, b.id, second.id]);
    expect((await sets.update(a.id, { weight: 105, rir: 2 })).weight).toBe(105);
    await expect(sets.update('missing', {})).rejects.toThrow();
    expect((await sets.listByExercise('bench')).map((x) => x.id).sort()).toEqual(
      [a.id, b.id].sort(),
    );
    await sets.remove(a.id);
    expect(await sets.listByExercise('bench')).toHaveLength(1);
  });
});

describe('history.lastPerformance', () => {
  it('returns null with no history', async () => {
    expect(await history.lastPerformance('bench')).toBeNull();
  });

  it('finds the latest completed session across different workouts', async () => {
    const a = await completedSession('a', '2026-01-01T10:00:00.000Z');
    await logSet(a.id, 'bench', 1, { weight: 100, reps: 8 });
    await logSet(a.id, 'bench', 0, { weight: 100, reps: 9 });
    const b = await completedSession('b', '2026-01-05T10:00:00.000Z');
    await logSet(b.id, 'bench', 0, { weight: 110, reps: 6 });
    const result = await history.lastPerformance('bench');
    expect(result?.session.id).toBe(b.id);
    expect(result?.sets.map((s) => s.weight)).toEqual([110]);
    const older = await history.lastPerformance('bench', { excludeSessionId: b.id });
    expect(older?.session.id).toBe(a.id);
    expect(older?.sets.map((s) => s.reps)).toEqual([9, 8]);
  });

  it('ignores warm-up-only sessions, strips warm-ups, and skips non-completed sessions', async () => {
    const a = await completedSession('a', '2026-01-01T10:00:00.000Z');
    await logSet(a.id, 'bench', 0, { weight: 100 });
    await logSet(a.id, 'bench', 1, { weight: 45, isWarmup: true });
    const warmOnly = await completedSession('b', '2026-01-05T10:00:00.000Z');
    await logSet(warmOnly.id, 'bench', 0, { weight: 45, isWarmup: true });
    const active = await sessions.start('p1', 'a');
    await sessions.update(active.id, { startedAt: '2026-01-09T10:00:00.000Z' });
    await logSet(active.id, 'bench', 0, { weight: 200 });
    const result = await history.lastPerformance('bench');
    expect(result?.session.id).toBe(a.id);
    expect(result?.sets).toHaveLength(1);
    expect(result?.sets[0].weight).toBe(100);
  });

  it('excludes the current session even when it is completed', async () => {
    const a = await completedSession('a', '2026-01-01T10:00:00.000Z');
    await logSet(a.id, 'bench', 0);
    expect(await history.lastPerformance('bench', { excludeSessionId: a.id })).toBeNull();
  });

  it('forExercise returns completed sessions oldest first with warm-ups', async () => {
    const b = await completedSession('b', '2026-01-05T10:00:00.000Z');
    await logSet(b.id, 'bench', 0);
    const a = await completedSession('a', '2026-01-01T10:00:00.000Z');
    await logSet(a.id, 'bench', 0, { isWarmup: true });
    const result = await history.forExercise('bench');
    expect(result.map((r) => r.session.id)).toEqual([a.id, b.id]);
    expect(result[0].sets[0].isWarmup).toBe(true);
  });
});

describe('activities', () => {
  it('add, get, update, remove and list by range newest first', async () => {
    const a1 = await activities.add({
      type: 'run',
      startedAt: '2026-01-01T08:00:00.000Z',
      durationMin: 28,
      distance: 5,
      distanceUnit: 'km',
    });
    const a2 = await activities.add({ type: 'class', startedAt: '2026-02-01T08:00:00.000Z' });
    expect((await activities.get(a1.id))?.distance).toBe(5);
    expect((await activities.update(a2.id, { title: 'Yoga' })).title).toBe('Yoga');
    await expect(activities.update('missing', {})).rejects.toThrow();
    expect((await activities.list()).map((a) => a.id)).toEqual([a2.id, a1.id]);
    expect((await activities.list({ to: '2026-01-15T00:00:00.000Z' })).map((a) => a.id)).toEqual([
      a1.id,
    ]);
    await activities.remove(a1.id);
    expect(await activities.get(a1.id)).toBeNull();
  });
});

describe('settings', () => {
  it('returns defaults when nothing is stored', async () => {
    expect(await settings.get()).toEqual(DEFAULT_SETTINGS);
  });

  it('persists updates and merges them over defaults', async () => {
    await settings.update({ unit: 'kg' });
    expect((await settings.get()).unit).toBe('kg');
    await settings.update({ theme: 'dark' });
    expect(await settings.get()).toMatchObject({ unit: 'kg', theme: 'dark' });
  });

  it('fills defaults for missing fields and drops keys from older versions', async () => {
    await db.settings.put({
      key: 'app',
      unit: 'kg',
      increments: { barbell: 10 },
      restTimerEnabled: false,
    } as never);
    const s = await settings.get();
    expect(s).toEqual({ ...DEFAULT_SETTINGS, unit: 'kg' });
    expect(s).not.toHaveProperty('increments');
    expect(s).not.toHaveProperty('restTimerEnabled');
  });
});

describe('ensureSeeded', () => {
  it('seeds exactly once, even when called concurrently', async () => {
    await db.delete();
    await db.open();
    const results = await Promise.all([ensureSeeded(), ensureSeeded()]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await ensureSeeded()).toBe(false);
    const all = await programs.list();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('v-taper-upper-lower');
    expect((await programs.getActive())?.id).toBe('v-taper-upper-lower');
    expect((await exercises.list()).length).toBeGreaterThan(0);
    expect(await settings.get()).toEqual(DEFAULT_SETTINGS);
  });

  it('does not reseed or overwrite settings when programs exist', async () => {
    await settings.update({ unit: 'kg' });
    expect(await ensureSeeded()).toBe(false);
    expect((await settings.get()).unit).toBe('kg');
  });
});
