import type { Activity, Session, SetEntry, Unit } from '../../domain/types';
import { diffInDays, startOfWeek } from '../../lib/dates';
import { weightInUnit } from '../session/prefill';

export type FeedFilter = 'all' | 'workouts' | 'activities';

export type FeedItem =
  | { kind: 'session'; key: string; at: string; session: Session }
  | { kind: 'activity'; key: string; at: string; activity: Activity };

export interface FeedGroup {
  /** Monday of the week, `YYYY-MM-DD`-ish stable key. */
  key: string;
  label: string;
  items: FeedItem[];
}

const MONTH_DAY: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

/** "This week", "Last week", then "Oct 13 – 19" (or "Oct 28 – Nov 3" across months). */
export function weekLabel(weekStart: Date, now: Date = new Date()): string {
  const weeks = Math.round(diffInDays(weekStart, startOfWeek(now)) / 7);
  if (weeks === 0) return 'This week';
  if (weeks === 1) return 'Last week';
  const end = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
  const startText = weekStart.toLocaleDateString('en-US', MONTH_DAY);
  const endText =
    end.getMonth() === weekStart.getMonth()
      ? String(end.getDate())
      : end.toLocaleDateString('en-US', MONTH_DAY);
  return `${startText} – ${endText}`;
}

/** Merges sessions and activities (newest first) and groups them by week. */
export function buildFeed(
  sessions: ReadonlyArray<Session>,
  activities: ReadonlyArray<Activity>,
  filter: FeedFilter,
  now: Date = new Date(),
): FeedGroup[] {
  const items: FeedItem[] = [];
  if (filter !== 'activities') {
    for (const session of sessions) {
      items.push({ kind: 'session', key: `s-${session.id}`, at: session.startedAt, session });
    }
  }
  if (filter !== 'workouts') {
    for (const activity of activities) {
      items.push({ kind: 'activity', key: `a-${activity.id}`, at: activity.startedAt, activity });
    }
  }
  items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  const groups: FeedGroup[] = [];
  for (const item of items) {
    const start = startOfWeek(new Date(item.at));
    const key = String(start.getTime());
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, label: weekLabel(start, now), items: [item] });
  }
  return groups;
}

/** Minutes between start and finish, or null for an unfinished or under-a-minute session. */
export function sessionMinutes(session: Pick<Session, 'startedAt' | 'finishedAt'>): number | null {
  if (!session.finishedAt) return null;
  const ms = Date.parse(session.finishedAt) - Date.parse(session.startedAt);
  return Number.isFinite(ms) && ms >= 60000 ? ms / 60000 : null;
}

export interface SessionTotals {
  setCount: number;
  volume: number;
}

/** Working-set count and volume (Σ weight × reps) in the display unit. */
export function sessionTotals(sets: ReadonlyArray<SetEntry>, unit: Unit): SessionTotals {
  let setCount = 0;
  let volume = 0;
  for (const s of sets) {
    if (s.isWarmup) continue;
    setCount += 1;
    volume += weightInUnit(s, unit) * s.reps;
  }
  return { setCount, volume };
}

export function formatVolume(volume: number, unit: Unit): string {
  return `${Math.round(volume).toLocaleString('en-US')} ${unit}`;
}
