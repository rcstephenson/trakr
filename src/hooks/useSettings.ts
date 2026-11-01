import { useLiveQuery } from 'dexie-react-hooks';
import * as settings from '../db/repositories/settings';
import type { Settings } from '../domain/types';

/** Live app settings merged with defaults. Returns `undefined` while loading. */
export function useSettings(): Settings | undefined {
  return useLiveQuery(() => settings.get(), []);
}
