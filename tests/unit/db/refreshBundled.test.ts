import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../../src/db/schema';
import { DEFAULT_PROGRAM } from '../../../src/db/bundled';
import { ensureSeeded, refreshBundledPrograms } from '../../../src/db/seed';
import * as programs from '../../../src/db/repositories/programs';
import * as sessions from '../../../src/db/repositories/sessions';
import type { Program } from '../../../src/domain/types';

/** The bundled program as an older app version stored it: old description, no primary flags. */
function outdatedCopy(): Program {
  return {
    ...DEFAULT_PROGRAM,
    name: '5day-UpperLower-rev2',
    description: '5-day upper/lower + full body. V-taper emphasis with glute priority.',
    notes: '**Goal:** Lean muscle, V-taper emphasis\n\nOld notes',
    workouts: DEFAULT_PROGRAM.workouts.map((w) => ({
      ...w,
      items: w.items.map((item) => {
        const copy = { ...item };
        delete copy.primary;
        return copy;
      }),
    })),
  };
}

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('refreshBundledPrograms', () => {
  it('refreshes stored text and primary flags of the bundled program from the app', async () => {
    await programs.save(outdatedCopy(), { activate: true });
    await refreshBundledPrograms();
    const stored = (await programs.get(DEFAULT_PROGRAM.id))!;
    expect(stored.name).toBe(DEFAULT_PROGRAM.name);
    expect(stored.description).toBe(DEFAULT_PROGRAM.description);
    expect(stored.notes).toBe(DEFAULT_PROGRAM.notes);
    expect(JSON.stringify(stored)).not.toMatch(/v-?taper/i);
    const upperA = stored.workouts.find((w) => w.id === 'upper-a')!;
    expect(upperA.items.filter((i) => i.primary).map((i) => i.exerciseId)).toEqual([
      'barbell-bench-press',
      'chest-supported-row',
      'lat-pulldown',
    ]);
    expect(stored.isActive).toBe(1);
  });

  it('keeps workouts the user edited: only matching slots get primary flags', async () => {
    const edited = outdatedCopy();
    const upperA = edited.workouts.find((w) => w.id === 'upper-a')!;
    upperA.items = [...upperA.items].reverse(); // user reordered Upper A in the editor
    await programs.save(edited, { activate: true });
    await refreshBundledPrograms();
    const stored = (await programs.get(DEFAULT_PROGRAM.id))!;
    const storedUpperA = stored.workouts.find((w) => w.id === 'upper-a')!;
    expect(storedUpperA.items.map((i) => i.exerciseId)).toEqual(
      upperA.items.map((i) => i.exerciseId),
    );
    // Reversed 7 items: only the middle slot (index 3) still holds the same exercise, not a primary.
    expect(storedUpperA.items.some((i) => i.primary)).toBe(false);
  });

  it('neutralises retired bundled programs without touching their workouts or sessions', async () => {
    await ensureSeeded();
    const retired: Program = {
      ...DEFAULT_PROGRAM,
      id: 'v-taper-upper-lower',
      name: 'V-Taper Hypertrophy — Upper/Lower',
      description: 'Lean muscle, V-taper/hourglass emphasis.',
      notes:
        '**Goal:** Lean muscle, V-taper/hourglass emphasis\n**Priority muscles:** Lateral delts',
    };
    await programs.save(retired);
    const s = await sessions.start('v-taper-upper-lower', 'upper-a');
    await sessions.finish(s.id);

    await refreshBundledPrograms();
    const stored = (await programs.get('v-taper-upper-lower'))!;
    expect(stored.name).toBe('Upper/Lower (4-day)');
    // Displayed text only: the id stays, since sessions reference it and it's never shown.
    expect(`${stored.name}\n${stored.description}\n${stored.notes}`).not.toMatch(
      /v-?taper|hourglass/i,
    );
    expect(stored.notes).toBe('**Priority muscles:** Lateral delts');
    expect(stored.workouts).toEqual(retired.workouts);
    expect((await sessions.list()).map((x) => x.programId)).toEqual(['v-taper-upper-lower']);
  });

  it('leaves other programs alone and does not rewrite an up-to-date copy', async () => {
    await ensureSeeded();
    const custom: Program = {
      ...DEFAULT_PROGRAM,
      id: 'my-program',
      name: 'Mine',
      notes: 'V-taper!',
    };
    await programs.save(custom);
    const before = await db.programs.toArray();
    await refreshBundledPrograms();
    expect(await db.programs.toArray()).toEqual(before);
  });
});
