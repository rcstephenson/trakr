import type { ActivityType, DistanceUnit } from './types';

export const ACTIVITY_TYPES: readonly ActivityType[] = [
  'run',
  'cycle',
  'swim',
  'walk',
  'climb',
  'tennis',
  'sport',
  'class',
  'other',
];

/** Types for which a distance is recorded. */
const DISTANCE_TYPES: ReadonlySet<ActivityType> = new Set(['run', 'cycle', 'swim', 'walk']);

export function hasDistance(type: ActivityType): boolean {
  return DISTANCE_TYPES.has(type);
}

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  run: 'Run',
  cycle: 'Cycle',
  swim: 'Swim',
  walk: 'Walk',
  climb: 'Climb',
  tennis: 'Tennis',
  sport: 'Sport',
  class: 'Class',
  other: 'Other',
};

/** Lucide icon name for an activity type (the component lives in `components/activity`). */
export type ActivityIconName =
  | 'footprints'
  | 'bike'
  | 'waves'
  | 'person-standing'
  | 'mountain'
  | 'tennis-ball'
  | 'trophy'
  | 'users'
  | 'activity';

const ICONS: Record<ActivityType, ActivityIconName> = {
  run: 'footprints',
  cycle: 'bike',
  swim: 'waves',
  walk: 'person-standing',
  climb: 'mountain',
  tennis: 'tennis-ball',
  sport: 'trophy',
  class: 'users',
  other: 'activity',
};

export function activityIcon(type: ActivityType): ActivityIconName {
  return ICONS[type];
}

/**
 * Pace as `m:ss /km` (or `/mi`). Returns `null` when duration or distance is
 * missing, zero or not finite.
 */
export function pace(
  durationMin: number | undefined,
  distance: number | undefined,
  unit: DistanceUnit,
): string | null {
  if (durationMin === undefined || distance === undefined) return null;
  if (!Number.isFinite(durationMin) || !Number.isFinite(distance)) return null;
  if (durationMin <= 0 || distance <= 0) return null;
  const totalSeconds = Math.round((durationMin / distance) * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')} /${unit}`;
}

/** `1h 05m`, `28m`, `<1m` for under a minute, `0m` for zero. */
export function formatDuration(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return '0m';
  if (min < 1) return '<1m';
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}
