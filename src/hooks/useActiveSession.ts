import { useLiveQuery } from 'dexie-react-hooks';
import * as sessions from '../db/repositories/sessions';
import type { Session } from '../domain/types';

/** Live in-progress session. `undefined` while loading, `null` if none is active. */
export function useActiveSession(): Session | null | undefined {
  return useLiveQuery(() => sessions.getActive(), []);
}
