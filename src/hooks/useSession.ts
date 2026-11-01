import { useLiveQuery } from 'dexie-react-hooks';
import * as sessions from '../db/repositories/sessions';
import type { Session } from '../domain/types';

/** Live session by id. `undefined` while loading, `null` if it does not exist. */
export function useSession(id: string | undefined): Session | null | undefined {
  return useLiveQuery(() => (id ? sessions.get(id) : null), [id]);
}
