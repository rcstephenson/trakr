import { formatWeight } from '../../domain/units';
import type { Exercise, SessionTarget, SetEntry, Unit } from '../../domain/types';

interface SetLike {
  weight: number;
  reps: number;
  unit: Unit;
}

/** True when there is more than one set and they all share weight, unit and reps. */
export function isUniformRun(sets: ReadonlyArray<SetLike>): boolean {
  return (
    sets.length > 1 &&
    sets.every(
      (s) => s.weight === sets[0].weight && s.unit === sets[0].unit && s.reps === sets[0].reps,
    )
  );
}

/** "3 × 100 lb × 8" (or "3 × 12 reps" for load none) for a run of identical working sets. */
export function formatUniformRun(
  sets: ReadonlyArray<SetLike>,
  exercise: Pick<Exercise, 'load'> | undefined,
  displayUnit: Unit,
): string {
  const s = sets[0];
  if (exercise?.load === 'none') return `${sets.length} × ${s.reps} reps`;
  const w = formatWeight(s.weight, s.unit, displayUnit, {
    perHand: exercise?.load === 'per-hand',
    bodyweightPlus: exercise?.load === 'bodyweight-plus',
  });
  return `${sets.length} × ${w} × ${s.reps}`;
}

export interface SetGroup {
  key: string;
  slotIndex: number;
  exerciseId: string;
  sets: SetEntry[];
  /** Template rep minimum, only on placeholder groups that have no logged sets. */
  repMin?: number;
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

/**
 * Adds an empty group for every template slot with no logged sets, so edit mode can add sets
 * back to an exercise whose sets were all deleted. Slots that already have a group are left alone.
 */
export function withEmptySlots(
  groups: ReadonlyArray<SetGroup>,
  targets: ReadonlyArray<SessionTarget>,
): SetGroup[] {
  const filled = new Set(groups.map((g) => g.slotIndex));
  const empty: SetGroup[] = targets
    .filter((t) => !filled.has(t.slotIndex))
    .map((t) => ({
      key: `${t.slotIndex}:${t.exerciseId}`,
      slotIndex: t.slotIndex,
      exerciseId: t.exerciseId,
      sets: [],
      repMin: t.repMin,
    }));
  return [...groups, ...empty].sort((a, b) => a.slotIndex - b.slotIndex);
}

const SLOT_NOTE = /^Exercise \d+: /;

/** Session notes with the per-exercise `Exercise N: …` lines removed. */
export function freeNotes(notes: string | undefined): string[] {
  return (notes ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !SLOT_NOTE.test(l));
}
