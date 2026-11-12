import type { Program, Session } from './types';

/**
 * Id of the workout that should come next.
 * Sequence-based: the entry after the most recently completed session's workout in
 * `program.schedule`, skipping `rest`, wrapping around. Falls back to the first workout when
 * there are no completed sessions or the last workout id is no longer in the schedule.
 * Throws if the schedule has no workouts.
 */
export function nextWorkoutId(
  program: Pick<Program, 'schedule'>,
  completedSessions: ReadonlyArray<
    Pick<Session, 'workoutId' | 'status' | 'startedAt' | 'finishedAt'>
  >,
): string {
  const order = program.schedule.filter((id) => id !== 'rest');
  const first = order[0];
  if (first === undefined) throw new Error('Program schedule contains no workouts');

  let last: (typeof completedSessions)[number] | undefined;
  let lastTime = -Infinity;
  for (const s of completedSessions) {
    if (s.status !== 'completed') continue;
    const t = Date.parse(s.finishedAt ?? s.startedAt);
    if (last === undefined || t >= lastTime) {
      last = s;
      lastTime = t;
    }
  }
  if (last === undefined) return first;

  const idx = order.indexOf(last.workoutId);
  if (idx === -1) return first;
  return order[(idx + 1) % order.length] ?? first;
}

/**
 * `nextWorkoutId` scoped to one program: only that program's sessions count, so a workout id
 * reused by another program (e.g. `upper-a`) never advances this program's rotation. A program
 * with no sessions of its own starts at its first workout.
 */
export function nextWorkoutIdForProgram(
  program: Pick<Program, 'id' | 'schedule'>,
  completedSessions: ReadonlyArray<
    Pick<Session, 'programId' | 'workoutId' | 'status' | 'startedAt' | 'finishedAt'>
  >,
): string {
  return nextWorkoutId(
    program,
    completedSessions.filter((s) => s.programId === program.id),
  );
}
