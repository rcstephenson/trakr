import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Activity, Session } from '../../domain/types';
import { formatRelativeDay } from '../../lib/dates';
import { Card, Mono, SectionLabel } from '../ui';

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

export function RecentList({ entries, index }: { entries: RecentEntry[]; index?: number }) {
  return (
    <section aria-label="Recent">
      <SectionLabel index={index}>Recent</SectionLabel>
      {entries.length === 0 ? (
        <Card className="mt-2">
          <p className="text-sm text-muted">Nothing logged yet.</p>
        </Card>
      ) : (
        <ul className="mt-2 divide-y divide-hairline overflow-hidden rounded-card border border-hairline bg-surface">
          {entries.map((e, i) => (
            <li key={e.key}>
              <Link
                to={e.to}
                className="flex min-h-touch items-center gap-3 px-3 py-2 active:bg-accent-soft"
              >
                <Mono className="w-5 shrink-0 text-xs text-muted">{String(i + 1).padStart(2, '0')}</Mono>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{e.title}</p>
                  <p className="micro">{e.detail}</p>
                </div>
                <Mono className="shrink-0 text-xs text-muted">{formatRelativeDay(e.at)}</Mono>
                <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
