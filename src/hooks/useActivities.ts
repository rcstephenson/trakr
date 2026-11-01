import { useLiveQuery } from 'dexie-react-hooks';
import * as activities from '../db/repositories/activities';
import type { ActivityRange } from '../db/repositories/activities';
import type { Activity } from '../domain/types';

/** Live activities in the range, newest first. `undefined` while loading. */
export function useActivities(range?: ActivityRange): Activity[] | undefined {
  return useLiveQuery(() => activities.list(range), [range?.from, range?.to]);
}
