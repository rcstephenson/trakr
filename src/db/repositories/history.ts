import type { Session, SetEntry } from '../../domain/types';
import { db } from '../schema';

export interface Performance {
  session: Session;
  sets: SetEntry[];
}

/**
 * SPEC §5.2: the most recent completed session containing a non-warm-up set for
 * the exercise (excluding `excludeSessionId`), with its working sets sorted by setIndex.
 */
export async function lastPerformance(
  exerciseId: string,
  options: { excludeSessionId?: string } = {},
): Promise<Performance | null> {
  const history = await forExercise(exerciseId);
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    if (entry.session.id === options.excludeSessionId) continue;
    const sets = entry.sets.filter((s) => !s.isWarmup);
    if (sets.length > 0) return { session: entry.session, sets };
  }
  return null;
}

/**
 * Completed sessions that contain the exercise, oldest first, each with all its
 * sets for that exercise (warm-ups included; filter on `isWarmup`), sorted by setIndex.
 */
export async function forExercise(exerciseId: string): Promise<Performance[]> {
  const sets = await db.sets
    .where('[exerciseId+completedAt]')
    .between([exerciseId, ''], [exerciseId, '￿'], true, true)
    .toArray();
  const bySession = new Map<string, SetEntry[]>();
  for (const set of sets) {
    const group = bySession.get(set.sessionId);
    if (group) group.push(set);
    else bySession.set(set.sessionId, [set]);
  }
  const sessions = await db.sessions.bulkGet([...bySession.keys()]);
  const result: Performance[] = [];
  for (const session of sessions) {
    if (!session || session.status !== 'completed') continue;
    const group = bySession.get(session.id) ?? [];
    result.push({ session, sets: group.sort((a, b) => a.setIndex - b.setIndex) });
  }
  return result.sort((a, b) => a.session.startedAt.localeCompare(b.session.startedAt));
}
