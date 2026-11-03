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

export interface ExerciseSetsInput {
  sessionId: string;
  slotIndex: number;
  exerciseId: string;
  /** How many identical sets to store (the session target's `sets`). */
  count: number;
  weight: number;
  unit: SetEntry['unit'];
  reps: number;
}

async function deleteSlotSets(
  sessionId: string,
  slotIndex: number,
  exerciseId: string,
): Promise<void> {
  await db.sets
    .where('sessionId')
    .equals(sessionId)
    .filter((s) => s.slotIndex === slotIndex && s.exerciseId === exerciseId)
    .delete();
}

/**
 * One entry per exercise (SPEC 6.1): replaces every set of the slot's exercise in the session with
 * `count` identical working sets (sequential `setIndex`) in one transaction, so logging, editing
 * and normalising legacy sets all use the same write with no duplicates or orphans.
 */
export async function replaceExerciseSets(input: ExerciseSetsInput): Promise<SetEntry[]> {
  const count = Math.max(1, Math.floor(input.count));
  const completedAt = nowIso();
  const entries: SetEntry[] = Array.from({ length: count }, (_, i) => ({
    id: newId(),
    sessionId: input.sessionId,
    exerciseId: input.exerciseId,
    slotIndex: input.slotIndex,
    setIndex: i,
    weight: input.weight,
    unit: input.unit,
    reps: input.reps,
    isWarmup: false,
    completedAt,
  }));
  await db.transaction('rw', db.sets, async () => {
    await deleteSlotSets(input.sessionId, input.slotIndex, input.exerciseId);
    await db.sets.bulkAdd(entries);
  });
  return entries;
}

/** Deletes all of an exercise's sets in a session slot (un-logging the exercise). */
export async function removeExerciseSets(
  sessionId: string,
  slotIndex: number,
  exerciseId: string,
): Promise<void> {
  await db.transaction('rw', db.sets, () => deleteSlotSets(sessionId, slotIndex, exerciseId));
}

/** All sets for an exercise (warm-ups included), oldest first. */
export async function listByExercise(exerciseId: string): Promise<SetEntry[]> {
  return db.sets
    .where('[exerciseId+completedAt]')
    .between([exerciseId, ''], [exerciseId, '￿'], true, true)
    .toArray();
}
