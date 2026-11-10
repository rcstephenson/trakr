import type { Activity, Session } from '../../domain/types';
import { isSameDay, startOfWeek, weekDays } from '../../lib/dates';
import { Card, Mono, SectionLabel } from '../ui';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export interface ActivityGridProps {
  today: Date;
  sessions: Pick<Session, 'startedAt'>[];
  activities: Pick<Activity, 'startedAt'>[];
  /** Columns shown, oldest to newest (default 6). */
  weeks?: number;
}

type DayState = 'workout' | 'activity' | 'none';

/** GitHub-style contribution grid: `weeks` columns of Mon-Sun, filled per day logged. */
export function ActivityGrid({ today, sessions, activities, weeks = 6 }: ActivityGridProps) {
  const firstWeekStart = startOfWeek(today);
  firstWeekStart.setDate(firstWeekStart.getDate() - 7 * (weeks - 1));
  const columns = Array.from({ length: weeks }, (_, w) => {
    const colStart = new Date(firstWeekStart);
    colStart.setDate(firstWeekStart.getDate() + w * 7);
    return weekDays(colStart);
  });

  const stateOf = (day: Date): DayState => {
    if (sessions.some((s) => isSameDay(new Date(s.startedAt), day))) return 'workout';
    if (activities.some((a) => isSameDay(new Date(a.startedAt), day))) return 'activity';
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
      <Card className="mt-2 p-3">
        <div className="flex gap-1.5">
          <ol className="flex flex-col gap-1.5" aria-hidden="true">
            {DAY_LABELS.map((l, i) => (
              <li key={i} className="micro flex h-6 w-3 items-center justify-center">
                {l}
              </li>
            ))}
          </ol>
          <div className="flex flex-1 justify-between">
            {columns.map((week, wi) => (
              <ol key={wi} className="flex flex-col items-center gap-1.5">
                {week.map((day, di) => {
                  const state = stateOf(day);
                  const isToday = isSameDay(day, today);
                  const description =
                    state === 'workout'
                      ? 'workout done'
                      : state === 'activity'
                        ? 'activity logged'
                        : 'nothing logged';
                  const label = day.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  });
                  return (
                    <li
                      key={di}
                      data-testid="activity-grid-day"
                      data-state={state}
                      aria-label={`${label}${isToday ? ' (today)' : ''}: ${description}`}
                      className={[
                        'h-6 w-6 rounded-[2px]',
                        state === 'workout' ? 'bg-ink' : 'bg-transparent',
                        isToday
                          ? 'border-2 border-accent-ink'
                          : state === 'none'
                            ? 'border border-hairline'
                            : 'border border-ink',
                      ].join(' ')}
                    />
                  );
                })}
              </ol>
            ))}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-end gap-3" aria-hidden="true">
          <span className="micro flex items-center gap-1">
            <span className="h-3 w-3 rounded-[2px] border border-ink bg-transparent" />
            Activity
          </span>
          <span className="micro flex items-center gap-1">
            <span className="h-3 w-3 rounded-[2px] border border-ink bg-ink" />
            Workout
          </span>
        </div>
      </Card>
    </section>
  );
}
