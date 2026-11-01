import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../../src/db/schema';
import { ensureSeeded } from '../../../src/db/seed';
import * as programs from '../../../src/db/repositories/programs';
import * as sessions from '../../../src/db/repositories/sessions';
import * as settings from '../../../src/db/repositories/settings';
import { DEFAULT_SETTINGS } from '../../../src/domain/types';

/** An IndexedDB written by the pre-redesign build still works (rest timers, increments). */
describe('legacy rows from the earlier build', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('loads settings with increments / restTimer keys and a program with restSeconds', async () => {
    await db.settings.put({
      key: 'app',
      unit: 'kg',
      theme: 'dark',
      increments: { barbell: 5, dumbbell: 5, cable: 2.5, machine: 5, bodyweight: 5, other: 5 },
      restTimerEnabled: true,
      restTimerSound: false,
    } as never);
    await db.programs.put({
      schemaVersion: 1,
      id: 'old',
      name: 'Old',
      schedule: ['a'],
      exercises: [
        {
          id: 'bench',
          name: 'Bench',
          equipment: 'barbell',
          kind: 'compound',
          load: 'total',
          muscles: [],
        },
      ],
      workouts: [
        { id: 'a', name: 'A', items: [{ exerciseId: 'bench', sets: 3, repMin: 5, repMax: 8 }] },
      ],
      restSeconds: { compound: 150, isolation: 75 },
      isActive: 1,
      importedAt: new Date().toISOString(),
    } as never);

    expect(await settings.get()).toEqual({ ...DEFAULT_SETTINGS, unit: 'kg', theme: 'dark' });
    await ensureSeeded();
    const active = await programs.getActive();
    expect(active?.id).toBe('old');
    const session = await sessions.start('old', 'a');
    expect(session.targets).toHaveLength(1);
    // Saving a setting rewrites the row without the legacy keys.
    await settings.update({ unit: 'lb' });
    const row = await db.settings.get('app');
    expect(row).not.toHaveProperty('increments');
    expect(row).not.toHaveProperty('restTimerEnabled');
    expect(row).not.toHaveProperty('restTimerSound');
  });
});
