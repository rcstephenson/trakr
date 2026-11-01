import type { Performance } from '../../db/repositories/history';
import { estimate1RM, exerciseSessionMetrics } from '../../domain/stats';
import { formatWeight, roundForDisplay, toUnit } from '../../domain/units';
import type { SetEntry, Unit } from '../../domain/types';

export type Metric = 'topWeight' | 'e1rm' | 'volume';
export type RangeKey = '1M' | '3M' | '1Y' | 'All';

export const METRICS: ReadonlyArray<{ key: Metric; label: string }> = [
  { key: 'topWeight', label: 'Top weight' },
  { key: 'e1rm', label: 'Est. 1RM' },
  { key: 'volume', label: 'Volume' },
];

export const RANGES: ReadonlyArray<RangeKey> = ['1M', '3M', '1Y', 'All'];

const RANGE_DAYS: Record<RangeKey, number | null> = { '1M': 30, '3M': 90, '1Y': 365, All: null };
const DAY_MS = 24 * 60 * 60 * 1000;

/** One working set, expressed in the display unit (unrounded) plus the unit it was stored in. */
export interface ChartSet {
  weight: number;
  reps: number;
  storedWeight: number;
  storedUnit: Unit;
}

export interface ChartPoint {
  sessionId: string;
  /** Session start, epoch ms. */
  t: number;
  startedAt: string;
  /** Metric value in the display unit (unrounded). */
  value: number;
  /** True when at least one set was entered in the other unit. */
  converted: boolean;
  sets: ChartSet[];
}

function workingSets(sets: ReadonlyArray<SetEntry>): SetEntry[] {
  return sets.filter((s) => !s.isWarmup);
}

function metricValue(metric: Metric, m: ReturnType<typeof exerciseSessionMetrics>): number | null {
  if (metric === 'topWeight') return m.topWeight;
  if (metric === 'e1rm') return m.bestE1RM;
  return m.volume;
}

/**
 * Plotted points for one metric. Every value comes from `exerciseSessionMetrics`, computed on the
 * session's sets converted to `displayUnit`. Sessions without working sets, or without a value for
 * the metric (e1RM above 12 reps), are skipped. Oldest first.
 */
export function buildChartPoints(
  history: ReadonlyArray<Performance>,
  metric: Metric,
  displayUnit: Unit,
  range: RangeKey = 'All',
  now: Date = new Date(),
): ChartPoint[] {
  const days = RANGE_DAYS[range];
  const cutoff = days === null ? -Infinity : now.getTime() - days * DAY_MS;
  const points: ChartPoint[] = [];
  for (const { session, sets } of history) {
    const t = new Date(session.startedAt).getTime();
    if (t < cutoff) continue;
    const working = workingSets(sets);
    if (working.length === 0) continue;
    const converted = working.map((s) => toUnit(s, displayUnit));
    const value = metricValue(metric, exerciseSessionMetrics(converted));
    if (value === null) continue;
    points.push({
      sessionId: session.id,
      t,
      startedAt: session.startedAt,
      value,
      converted: working.some((s) => s.unit !== displayUnit),
      sets: working.map((s, i) => ({
        weight: converted[i].weight,
        reps: s.reps,
        storedWeight: s.weight,
        storedUnit: s.unit,
      })),
    });
  }
  return points.sort((a, b) => a.t - b.t);
}

/** Formats a plotted value. Derived metrics and converted weights are rounded (SPEC 5.4). */
export function formatMetricValue(metric: Metric, point: ChartPoint, displayUnit: Unit): string {
  const exact = metric === 'topWeight' && !point.converted;
  const v = exact ? point.value : roundForDisplay(point.value, displayUnit);
  return formatWeight(v, displayUnit, displayUnit);
}

/** Formats a set as `135 lb x 8` in the display unit. */
export function formatSet(set: ChartSet, displayUnit: Unit): string {
  return `${formatWeight(set.storedWeight, set.storedUnit, displayUnit)} × ${set.reps}`;
}

export interface TopSet {
  weight: number;
  unit: Unit;
  reps: number;
}

/** Heaviest working set (ties: more reps) of a performance, in its stored unit. */
export function topSetOf(sets: ReadonlyArray<SetEntry>): TopSet | null {
  let best: TopSet | null = null;
  for (const s of workingSets(sets)) {
    const cmp = best === null ? 1 : compareTop(s, best);
    if (cmp > 0) best = { weight: s.weight, unit: s.unit, reps: s.reps };
  }
  return best;
}

function compareTop(a: SetEntry, b: TopSet): number {
  const aw = a.unit === b.unit ? a.weight : toUnit(a, b.unit).weight;
  return aw - b.weight || a.reps - b.reps;
}

export interface RecordSet {
  sessionId: string;
  startedAt: string;
  reps: number;
  /** Display-unit value, unrounded. */
  value: number;
  converted: boolean;
}

export interface Records {
  heaviest: RecordSet | null;
  bestE1RM: RecordSet | null;
}

/** All-time records from the whole history (not limited by the chart range). */
export function computeRecords(history: ReadonlyArray<Performance>, displayUnit: Unit): Records {
  let heaviest: RecordSet | null = null;
  let bestE1RM: RecordSet | null = null;
  for (const { session, sets } of history) {
    const working = workingSets(sets);
    if (working.length === 0) continue;
    const converted = working.map((s) => toUnit(s, displayUnit));
    const m = exerciseSessionMetrics(converted);
    const mixed = working.some((s) => s.unit !== displayUnit);
    if (heaviest === null || m.topWeight > heaviest.value) {
      const reps = Math.max(
        ...converted.filter((s) => s.weight === m.topWeight).map((s) => s.reps),
      );
      heaviest = {
        sessionId: session.id,
        startedAt: session.startedAt,
        reps,
        value: m.topWeight,
        converted: mixed,
      };
    }
    if (m.bestE1RM !== null && (bestE1RM === null || m.bestE1RM > bestE1RM.value)) {
      const best = converted.find((s) => estimate1RM(s.weight, s.reps) === m.bestE1RM);
      bestE1RM = {
        sessionId: session.id,
        startedAt: session.startedAt,
        reps: best?.reps ?? 0,
        value: m.bestE1RM,
        converted: mixed,
      };
    }
  }
  return { heaviest, bestE1RM };
}

export interface HistoryRow {
  sessionId: string;
  startedAt: string;
  sets: ChartSet[];
  volume: number;
  converted: boolean;
}

/** Past sessions, newest first, with working sets and volume (display unit). */
export function buildHistoryRows(
  history: ReadonlyArray<Performance>,
  displayUnit: Unit,
): HistoryRow[] {
  return buildChartPoints(history, 'volume', displayUnit)
    .map((p) => ({
      sessionId: p.sessionId,
      startedAt: p.startedAt,
      sets: p.sets,
      volume: p.value,
      converted: p.converted,
    }))
    .reverse();
}
