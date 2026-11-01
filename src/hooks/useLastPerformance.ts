import { useLiveQuery } from 'dexie-react-hooks';
import * as history from '../db/repositories/history';
import type { Performance } from '../db/repositories/history';

/**
 * Live last completed performance of an exercise (SPEC §5.2): working sets only.
 * `undefined` while loading, `null` if the exercise has no history.
 */
export function useLastPerformance(
  exerciseId: string | undefined,
  excludeSessionId?: string,
): Performance | null | undefined {
  return useLiveQuery(
    () => (exerciseId ? history.lastPerformance(exerciseId, { excludeSessionId }) : null),
    [exerciseId, excludeSessionId],
  );
}
