import { useState } from 'react';
import { Link } from 'react-router-dom';
import { NextUpHero, ResumeHero } from '../components/today/Hero';
import { buildRecent, RecentList } from '../components/today/RecentList';
import { TodaySkeleton } from '../components/today/TodaySkeleton';
import { useStartWorkout } from '../components/today/useStartWorkout';
import { WeekStrip } from '../components/today/WeekStrip';
import { buttonClass, EmptyState, PageHeader } from '../components/ui';
import { nextWorkoutId } from '../domain/rotation';
import { useActiveProgram } from '../hooks/useActiveProgram';
import { useActiveSession } from '../hooks/useActiveSession';
import { useActivities } from '../hooks/useActivities';
import { useSessions } from '../hooks/useSessions';
import { endOfWeek, noonIso, startOfWeek, toDateKey } from '../lib/dates';

const COMPLETED = { status: 'completed' } as const;

export default function Today() {
  const program = useActiveProgram();
  const active = useActiveSession();
  const completed = useSessions(COMPLETED);
  const activities = useActivities();
  const [picked, setPicked] = useState<string | null>(null);
  const [dayKey, setDayKey] = useState(() => toDateKey(new Date()));
  const { start, starting } = useStartWorkout();

  if (
    program === undefined ||
    active === undefined ||
    completed === undefined ||
    activities === undefined
  ) {
    return (
      <>
        <PageHeader title="Today" />
        <TodaySkeleton />
      </>
    );
  }

  const today = new Date();
  const weekStart = startOfWeek(today).getTime();
  const weekEnd = endOfWeek(today).getTime();
  const inWeek = (iso: string) => {
    const t = Date.parse(iso);
    return t >= weekStart && t <= weekEnd;
  };

  let nextId: string | null = null;
  if (program) {
    try {
      nextId = nextWorkoutId(program, completed);
    } catch {
      nextId = null;
    }
  }
  const next = program?.workouts.find((w) => w.id === nextId);
  const todayKey = toDateKey(today);
  const selected = program?.workouts.find((w) => w.id === picked) ?? next;

  const target = program?.schedule.filter((id) => id !== 'rest').length;

  let hero;
  if (active) {
    hero = <ResumeHero session={active} />;
  } else if (program && next && selected) {
    const day = dayKey > todayKey ? todayKey : dayKey;
    hero = (
      <NextUpHero
        workouts={program.workouts.map((w) => ({
          id: w.id,
          name: w.name,
          exerciseCount: w.items.length,
        }))}
        nextId={next.id}
        selectedId={selected.id}
        onSelect={setPicked}
        dayKey={day}
        todayKey={todayKey}
        onDayChange={setDayKey}
        starting={starting}
        onStart={() =>
          void start(
            program.id,
            selected.id,
            day === todayKey ? undefined : { startedAt: noonIso(day) ?? undefined },
          )
        }
      />
    );
  } else {
    hero = (
      <EmptyState
        title="No workouts available"
        description="Import or create a program to get started."
        action={
          <Link to="/program" className="text-sm font-semibold text-accent">
            Go to Program
          </Link>
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Today"
        subtitle={today
          .toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
          .replace(',', '')}
      />
      <div className="flex flex-col gap-5 px-gutter pb-6">
        <WeekStrip
          index={1}
          target={target}
          today={today}
          sessions={completed.filter((s) => inWeek(s.startedAt))}
          activities={activities.filter((a) => inWeek(a.startedAt))}
        />
        {hero}
        {active ? (
          <p className="micro -mt-2 text-center">
            Finish or discard the workout in progress to start another.
          </p>
        ) : null}
        <Link to="/activity/new" className={buttonClass('secondary', true)}>
          + Log activity
        </Link>
        <RecentList index={2} entries={buildRecent(completed, activities)} />
      </div>
    </>
  );
}
