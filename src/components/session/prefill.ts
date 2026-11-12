import { formatWeightText } from '../../domain/setEntry';
import { convert, formatWeight, roundForDisplay } from '../../domain/units';
import type { Exercise, Unit } from '../../domain/types';

interface LoggedSet {
  weight: number;
  reps: number;
  unit: Unit;
}

export interface SetValues {
  weight: number;
  reps: number;
}

/** A stored weight expressed in the display unit (rounded only when converting). */
export function weightInUnit(set: Pick<LoggedSet, 'weight' | 'unit'>, displayUnit: Unit): number {
  if (set.unit === displayUnit) return set.weight;
  return roundForDisplay(convert(set.weight, set.unit, displayUnit), displayUnit);
}

/**
 * Prefill for an exercise: the previous session's first working set, converted to the
 * display unit and otherwise unadjusted. `lastSets` are already working sets sorted by setIndex.
 */
export function prefillFromLast(
  lastSets: ReadonlyArray<LoggedSet> | null | undefined,
  displayUnit: Unit,
): SetValues | null {
  if (!lastSets || lastSets.length === 0) return null;
  return { weight: weightInUnit(lastSets[0], displayUnit), reps: lastSets[0].reps };
}

/** The set that stands for an exercise's single entry: its first working set (else its first set). */
export function entrySet<T extends { isWarmup: boolean; setIndex: number }>(
  slotSets: ReadonlyArray<T>,
): T | undefined {
  const sorted = [...slotSets].sort((a, b) => a.setIndex - b.setIndex);
  return sorted.find((s) => !s.isWarmup) ?? sorted[0];
}

/** True when every set has the same weight, unit and reps. */
export function allIdentical(sets: ReadonlyArray<LoggedSet>): boolean {
  return sets.every(
    (s) => s.weight === sets[0].weight && s.unit === sets[0].unit && s.reps === sets[0].reps,
  );
}

type LoadInfo = Pick<Exercise, 'load'> | undefined;

/** "135 lb × 8, 8, 7 · 140 lb × 5": consecutive sets with the same weight are grouped. */
export function formatSets(
  sets: ReadonlyArray<LoggedSet>,
  displayUnit: Unit,
  exercise: LoadInfo,
): string {
  const groups: { key: string; weight: number; unit: Unit; reps: number[] }[] = [];
  for (const s of sets) {
    const key = `${s.weight}${s.unit}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.reps.push(s.reps);
    else groups.push({ key, weight: s.weight, unit: s.unit, reps: [s.reps] });
  }
  return groups
    .map((g) => {
      const reps = g.reps.join(', ');
      if (exercise?.load === 'none') return `${reps} reps`;
      const w = formatWeight(g.weight, g.unit, displayUnit, {
        perHand: exercise?.load === 'per-hand',
        bodyweightPlus: exercise?.load === 'bodyweight-plus',
      });
      return `${w} × ${reps}`;
    })
    .join(' · ');
}

/**
 * The compact LAST line: identical working sets collapse to one entry ("105 x 9"); differing sets
 * are listed as in `formatSets` ("135 lb � 8 � 145 lb � 6").
 */
export function formatLast(
  sets: ReadonlyArray<LoggedSet>,
  displayUnit: Unit,
  exercise: LoadInfo,
): string {
  if (sets.length === 0) return '';
  if (!allIdentical(sets)) return formatSets(sets, displayUnit, exercise);
  const s = sets[0];
  if (exercise?.load === 'none') return `${s.reps} reps`;
  const w = weightInUnit(s, displayUnit);
  if (exercise?.load === 'bodyweight-plus')
    return `${formatWeightText(w, 'bodyweight-plus')} x ${s.reps}`;
  return `${formatWeightText(w)} x ${s.reps}`;
}

const NOTE_LINE = /^Exercise (\d+): (.*)$/;

/** Legacy per-exercise notes live in `Session.notes`, one `Exercise N: text` line per slot (1-based). */
export function readSlotNotes(notes: string | undefined): Record<number, string> {
  const result: Record<number, string> = {};
  for (const line of (notes ?? '').split('\n')) {
    const m = NOTE_LINE.exec(line);
    if (m) result[Number(m[1]) - 1] = m[2];
  }
  return result;
}
