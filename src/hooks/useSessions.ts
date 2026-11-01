import { useLiveQuery } from 'dexie-react-hooks';
import * as sessions from '../db/repositories/sessions';
import type { SessionRange } from '../db/repositories/sessions';
import type { Session } from '../domain/types';

/** Live sessions in the range, newest first. `undefined` while loading. */
export function useSessions(range?: SessionRange): Session[] | undefined {
  return useLiveQuery(() => sessions.list(range), [range?.from, range?.to, range?.status]);
}
