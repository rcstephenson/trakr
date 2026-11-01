import { Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDuration } from '../../domain/activity';
import { ACTIVITY_LABELS } from '../../domain/activity';
import type { Activity, Session, Unit } from '../../domain/types';
import { useSessionSets } from '../../hooks/useSessionSets';
import { ActivityTypeIcon } from '../activity/ActivityTypeIcon';
import { Card } from '../ui';
import { formatVolume, sessionMinutes, sessionTotals } from './feed';

const rowCard = 'flex min-h-touch items-center gap-3 active:opacity-80';
const iconBox =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent';

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
      <Card className={rowCard}>
        <span className={iconBox}>
          <Dumbbell size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-text">{session.workoutName}</p>
          <p className="tabular text-sm text-muted">{parts.join(' · ')}</p>
        </div>
      </Card>
    </Link>
  );
}

export function ActivityRow({ activity }: { activity: Activity }) {
  const title = activity.title?.trim() || ACTIVITY_LABELS[activity.type];
  const parts = [
    dayLabel(activity.startedAt),
    activity.durationMin ? formatDuration(activity.durationMin) : null,
    activity.distance ? `${activity.distance} ${activity.distanceUnit ?? ''}`.trim() : null,
  ].filter((p): p is string => p !== null);
  return (
    <Link to={`/activity/${activity.id}`} className="block" data-testid="feed-activity">
      <Card className={rowCard}>
        <span className={iconBox}>
          <ActivityTypeIcon type={activity.type} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-text">{title}</p>
          <p className="tabular text-sm text-muted">{parts.join(' · ')}</p>
        </div>
      </Card>
    </Link>
  );
}
