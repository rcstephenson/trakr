import type { Program, StoredProgram } from '../../domain/types';
import { nowIso } from '../../lib/dates';
import { db } from '../schema';

export async function getActive(): Promise<StoredProgram | null> {
  return (await db.programs.where('isActive').equals(1).first()) ?? null;
}

export async function list(): Promise<StoredProgram[]> {
  return db.programs.toArray();
}

export async function get(id: string): Promise<StoredProgram | null> {
  return (await db.programs.get(id)) ?? null;
}

/**
 * Saves a program (replacing any with the same id) and upserts its exercises
 * into the catalog. With `activate`, it becomes the only active program;
 * otherwise an existing program keeps its active flag.
 */
export async function save(
  program: Program,
  options: { activate?: boolean } = {},
): Promise<StoredProgram> {
  return db.transaction('rw', db.programs, db.exercises, async () => {
    const existing = await db.programs.get(program.id);
    const activate = options.activate === true;
    if (activate) await db.programs.where('isActive').equals(1).modify({ isActive: 0 });
    const stored: StoredProgram = {
      ...program,
      isActive: activate ? 1 : (existing?.isActive ?? 0),
      importedAt: nowIso(),
    };
    await db.programs.put(stored);
    for (const exercise of program.exercises) {
      const current = await db.exercises.get(exercise.id);
      await db.exercises.put(current?.custom ? { ...exercise, custom: true } : exercise);
    }
    return stored;
  });
}

export async function setActive(id: string): Promise<void> {
  await db.transaction('rw', db.programs, async () => {
    if (!(await db.programs.get(id))) throw new Error(`Program not found: ${id}`);
    await db.programs.where('isActive').equals(1).modify({ isActive: 0 });
    await db.programs.update(id, { isActive: 1 });
  });
}

/** Removes a program. Past sessions keep their snapshotted targets and are untouched. */
export async function remove(id: string): Promise<void> {
  await db.programs.delete(id);
}
