import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../../src/db/schema';
import { ensureSeeded } from '../../../src/db/seed';
import * as sessions from '../../../src/db/repositories/sessions';
import * as sets from '../../../src/db/repositories/sets';
import * as activities from '../../../src/db/repositories/activities';
import * as settings from '../../../src/db/repositories/settings';
import {
  clearAllData,
  exportBackup,
  importBackup,
  parseBackup,
  summarizeBackup,
} from '../../../src/lib/backup';

async function wipe() {
  await Promise.all(db.tables.map((t) => t.clear()));
}

async function seedVaried() {
  await ensureSeeded();
  await settings.update({ unit: 'kg', theme: 'dark', increments: { barbell: 2.5 } });
  const s1 = await sessions.start('v-taper-upper-lower', 'upper-a');
  await sets.add({
    sessionId: s1.id,
    exerciseId: 'barbell-bench-press',
    slotIndex: 0,
    setIndex: 0,
    weight: 135,
    unit: 'lb',
    reps: 8,
    rir: 2,
  });
  await sets.add({
    sessionId: s1.id,
    exerciseId: 'barbell-bench-press',
    slotIndex: 0,
    setIndex: 1,
    weight: 60,
    unit: 'kg',
    reps: 10,
    isWarmup: true,
  });
  await sessions.finish(s1.id);
  await activities.add({
    type: 'run',
    startedAt: '2026-03-01T08:00:00.000Z',
    durationMin: 28,
    distance: 5,
    distanceUnit: 'km',
  });
  await activities.add({ type: 'class', title: 'Yoga', startedAt: '2026-03-05T08:00:00.000Z' });
}

async function snapshot() {
  const b = await exportBackup();
  const { exportedAt: _ignored, ...rest } = b;
  void _ignored;
  return rest;
}

beforeEach(wipe);

describe('backup', () => {
  it('round-trips: export, clear, import with replace restores identical tables', async () => {
    await seedVaried();
    const before = await snapshot();
    const exported = JSON.stringify(await exportBackup());
    expect(before.sessions).toHaveLength(1);
    expect(before.sets).toHaveLength(2);
    expect(before.activities).toHaveLength(2);

    await wipe();
    expect((await snapshot()).sessions).toHaveLength(0);

    await importBackup(exported, 'replace');
    expect(await snapshot()).toEqual(before);
  });

  it('replace discards data that is not in the backup', async () => {
    await seedVaried();
    const json = JSON.stringify(await exportBackup());
    await activities.add({ type: 'walk', startedAt: '2026-04-01T08:00:00.000Z' });
    await importBackup(json, 'replace');
    expect(await db.activities.count()).toBe(2);
  });

  it('merge upserts by id, keeps local-only rows and local settings', async () => {
    await seedVaried();
    const backup = await exportBackup();
    const local = await activities.add({ type: 'walk', startedAt: '2026-04-01T08:00:00.000Z' });
    const [first] = backup.activities;
    const edited = {
      ...backup,
      activities: [{ ...first, title: 'Edited' }, ...backup.activities.slice(1)],
    };
    await settings.update({ unit: 'lb' });

    await importBackup(edited, 'merge');

    expect(await db.activities.count()).toBe(3);
    expect((await db.activities.get(first.id))?.title).toBe('Edited');
    expect(await db.activities.get(local.id)).toBeDefined();
    expect((await settings.get()).unit).toBe('lb');
    expect(await db.programs.where('isActive').equals(1).count()).toBe(1);
    expect(await db.sets.count()).toBe(2);
  });

  it('rejects invalid backups without writing anything', async () => {
    await seedVaried();
    const before = await snapshot();
    expect(parseBackup('not json').ok).toBe(false);
    const bad = { ...(await exportBackup()), backupVersion: 2 };
    await expect(importBackup(bad, 'replace')).rejects.toThrow();
    expect(await snapshot()).toEqual(before);
  });

  it('summarizes counts and date range', async () => {
    await seedVaried();
    const summary = summarizeBackup(await exportBackup());
    expect(summary.counts).toMatchObject({ sessions: 1, sets: 2, activities: 2, programs: 1 });
    expect(summary.dateRange?.from).toBeDefined();
    expect(summary.dateRange!.from <= summary.dateRange!.to).toBe(true);
  });

  it('clearAllData removes user data and reseeds the bundled program and defaults', async () => {
    await seedVaried();
    await clearAllData();
    expect(await db.sessions.count()).toBe(0);
    expect(await db.sets.count()).toBe(0);
    expect(await db.activities.count()).toBe(0);
    expect(await db.programs.count()).toBe(1);
    expect((await settings.get()).unit).toBe('lb');
  });
});
