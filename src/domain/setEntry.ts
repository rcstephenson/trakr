import { convert, roundForDisplay } from './units';
import type { LoadType, Unit } from './types';

export type SetEntryResult =
  { ok: true; weight: number; reps: number; unit: Unit } | { ok: false; hint: string };

export interface SetEntryOptions {
  load: LoadType;
  /** The display unit: the unit of the returned weight. */
  unit: Unit;
}

const MAX_WEIGHT = 10000;
const MAX_REPS = 999;

const NUM = String.raw`(?:\d+(?:\.\d+)?|\.\d+)`;
const SPLIT_RE = /^(.*?)(?:\s*[x×*]\s*|\s+)(\d+)$/;
const WEIGHT_RE = new RegExp(String.raw`^(\+?)\s*(${NUM})\s*(lbs?|kg)?$`);
const BW_PLUS_RE = new RegExp(String.raw`^bw\s*\+\s*(${NUM})\s*(lbs?|kg)?$`);
const REPS_RE = /^\d+$/;

function hintFor(load: LoadType): string {
  switch (load) {
    case 'none':
      return 'reps (e.g. 12)';
    case 'bodyweight-plus':
      return 'added x reps, or bw x reps';
    default:
      return 'weight x reps';
  }
}

function suffixUnit(suffix: string | undefined): Unit | undefined {
  if (!suffix) return undefined;
  return suffix === 'kg' ? 'kg' : 'lb';
}

function toDisplayUnit(value: number, from: Unit | undefined, unit: Unit): number {
  if (!from || from === unit) return value;
  return roundForDisplay(convert(value, from, unit), unit);
}

/**
 * Parses one set's text (`135 x 8`) into numbers in the display unit. Anything that does not
 * match the grammar in SPEC 6.1 is rejected with a short hint; this never guesses.
 */
export function parseSetEntry(text: string, options: SetEntryOptions): SetEntryResult {
  const { load, unit } = options;
  const bad: SetEntryResult = { ok: false, hint: hintFor(load) };
  const t = text.trim().toLowerCase();
  if (t === '') return bad;

  const finish = (weight: number, reps: number): SetEntryResult => {
    if (!Number.isFinite(weight) || !Number.isInteger(reps)) return bad;
    if (reps < 1 || reps > MAX_REPS || weight < 0 || weight > MAX_WEIGHT) return bad;
    return { ok: true, weight, reps, unit };
  };

  // Reps only.
  if (REPS_RE.test(t)) {
    return load === 'none' || load === 'bodyweight-plus' ? finish(0, Number(t)) : bad;
  }

  const parts = SPLIT_RE.exec(t);
  if (!parts) return bad;
  const weightPart = parts[1].trim();
  const reps = Number(parts[2]);

  if (load === 'none') {
    // Reps only is the entry; an explicit zero / bodyweight load is harmless, anything else is not.
    return weightPart === 'bw' || /^0+(?:\.0*)?$/.test(weightPart) ? finish(0, reps) : bad;
  }

  if (weightPart === 'bw' || weightPart === 'bodyweight') {
    return load === 'bodyweight-plus' ? finish(0, reps) : bad;
  }

  const bwPlus = BW_PLUS_RE.exec(weightPart);
  if (bwPlus) {
    if (load !== 'bodyweight-plus') return bad;
    return finish(toDisplayUnit(Number(bwPlus[1]), suffixUnit(bwPlus[2]), unit), reps);
  }

  const w = WEIGHT_RE.exec(weightPart);
  if (!w) return bad;
  if (w[1] === '+' && load !== 'bodyweight-plus') return bad;
  return finish(toDisplayUnit(Number(w[2]), suffixUnit(w[3]), unit), reps);
}

function num(n: number): string {
  return String(Number(n.toFixed(2)));
}

/**
 * Canonical text for a set: `135 x 8`. With `load` given, load `none` is reps only (`12`) and a
 * bodyweight-plus set with no added weight is `bw x 12`.
 */
export function formatSetEntry(weight: number, reps: number, load?: LoadType): string {
  if (load === 'none') return String(reps);
  if (load === 'bodyweight-plus' && weight === 0) return `bw x ${reps}`;
  return `${num(weight)} x ${reps}`;
}
