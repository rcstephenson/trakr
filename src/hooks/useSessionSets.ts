import { useLiveQuery } from 'dexie-react-hooks';
import * as sets from '../db/repositories/sets';
import type { SetEntry } from '../domain/types';

/** Live sets of a session ordered by slot then set index. `undefined` while loading. */
export function useSessionSets(sessionId: string | undefined): SetEntry[] | undefined {
  return useLiveQuery(() => (sessionId ? sets.listBySession(sessionId) : []), [sessionId]);
}
