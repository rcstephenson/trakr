import type { Activity, Session } from '../../domain/types';
import { isSameDay, startOfWeek, weekDays } from '../../lib/dates';
import { Card, Mono, SectionLabel } from '../ui';

export interface ActivityGridProps {
  today: Date;
  sessions: Pick<Session, 'startedAt'>[];
  activities: Pick<Activity, 'startedAt'>[];
  /** Columns shown, oldest to newest (default 14). */
  weeks?: number;
}

type DayState = 'workout' | 'activity' | 'both' | 'none';

const CELL_FILL: Record<DayState, string> = {
  none: 'bg-grid-empty',
  workout: 'bg-grid-workout',
  activity: 'bg-grid-activity',
  both: 'bg-grid-both',
};

const LEGEND: { state: DayState; label: string }[] = [
  { state: 'workout', label: 'Gym' },
  { state: 'activity', label: 'Other' },
  { state: 'both', label: 'Both' },
];

const DESCRIPTION: Record<DayState, string> = {
  none: 'nothing logged',
  workout: 'workout done',
  activity: 'activity logged',
  both: 'workout done and activity logged',
};

/**
 * GitHub-style contribution grid: `weeks` columns of Mon-Sun. Gym workouts are blue, other
 * activities magenta, and a day with both is violet.
 */
export function ActivityGrid({ today, sessions, activities, weeks = 14 }: ActivityGridProps) {
  const firstWeekStart = startOfWeek(today);
  firstWeekStart.setDate(firstWeekStart.getDate() - 7 * (weeks - 1));
  const columns = Array.from({ length: weeks }, (_, w) => {
    const colStart = new Date(firstWeekStart);
    colStart.setDate(firstWeekStart.getDate() + w * 7);
    return weekDays(colStart);
  });

  const stateOf = (day: Date): DayState => {
    const workout = sessions.some((s) => isSameDay(new Date(s.startedAt), day));
    const activity = activities.some((a) => isSameDay(new Date(a.startedAt), day));
    if (workout && activity) return 'both';
    if (workout) return 'workout';
    if (activity) return 'activity';
    return 'none';
  };

  const days = columns.flat();
  const totalDays = days.length;
  const loggedDays = days.filter((d) => stateOf(d) !== 'none').length;

  return (
    <section aria-label={`Activity, last ${weeks} weeks`}>
      <SectionLabel
        action={
          <>
            <Mono className="text-ink">{loggedDays}</Mono>/<Mono>{totalDays}</Mono> days
          </>
        }
      >
        {`Last ${weeks} weeks`}
      </SectionLabel>
      <Card className="mt-2 !p-3">
        {/* Separate rounded squares, GitHub-contribution style. */}
        <ol
          className="grid grid-flow-col grid-rows-7 gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
        >
          {days.map((day) => {
            const state = stateOf(day);
            const isToday = isSameDay(day, today);
            const label = day.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            });
            return (
              <li
                key={day.toISOString()}
                data-testid="activity-grid-day"
                data-state={state}
                aria-label={`${label}${isToday ? ' (today)' : ''}: ${DESCRIPTION[state]}`}
                className={[
                  'aspect-square rounded-[3px]',
                  CELL_FILL[state],
                  isToday ? 'outline outline-1 outline-offset-1 outline-ink' : '',
                ].join(' ')}
              />
            );
          })}
        </ol>
        {/* Decorative key: each cell already carries its own aria-label. */}
        <ul className="mt-2 flex items-center justify-end gap-3" aria-hidden="true">
          {LEGEND.map(({ state, label }) => (
            <li key={state} className="micro flex items-center gap-1">
              <span className={`h-2.5 w-2.5 rounded-[2px] ${CELL_FILL[state]}`} />
              {label}
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
