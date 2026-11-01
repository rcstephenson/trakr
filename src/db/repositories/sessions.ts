import type { Session, SessionStatus, SessionTarget } from '../../domain/types';
import { newId } from '../../lib/ids';
import { isSameDay, nowIso } from '../../lib/dates';
import { db } from '../schema';

export class ActiveSessionExistsError extends Error {
  constructor(public readonly sessionId: string) {
    super('A workout session is already active');
    this.name = 'ActiveSessionExistsError';
  }
}

export interface SessionRange {
  /** Inclusive ISO lower bound on `startedAt`. */
  from?: string;
  /** Inclusive ISO upper bound on `startedAt`. */
  to?: string;
  status?: SessionStatus;
}

export interface StartOptions {
  /** ISO instant to record as the start; defaults to now. Used to log a workout for a past day. */
  startedAt?: string;
}

/** True when the session's start falls on a local day other than today (a backfilled session). */
export function isBackdated(session: Pick<Session, 'startedAt'>, now: Date = new Date()): boolean {
  return !isSameDay(new Date(session.startedAt), now);
}

/** Starts a session, snapshotting the workout's items into `targets`. */
export async function start(
  programId: string,
  workoutId: string,
  options: StartOptions = {},
): Promise<Session> {
  return db.transaction('rw', db.sessions, db.programs, async () => {
    const active = await db.sessions.where('status').equals('active').first();
    if (active) throw new ActiveSessionExistsError(active.id);
    const program = await db.programs.get(programId);
    if (!program) throw new Error(`Program not found: ${programId}`);
    const workout = program.workouts.find((w) => w.id === workoutId);
    if (!workout) throw new Error(`Workout not found: ${workoutId}`);
    const targets: SessionTarget[] = workout.items.map((item, slotIndex) => ({
      slotIndex,
      exerciseId: item.exerciseId,
      sets: item.sets,
      repMin: item.repMin,
      repMax: item.repMax,
      kind: program.exercises.find((e) => e.id === item.exerciseId)?.kind ?? 'compound',
    }));
    const session: Session = {
      id: newId(),
      programId,
      workoutId,
      workoutName: workout.name,
      startedAt: options.startedAt ?? nowIso(),
      status: 'active',
      targets,
    };
    await db.sessions.add(session);
    return session;
  });
}

export async function get(id: string): Promise<Session | null> {
  return (await db.sessions.get(id)) ?? null;
}

export async function getActive(): Promise<Session | null> {
  return (await db.sessions.where('status').equals('active').first()) ?? null;
}

/** Sessions matching the range, newest first. */
export async function list(range: SessionRange = {}): Promise<Session[]> {
  const { from, to, status } = range;
  const rows = await db.sessions
    .where('startedAt')
    .between(from ?? '', to ?? '￿', true, true)
    .reverse()
    .toArray();
  return status ? rows.filter((s) => s.status === status) : rows;
}

export async function update(id: string, patch: Partial<Omit<Session, 'id'>>): Promise<Session> {
  return db.transaction('rw', db.sessions, async () => {
    await db.sessions.update(id, patch);
    const session = await db.sessions.get(id);
    if (!session) throw new Error(`Session not found: ${id}`);
    return session;
  });
}

/** Points a slot at a different exercise. Already logged sets keep their own exerciseId. */
export async function swapExercise(
  id: string,
  slotIndex: number,
  exerciseId: string,
): Promise<Session> {
  return db.transaction('rw', db.sessions, db.exercises, async () => {
    const session = await db.sessions.get(id);
    if (!session) throw new Error(`Session not found: ${id}`);
    const exercise = await db.exercises.get(exerciseId);
    const targets = session.targets.map((t) =>
      t.slotIndex === slotIndex ? { ...t, exerciseId, kind: exercise?.kind ?? t.kind } : t,
    );
    await db.sessions.update(id, { targets });
    return { ...session, targets };
  });
}

/**
 * Completes a session. A backdated session (started on an earlier local day) gets
 * `finishedAt = startedAt`, so ordering, rotation and History all use the chosen day.
 */
export async function finish(id: string): Promise<Session> {
  const session = await db.sessions.get(id);
  if (!session) throw new Error(`Session not found: ${id}`);
  const finishedAt = isBackdated(session) ? session.startedAt : nowIso();
  return update(id, { status: 'completed', finishedAt });
}

export function discard(id: string): Promise<Session> {
  return update(id, { status: 'discarded', finishedAt: nowIso() });
}

/** Deletes a session and all of its sets atomically. */
export async function remove(id: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.sets, async () => {
    await db.sets.where('sessionId').equals(id).delete();
    await db.sessions.delete(id);
  });
}
