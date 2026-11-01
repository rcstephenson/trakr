import { useLiveQuery } from 'dexie-react-hooks';
import * as history from '../db/repositories/history';
import type { Performance } from '../db/repositories/history';

/**
 * Live completed sessions containing the exercise, oldest first, each with its
 * sets for that exercise (warm-ups included; check `isWarmup`).
 * `undefined` while loading.
 */
export function useExerciseHistory(exerciseId: string | undefined): Performance[] | undefined {
  return useLiveQuery(() => (exerciseId ? history.forExercise(exerciseId) : []), [exerciseId]);
}
