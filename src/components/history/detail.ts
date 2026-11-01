import type { SetEntry } from '../../domain/types';

export interface SetGroup {
  key: string;
  slotIndex: number;
  exerciseId: string;
  sets: SetEntry[];
}

/**
 * Groups a session's sets by slot + exercise, ordered by slot. Sets logged before an exercise
 * swap stay in their own group (same slot, old exerciseId), ordered by first set.
 */
export function groupSets(sets: ReadonlyArray<SetEntry>): SetGroup[] {
  const groups = new Map<string, SetGroup>();
  const ordered = [...sets].sort(
    (a, b) =>
      a.slotIndex - b.slotIndex ||
      a.completedAt.localeCompare(b.completedAt) ||
      a.setIndex - b.setIndex,
  );
  for (const s of ordered) {
    const key = `${s.slotIndex}:${s.exerciseId}`;
    const g = groups.get(key);
    if (g) g.sets.push(s);
    else groups.set(key, { key, slotIndex: s.slotIndex, exerciseId: s.exerciseId, sets: [s] });
  }
  const result = [...groups.values()];
  for (const g of result) g.sets.sort((a, b) => a.setIndex - b.setIndex);
  return result;
}

const SLOT_NOTE = /^Exercise \d+: /;

/** Session notes with the per-exercise `Exercise N: …` lines removed. */
export function freeNotes(notes: string | undefined): string[] {
  return (notes ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !SLOT_NOTE.test(l));
}
