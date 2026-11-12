import type { Unit } from './types';

const KG_PER_LB = 0.45359237;

/** Exact conversion between units. Rounding is left to `formatWeight`. */
export function convert(value: number, from: Unit, to: Unit): number {
  if (from === to) return value;
  return from === 'lb' ? value * KG_PER_LB : value / KG_PER_LB;
}

/** Copy of `set` with its weight expressed in `displayUnit` (unrounded). */
export function toUnit<T extends { weight: number; unit: Unit }>(set: T, displayUnit: Unit): T {
  if (set.unit === displayUnit) return set;
  return { ...set, weight: convert(set.weight, set.unit, displayUnit), unit: displayUnit };
}

/** Round to 1 lb or 0.5 kg. */
export function roundForDisplay(value: number, unit: Unit): number {
  return unit === 'kg' ? Math.round(value * 2) / 2 : Math.round(value);
}

function formatNumber(n: number): string {
  return String(Number(n.toFixed(2)));
}

export interface FormatWeightOptions {
  /** Dumbbell-style load: shown as "30 lb ea". */
  perHand?: boolean;
  /** Added load on bodyweight: "BW + 25 lb", or "BW" when zero. */
  bodyweightPlus?: boolean;
}

/**
 * Display string for a stored weight. Values entered in the display unit are shown as entered
 * (fractions kept); converted values are rounded to 1 lb / 0.5 kg.
 */
export function formatWeight(
  value: number,
  storedUnit: Unit,
  displayUnit: Unit,
  options: FormatWeightOptions = {},
): string {
  const shown =
    storedUnit === displayUnit
      ? value
      : roundForDisplay(convert(value, storedUnit, displayUnit), displayUnit);
  if (options.bodyweightPlus) {
    return shown === 0 ? 'BW' : `BW + ${formatNumber(shown)} ${displayUnit}`;
  }
  const base = `${formatNumber(shown)} ${displayUnit}`;
  return options.perHand ? `${base} ea` : base;
}
