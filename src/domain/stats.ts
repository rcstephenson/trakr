import type { SetEntry } from './types';

type WeightedSet = Pick<SetEntry, 'weight' | 'reps' | 'isWarmup'>;

/** Epley estimated 1RM. Null for 0 (or fewer) reps and for more than 12 reps. */
export function estimate1RM(weight: number, reps: number): number | null {
  if (!(reps > 0) || reps > 12) return null;
  return weight * (1 + reps / 30);
}

export interface ExerciseSessionMetrics {
  topWeight: number;
  bestE1RM: number | null;
  volume: number;
  totalReps: number;
  setCount: number;
}

/** Metrics over working sets (warm-ups ignored). Sets must share one unit. */
export function exerciseSessionMetrics(sets: ReadonlyArray<WeightedSet>): ExerciseSessionMetrics {
  let topWeight = 0;
  let bestE1RM: number | null = null;
  let volume = 0;
  let totalReps = 0;
  let setCount = 0;
  for (const s of sets) {
    if (s.isWarmup) continue;
    setCount += 1;
    topWeight = Math.max(topWeight, s.weight);
    volume += s.weight * s.reps;
    totalReps += s.reps;
    const e = estimate1RM(s.weight, s.reps);
    if (e !== null && (bestE1RM === null || e > bestE1RM)) bestE1RM = e;
  }
  return { topWeight, bestE1RM, volume, totalReps, setCount };
}

export interface SetPR<T> {
  set: T;
  /** Heavier than any prior working set. */
  weight: boolean;
  /** Higher estimated 1RM than any prior working set. */
  e1rm: boolean;
}

/**
 * New working sets that beat the prior best weight or best e1RM. Strictly greater only, so
 * ties are not PRs. `newSets` is processed in order and earlier new sets raise the bar for later
 * ones. With no prior working sets there is nothing to beat, so nothing is flagged.
 */
export function findPRs<T extends WeightedSet>(
  priorSets: ReadonlyArray<WeightedSet>,
  newSets: ReadonlyArray<T>,
): SetPR<T>[] {
  const prior = exerciseSessionMetrics(priorSets);
  if (prior.setCount === 0) return [];
  let bestWeight = prior.topWeight;
  let bestE1RM = prior.bestE1RM;
  const result: SetPR<T>[] = [];
  for (const set of newSets) {
    if (set.isWarmup) continue;
    const weight = set.weight > bestWeight;
    const e = estimate1RM(set.weight, set.reps);
    const e1rm = e !== null && (bestE1RM === null || e > bestE1RM);
    if (weight) bestWeight = set.weight;
    if (e1rm && e !== null) bestE1RM = e;
    if (weight || e1rm) result.push({ set, weight, e1rm });
  }
  return result;
}

export interface DayCount {
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  workouts: number;
  activities: number;
}

function dateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Per-day counts for the seven days starting at `weekStart` (local time; Monday for the Today
 * strip). Only completed sessions count; discarded and active ones are ignored.
 */
export function weeklyCounts(
  sessions: ReadonlyArray<{ status: string; startedAt: string; finishedAt?: string }>,
  activities: ReadonlyArray<{ startedAt: string }>,
  weekStart: Date,
): DayCount[] {
  const days: DayCount[] = Array.from({ length: 7 }, (_, i) => ({
    date: dateKey(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)),
    workouts: 0,
    activities: 0,
  }));
  const byDate = new Map(days.map((d) => [d.date, d]));
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const day = byDate.get(dateKey(new Date(s.startedAt)));
    if (day) day.workouts += 1;
  }
  for (const a of activities) {
    const day = byDate.get(dateKey(new Date(a.startedAt)));
    if (day) day.activities += 1;
  }
  return days;
}
