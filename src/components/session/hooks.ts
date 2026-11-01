import { useLiveQuery } from 'dexie-react-hooks';
import * as exercises from '../../db/repositories/exercises';
import * as history from '../../db/repositories/history';
import * as programs from '../../db/repositories/programs';
import type { Exercise, StoredProgram, Unit } from '../../domain/types';
import { weightInUnit } from './prefill';

/** Live exercise catalog (A-Z). `undefined` while loading. */
export function useExerciseCatalog(): Exercise[] | undefined {
  return useLiveQuery(() => exercises.list(), []);
}

/** The program a session was started from. `undefined` while loading, `null` if gone. */
export function useProgramById(id: string | undefined): StoredProgram | null | undefined {
  return useLiveQuery(() => (id ? programs.get(id) : null), [id]);
}

export interface PriorSet {
  weight: number;
  reps: number;
  isWarmup: boolean;
}

/**
 * Working-set history per exercise (completed sessions only, weights in `unit`), for PR
 * detection. Does nothing unless `enabled`, so it costs nothing during normal logging.
 */
export function usePriorSets(
  exerciseIds: string[],
  unit: Unit,
  enabled: boolean,
): Record<string, PriorSet[]> | undefined {
  const key = exerciseIds.join('|');
  return useLiveQuery(async () => {
    if (!enabled) return {};
    const result: Record<string, PriorSet[]> = {};
    for (const id of key ? key.split('|') : []) {
      const perfs = await history.forExercise(id);
      result[id] = perfs.flatMap((p) =>
        p.sets
          .filter((s) => !s.isWarmup)
          .map((s) => ({ weight: weightInUnit(s, unit), reps: s.reps, isWarmup: false })),
      );
    }
    return result;
  }, [key, unit, enabled]);
}
