import { Check } from 'lucide-react';
import type { Activity, Session } from '../../domain/types';
import { isSameDay, weekDays } from '../../lib/dates';
import { Card, Mono, SectionLabel, SegmentedBar } from '../ui';

const LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export interface WeekStripProps {
  today: Date;
  sessions: Pick<Session, 'startedAt'>[];
  activities: Pick<Activity, 'startedAt'>[];
  /** Workouts per week in the schedule; drives the segmented count. */
  target?: number;
  /** Section index shown before the label. */
  index?: number;
}

export function WeekStrip({ today, sessions, activities, target, index }: WeekStripProps) {
  const days = weekDays(today);
  const done = sessions.length;
  return (
    <section aria-label="This week">
      <SectionLabel
        index={index}
        action={
          target ? (
            <>
              <Mono className="text-ink">{Math.min(done, target)}</Mono>/<Mono>{target}</Mono> done
            </>
          ) : undefined
        }
      >
        This week
      </SectionLabel>
      <Card className="mt-2 p-3">
        <ol className="flex justify-between gap-1">
          {days.map((day, i) => {
            const workout = sessions.some((s) => isSameDay(new Date(s.startedAt), day));
            const activity = activities.some((a) => isSameDay(new Date(a.startedAt), day));
            const state = workout ? 'workout' : activity ? 'activity' : 'none';
            const isToday = isSameDay(day, today);
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
                className="flex min-h-touch flex-1 flex-col items-center justify-center gap-1.5"
              >
                <span
                  className={`micro ${isToday ? '!text-ink font-semibold' : ''}`}
                  aria-hidden="true"
                >
                  {LABELS[i]}
                </span>
                <span
                  aria-hidden="true"
                  className={[
                    'flex h-7 w-7 items-center justify-center rounded-chip border',
                    state === 'workout'
                      ? 'border-ink bg-ink text-bg'
                      : state === 'activity'
                        ? 'border-ink bg-transparent'
                        : 'border-hairline bg-transparent',
                  ].join(' ')}
                >
                  {state === 'workout' ? <Check size={14} strokeWidth={3} /> : null}
                  {state === 'activity' ? (
                    <span className="h-1.5 w-1.5 rounded-[1px] bg-ink" />
                  ) : null}
                </span>
                <span
                  className={`h-0.5 w-4 ${isToday ? 'bg-ink' : 'bg-transparent'}`}
                  aria-hidden="true"
                />
              </li>
            );
          })}
        </ol>
        {target ? (
          <SegmentedBar
            className="mt-2"
            value={Math.min(done, target)}
            total={target}
            label={`${Math.min(done, target)} of ${target} workouts this week`}
          />
        ) : null}
      </Card>
    </section>
  );
}
