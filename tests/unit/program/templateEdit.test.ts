import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../../src/db/schema';
import { ensureSeeded } from '../../../src/db/seed';
import * as programs from '../../../src/db/repositories/programs';
import * as sessions from '../../../src/db/repositories/sessions';

describe('editing a template', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await ensureSeeded();
  });

  it('changes the next session but not an earlier one', async () => {
    const before = await sessions.start('5day-upperlower-rev2', 'upper-a');
    await sessions.finish(before.id);

    const program = (await programs.getActive())!;
    const workouts = program.workouts.map((w) =>
      w.id === 'upper-a' ? { ...w, items: [...w.items].reverse() } : w,
    );
    await programs.save({ ...program, workouts });

    const after = await sessions.start('5day-upperlower-rev2', 'upper-a');
    expect(after.targets[0].exerciseId).toBe('dumbbell-curl');
    expect((await sessions.get(before.id))!.targets[0].exerciseId).toBe('barbell-bench-press');
  });
});
