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
 * Prefill for set `setIndex` (0-based) from the last performance's working sets (SPEC 6.1):
 * the same set number if it exists, otherwise the last set repeated, otherwise nothing.
 * Values are never adjusted, only converted to the display unit.
 */
export function prefillForSet(
  lastSets: ReadonlyArray<LoggedSet> | null | undefined,
  setIndex: number,
  displayUnit: Unit,
): SetValues | null {
  if (!lastSets || lastSets.length === 0) return null;
  const source = lastSets[Math.min(setIndex, lastSets.length - 1)];
  return { weight: weightInUnit(source, displayUnit), reps: source.reps };
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

const NOTE_LINE = /^Exercise (\d+): (.*)$/;

/** Per-exercise notes live in `Session.notes`, one `Exercise N: text` line per slot (1-based). */
export function readSlotNotes(notes: string | undefined): Record<number, string> {
  const result: Record<number, string> = {};
  for (const line of (notes ?? '').split('\n')) {
    const m = NOTE_LINE.exec(line);
    if (m) result[Number(m[1]) - 1] = m[2];
  }
  return result;
}

/** Returns the new `Session.notes` with the slot's note replaced; other text is preserved. */
export function writeSlotNote(
  notes: string | undefined,
  slotIndex: number,
  text: string,
): string | undefined {
  const prefix = `Exercise ${slotIndex + 1}: `;
  const lines = (notes ?? '').split('\n').filter((l) => l !== '' && !l.startsWith(prefix));
  const clean = text.replace(/\s*\n\s*/g, ' ').trim();
  if (clean) lines.push(prefix + clean);
  lines.sort((a, b) => {
    const ma = NOTE_LINE.exec(a);
    const mb = NOTE_LINE.exec(b);
    return (ma ? Number(ma[1]) : 0) - (mb ? Number(mb[1]) : 0);
  });
  return lines.length > 0 ? lines.join('\n') : undefined;
}
