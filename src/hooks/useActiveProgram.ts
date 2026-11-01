import { useLiveQuery } from 'dexie-react-hooks';
import * as programs from '../db/repositories/programs';
import type { StoredProgram } from '../domain/types';

/** Live active program. `undefined` while loading, `null` if none is active. */
export function useActiveProgram(): StoredProgram | null | undefined {
  return useLiveQuery(() => programs.getActive(), []);
}
