import type { Activity, Session } from '../../domain/types';
import { isSameDay, weekDays } from '../../lib/dates';
import { Card } from '../ui';

const LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export interface WeekStripProps {
  today: Date;
  sessions: Pick<Session, 'startedAt'>[];
  activities: Pick<Activity, 'startedAt'>[];
}

export function WeekStrip({ today, sessions, activities }: WeekStripProps) {
  const days = weekDays(today);
  return (
    <Card aria-label="This week">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">This week</h2>
      <ol className="flex justify-between">
        {days.map((day, i) => {
          const workout = sessions.some((s) => isSameDay(new Date(s.startedAt), day));
          const activity = activities.some((a) => isSameDay(new Date(a.startedAt), day));
          const state = workout ? 'workout' : activity ? 'activity' : 'none';
          const isToday = isSameDay(day, today);
          const dot =
            state === 'workout'
              ? 'bg-accent border-accent'
              : state === 'activity'
                ? 'border-accent bg-transparent'
                : 'border-border bg-border opacity-60';
          const description =
            state === 'workout'
              ? 'workout done'
              : state === 'activity'
                ? 'activity logged'
                : 'nothing logged';
          return (
            <li
              key={i}
              data-testid="week-day"
              data-state={state}
              data-today={isToday}
              aria-label={`${day.toLocaleDateString('en-US', { weekday: 'long' })}${isToday ? ' (today)' : ''}: ${description}`}
              className={`flex min-h-touch w-10 flex-col items-center justify-center gap-1.5 rounded-btn ${
                isToday ? 'bg-accent-soft' : ''
              }`}
            >
              <span className={`text-xs ${isToday ? 'font-semibold text-accent' : 'text-muted'}`}>
                {LABELS[i]}
              </span>
              <span className={`h-3 w-3 rounded-full border-2 ${dot}`} aria-hidden="true" />
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
