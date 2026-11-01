import { useLiveQuery } from 'dexie-react-hooks';
import * as history from '../../db/repositories/history';
import { findPRs } from '../../domain/stats';
import type { Session, SetEntry, Unit } from '../../domain/types';
import { weightInUnit } from '../session/prefill';

/**
 * Ids of this session's sets that beat the working-set bests of sessions that started before it.
 * `undefined` while loading.
 */
export function usePrSetIds(
  session: Session | null | undefined,
  sets: SetEntry[] | undefined,
  unit: Unit,
): Set<string> | undefined {
  return useLiveQuery(async () => {
    const result = new Set<string>();
    if (!session || !sets || session.status !== 'completed') return result;
    const byExercise = new Map<string, SetEntry[]>();
    for (const s of sets) {
      const list = byExercise.get(s.exerciseId);
      if (list) list.push(s);
      else byExercise.set(s.exerciseId, [s]);
    }
    for (const [exerciseId, own] of byExercise) {
      const perfs = await history.forExercise(exerciseId);
      const prior = perfs
        .filter((p) => p.session.id !== session.id && p.session.startedAt < session.startedAt)
        .flatMap((p) =>
          p.sets.map((s) => ({
            weight: weightInUnit(s, unit),
            reps: s.reps,
            isWarmup: s.isWarmup,
          })),
        );
      const ordered = [...own].sort((a, b) => a.setIndex - b.setIndex);
      const items = ordered.map((s) => ({
        id: s.id,
        weight: weightInUnit(s, unit),
        reps: s.reps,
        isWarmup: s.isWarmup,
      }));
      for (const pr of findPRs(prior, items)) result.add(pr.set.id);
    }
    return result;
  }, [session?.id, session?.startedAt, session?.status, sets, unit]);
}
