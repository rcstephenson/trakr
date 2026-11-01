import { useState } from 'react';
import { Link } from 'react-router-dom';
import { NextUpHero, ResumeHero, slotLabel } from '../components/today/Hero';
import { buildRecent, RecentList } from '../components/today/RecentList';
import { TodaySkeleton } from '../components/today/TodaySkeleton';
import { useStartWorkout } from '../components/today/useStartWorkout';
import { WeekStrip } from '../components/today/WeekStrip';
import { WorkoutPicker } from '../components/today/WorkoutPicker';
import { buttonClass, EmptyState, PageHeader } from '../components/ui';
import { nextWorkoutId } from '../domain/rotation';
import { useActiveProgram } from '../hooks/useActiveProgram';
import { useActiveSession } from '../hooks/useActiveSession';
import { useActivities } from '../hooks/useActivities';
import { useSessions } from '../hooks/useSessions';
import { endOfWeek, startOfWeek } from '../lib/dates';

const COMPLETED = { status: 'completed' } as const;

export default function Today() {
  const program = useActiveProgram();
  const active = useActiveSession();
  const completed = useSessions(COMPLETED);
  const activities = useActivities();
  const [pickerOpen, setPickerOpen] = useState(false);
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

  const cycle = program?.schedule.map((id) => ({
    id,
    label: slotLabel(id, program.workouts.find((w) => w.id === id)?.name),
  }));
  const target = program?.schedule.filter((id) => id !== 'rest').length;

  let hero;
  if (active) {
    hero = <ResumeHero session={active} />;
  } else if (program && next) {
    hero = (
      <NextUpHero
        workoutName={next.name}
        exerciseCount={next.items.length}
        starting={starting}
        onStart={() => void start(program.id, next.id)}
        onChoose={() => setPickerOpen(true)}
        cycle={cycle}
        nextIndex={program.schedule.indexOf(next.id)}
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
        {hero}
        <Link to="/activity/new" className={buttonClass('secondary', true)}>
          + Log activity
        </Link>
        <WeekStrip
          index={1}
          target={target}
          today={today}
          sessions={completed.filter((s) => inWeek(s.startedAt))}
          activities={activities.filter((a) => inWeek(a.startedAt))}
        />
        <RecentList index={2} entries={buildRecent(completed, activities)} />
      </div>
      {program && !active ? (
        <WorkoutPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          workouts={program.workouts}
          onPick={(id) => {
            setPickerOpen(false);
            void start(program.id, id);
          }}
        />
      ) : null}
    </>
  );
}
