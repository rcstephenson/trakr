import { convert, roundForDisplay } from './units';
import type { LoadType, Unit } from './types';

/** Which of the two fields a rejected entry is about. */
export type EntryField = 'weight' | 'reps';

export type WeightRepsResult =
  | { ok: true; weight: number; reps: number; unit: Unit }
  | { ok: false; field: EntryField; hint: string };

export interface WeightRepsOptions {
  load: LoadType;
  /** The display unit: the unit of the returned weight. */
  unit: Unit;
}

const MAX_WEIGHT = 10000;
const MAX_REPS = 999;

const NUM = String.raw`(?:\d+(?:\.\d+)?|\.\d+)`;
const WEIGHT_RE = new RegExp(String.raw`^(\+?)\s*(${NUM})\s*(lbs?|kg)?$`);
const BW_PLUS_RE = new RegExp(String.raw`^bw\s*\+\s*(${NUM})\s*(lbs?|kg)?$`);
const REPS_RE = /^\d+$/;

function weightHint(load: LoadType): string {
  return load === 'bodyweight-plus' ? '+25, or bw' : 'weight (e.g. 135)';
}

const REPS_HINT = 'whole reps (e.g. 8)';

function suffixUnit(suffix: string | undefined): Unit | undefined {
  if (!suffix) return undefined;
  return suffix === 'kg' ? 'kg' : 'lb';
}

function toDisplayUnit(value: number, from: Unit | undefined, unit: Unit): number {
  if (!from || from === unit) return value;
  return roundForDisplay(convert(value, from, unit), unit);
}

/**
 * Parses the weight text on its own. Returns the weight in the display unit, or null if it is not
 * acceptable for this load type. Load `none` has no weight (always 0).
 */
function parseWeight(text: string, load: LoadType, unit: Unit): number | null {
  if (load === 'none' || load === 'completion') return 0;
  const t = text.trim().toLowerCase();
  if (load === 'bodyweight-plus' && (t === '' || t === 'bw' || t === 'bodyweight')) return 0;
  if (t === '') return null;

  const bwPlus = BW_PLUS_RE.exec(t);
  if (bwPlus) {
    if (load !== 'bodyweight-plus') return null;
    return check(toDisplayUnit(Number(bwPlus[1]), suffixUnit(bwPlus[2]), unit));
  }
  const w = WEIGHT_RE.exec(t);
  if (!w) return null;
  if (w[1] === '+' && load !== 'bodyweight-plus') return null;
  return check(toDisplayUnit(Number(w[2]), suffixUnit(w[3]), unit));
}

function check(weight: number): number | null {
  return Number.isFinite(weight) && weight >= 0 && weight <= MAX_WEIGHT ? weight : null;
}

/**
 * Validates the two entry fields into numbers in the display unit. Anything outside the
 * rules is rejected with a short hint naming the field; this never guesses.
 * - weight: a non-negative number (`.` decimal), optional `lb`/`kg` suffix (converted). Bodyweight-plus
 *   also takes `+25` (added load) and `bw`/empty/0 (bodyweight). Load `none` ignores the weight.
 * - reps: a whole number from 1 to 999.
 */
export function parseWeightReps(
  weightText: string,
  repsText: string,
  options: WeightRepsOptions,
): WeightRepsResult {
  const { load, unit } = options;
  const weight = parseWeight(weightText, load, unit);
  if (weight === null) return { ok: false, field: 'weight', hint: weightHint(load) };
  const r = repsText.trim();
  const reps = REPS_RE.test(r) ? Number(r) : NaN;
  if (!Number.isInteger(reps) || reps < 1 || reps > MAX_REPS) {
    return { ok: false, field: 'reps', hint: REPS_HINT };
  }
  return { ok: true, weight, reps, unit };
}

const SKIP_MARK = 'x';

/**
 * True when the entry means "skipped" (a null log, no sets): either field is `x`, or every field
 * the load type shows is blank (load `none` has no weight field, so only reps counts).
 */
export function isSkipEntry(weightText: string, repsText: string, load: LoadType): boolean {
  const w = weightText.trim().toLowerCase();
  const r = repsText.trim().toLowerCase();
  if (r === SKIP_MARK || (load !== 'none' && w === SKIP_MARK)) return true;
  return r === '' && (load === 'none' || w === '');
}

function num(n: number): string {
  return String(Number(n.toFixed(2)));
}

/** Canonical weight field text: `135`, `62.5`; bodyweight-plus is `bw` or `+25`; none/completion ''. */
export function formatWeightText(weight: number, load?: LoadType): string {
  if (load === 'none' || load === 'completion') return '';
  if (load === 'bodyweight-plus') return weight === 0 ? 'bw' : `+${num(weight)}`;
  return num(weight);
}

/** Canonical reps field text (a plain integer). */
export function formatRepsText(reps: number): string {
  return String(reps);
}
