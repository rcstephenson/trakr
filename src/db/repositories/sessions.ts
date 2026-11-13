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

/**
 * Points a slot at a different exercise, optionally with that exercise's own sets and rep range
 * (a program alternative's prescription). Clears the slot's skipped mark. Already logged sets keep
 * their own exerciseId.
 */
export async function swapExercise(
  id: string,
  slotIndex: number,
  exerciseId: string,
  prescription: Partial<Pick<SessionTarget, 'sets' | 'repMin' | 'repMax'>> = {},
): Promise<Session> {
  return db.transaction('rw', db.sessions, db.exercises, async () => {
    const session = await db.sessions.get(id);
    if (!session) throw new Error(`Session not found: ${id}`);
    const exercise = await db.exercises.get(exerciseId);
    const targets = session.targets.map((t) =>
      t.slotIndex === slotIndex
        ? { ...t, ...prescription, exerciseId, kind: exercise?.kind ?? t.kind }
        : t,
    );
    const patch: Partial<Session> = { targets };
    if (session.skippedSlots?.includes(slotIndex)) {
      patch.skippedSlots = session.skippedSlots.filter((s) => s !== slotIndex);
    }
    await db.sessions.update(id, patch);
    return { ...session, ...patch };
  });
}

/**
 * Records a slot as skipped (a null log): deletes any sets of the slot's exercise and adds the slot
 * to `skippedSlots`, in one transaction.
 */
export async function skipSlot(id: string, slotIndex: number, exerciseId: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.sets, async () => {
    const session = await db.sessions.get(id);
    if (!session) throw new Error(`Session not found: ${id}`);
    await db.sets
      .where('sessionId')
      .equals(id)
      .filter((s) => s.slotIndex === slotIndex && s.exerciseId === exerciseId)
      .delete();
    const skipped = new Set(session.skippedSlots ?? []);
    skipped.add(slotIndex);
    await db.sessions.update(id, { skippedSlots: [...skipped].sort((a, b) => a - b) });
  });
}

/** Clears a slot's skipped mark (it is unlogged again, or about to be logged). */
export async function unskipSlot(id: string, slotIndex: number): Promise<void> {
  await db.transaction('rw', db.sessions, async () => {
    const session = await db.sessions.get(id);
    if (!session?.skippedSlots?.includes(slotIndex)) return;
    await db.sessions.update(id, {
      skippedSlots: session.skippedSlots.filter((s) => s !== slotIndex),
    });
  });
}

/**
 * Completes a session. Every slot with no logged sets is recorded as skipped. A backdated session
 * (started on an earlier local day) gets `finishedAt = startedAt`, so ordering, rotation and
 * History all use the chosen day.
 */
export async function finish(id: string): Promise<Session> {
  return db.transaction('rw', db.sessions, db.sets, async () => {
    const session = await db.sessions.get(id);
    if (!session) throw new Error(`Session not found: ${id}`);
    const sets = await db.sets.where('sessionId').equals(id).toArray();
    const loggedSlots = new Set(sets.map((s) => s.slotIndex));
    const skippedSlots = session.targets
      .map((t) => t.slotIndex)
      .filter((slot) => !loggedSlots.has(slot));
    const finishedAt = isBackdated(session) ? session.startedAt : nowIso();
    const patch = { status: 'completed' as const, finishedAt, skippedSlots };
    await db.sessions.update(id, patch);
    return { ...session, ...patch };
  });
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
