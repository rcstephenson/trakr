import type { SetEntry } from '../../domain/types';
import { newId } from '../../lib/ids';
import { nowIso } from '../../lib/dates';
import { db } from '../schema';

export type SetInput = Omit<SetEntry, 'id' | 'completedAt' | 'isWarmup'> & {
  isWarmup?: boolean;
  completedAt?: string;
};

export async function add(input: SetInput): Promise<SetEntry> {
  const entry: SetEntry = {
    ...input,
    id: newId(),
    isWarmup: input.isWarmup ?? false,
    completedAt: input.completedAt ?? nowIso(),
  };
  await db.sets.add(entry);
  return entry;
}

export async function update(id: string, patch: Partial<Omit<SetEntry, 'id'>>): Promise<SetEntry> {
  return db.transaction('rw', db.sets, async () => {
    await db.sets.update(id, patch);
    const entry = await db.sets.get(id);
    if (!entry) throw new Error(`Set not found: ${id}`);
    return entry;
  });
}

export async function remove(id: string): Promise<void> {
  await db.sets.delete(id);
}

/** Sets of a session ordered by slotIndex, then setIndex. */
export async function listBySession(sessionId: string): Promise<SetEntry[]> {
  const rows = await db.sets.where('sessionId').equals(sessionId).toArray();
  return rows.sort((a, b) => a.slotIndex - b.slotIndex || a.setIndex - b.setIndex);
}

/** All sets for an exercise (warm-ups included), oldest first. */
export async function listByExercise(exerciseId: string): Promise<SetEntry[]> {
  return db.sets
    .where('[exerciseId+completedAt]')
    .between([exerciseId, ''], [exerciseId, '￿'], true, true)
    .toArray();
}
