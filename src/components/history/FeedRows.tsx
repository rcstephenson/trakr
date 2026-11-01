import { ChevronRight, Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ACTIVITY_LABELS, formatDuration, pace } from '../../domain/activity';
import type { Activity, Session, Unit } from '../../domain/types';
import { useSessionSets } from '../../hooks/useSessionSets';
import { ActivityTypeIcon } from '../activity/ActivityTypeIcon';
import { formatVolume, sessionMinutes, sessionTotals } from './feed';

const rowCard = 'flex min-h-touch items-center gap-3 px-3 py-2 active:bg-bg';
const iconBox =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-btn border border-hairline bg-raised text-ink';

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function SessionRow({ session, unit }: { session: Session; unit: Unit }) {
  const sets = useSessionSets(session.id);
  const minutes = sessionMinutes(session);
  const totals = sets ? sessionTotals(sets, unit) : null;
  const parts = [
    dayLabel(session.startedAt),
    minutes !== null ? formatDuration(minutes) : null,
    totals ? `${totals.setCount} ${totals.setCount === 1 ? 'set' : 'sets'}` : null,
    totals && totals.volume > 0 ? formatVolume(totals.volume, unit) : null,
  ].filter((p): p is string => p !== null);
  return (
    <Link to={`/history/session/${session.id}`} className="block" data-testid="feed-session">
      <div className={rowCard}>
        <span className={iconBox}>
          <Dumbbell size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{session.workoutName}</p>
          <p className="num truncate text-xs text-muted">{parts.join(' · ')}</p>
        </div>
        <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden="true" />
      </div>
    </Link>
  );
}

export function ActivityRow({ activity }: { activity: Activity }) {
  const title = activity.title?.trim() || ACTIVITY_LABELS[activity.type];
  const parts = [
    dayLabel(activity.startedAt),
    activity.durationMin ? formatDuration(activity.durationMin) : null,
    activity.distance ? `${activity.distance} ${activity.distanceUnit ?? ''}`.trim() : null,
    activity.distanceUnit
      ? pace(activity.durationMin, activity.distance, activity.distanceUnit)
      : null,
  ].filter((p): p is string => p !== null);
  return (
    <Link to={`/activity/${activity.id}`} className="block" data-testid="feed-activity">
      <div className={rowCard}>
        <span className={iconBox}>
          <ActivityTypeIcon type={activity.type} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
          <p className="num truncate text-xs text-muted">{parts.join(' · ')}</p>
        </div>
        <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden="true" />
      </div>
    </Link>
  );
}
