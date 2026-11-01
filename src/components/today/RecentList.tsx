import { Link } from 'react-router-dom';
import type { Activity, Session } from '../../domain/types';
import { formatRelativeDay } from '../../lib/dates';
import { Card } from '../ui';

export interface RecentEntry {
  key: string;
  to: string;
  title: string;
  detail: string;
  at: string;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Merges completed sessions and activities, newest first, limited to `limit`. */
export function buildRecent(sessions: Session[], activities: Activity[], limit = 3): RecentEntry[] {
  const entries: RecentEntry[] = [
    ...sessions.map((s) => ({
      key: `s-${s.id}`,
      to: `/history/session/${s.id}`,
      title: s.workoutName,
      detail: 'Workout',
      at: s.startedAt,
    })),
    ...activities.map((a) => ({
      key: `a-${a.id}`,
      to: `/activity/${a.id}`,
      title: a.title?.trim() || cap(a.type),
      detail: a.durationMin ? `Activity · ${a.durationMin} min` : 'Activity',
      at: a.startedAt,
    })),
  ];
  return entries.sort((x, y) => Date.parse(y.at) - Date.parse(x.at)).slice(0, limit);
}

export function RecentList({ entries }: { entries: RecentEntry[] }) {
  return (
    <section aria-label="Recent">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Recent</h2>
      {entries.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">Nothing logged yet.</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((e) => (
            <li key={e.key}>
              <Link to={e.to} className="block">
                <Card className="flex min-h-touch items-center justify-between gap-3 active:opacity-80">
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-text">{e.title}</p>
                    <p className="text-sm tabular-nums text-muted">{e.detail}</p>
                  </div>
                  <span className="shrink-0 text-sm text-muted">{formatRelativeDay(e.at)}</span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
